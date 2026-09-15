#!/usr/bin/env python3
"""Restamp a live RealSense onto the sim AMR's camera frame.

The Gazebo AMR publishes TF on /clock (sim time). A USB RealSense stamps
images with wall time and its own optical frames. RViz + follow-me need
one clock and one frame, so this node:

  * Subscribes under ``input_ns`` (default ``/realsense/camera``)
  * Republishes on the AgenticROS RealSense names under ``output_ns``
    (default ``/camera/camera``)
  * Rewrites ``header.stamp`` to the node's clock (sim time when
    ``use_sim_time:=true``)
  * Rewrites ``header.frame_id`` to ``frame_id`` (default
    ``camera_optical_link``, the AMR URDF optical frame)
  * If the camera does not publish PointCloud2 (D585 / many D5xx), builds a
    downsampled XYZRGB cloud from depth + color so RViz has something to draw

Subscribe QoS is sensor-data (best effort) to match realsense2_camera.
Publish QoS is reliable so MCP camera snapshot / follow-me still connect.
"""

from __future__ import annotations

import rclpy
from rclpy.node import Node
from rclpy.qos import (
    DurabilityPolicy,
    HistoryPolicy,
    QoSProfile,
    ReliabilityPolicy,
    qos_profile_sensor_data,
)
from sensor_msgs.msg import CameraInfo, CompressedImage, Image, PointCloud2, PointField

try:
    import numpy as np
except ImportError:  # pragma: no cover
    np = None  # type: ignore[assignment]


def _pub_qos() -> QoSProfile:
    return QoSProfile(
        reliability=ReliabilityPolicy.RELIABLE,
        durability=DurabilityPolicy.VOLATILE,
        history=HistoryPolicy.KEEP_LAST,
        depth=5,
    )


class _Relay:
    def __init__(
        self,
        node: Node,
        msg_type: type,
        in_topic: str,
        out_topic: str,
        frame_id: str,
        *,
        gate=None,
        on_msg=None,
    ) -> None:
        self._node = node
        self._in_topic = in_topic
        self._frame_id = frame_id
        self._gate = gate
        self._on_msg = on_msg
        self._logged = False
        self._pub = node.create_publisher(msg_type, out_topic, _pub_qos())
        self._sub = node.create_subscription(
            msg_type, in_topic, self._cb, qos_profile_sensor_data
        )

    def _cb(self, msg) -> None:
        if self._gate is not None and not self._gate():
            return
        if self._on_msg is not None:
            self._on_msg()
        msg.header.stamp = self._node.get_clock().now().to_msg()
        if self._frame_id:
            msg.header.frame_id = self._frame_id
        self._pub.publish(msg)
        if not self._logged:
            self._node.get_logger().info(f"relaying {self._in_topic}")
            self._logged = True


def _decode_depth_m(msg: Image):
    if np is None:
        return None
    h, w = msg.height, msg.width
    if h == 0 or w == 0:
        return None
    enc = (msg.encoding or "").lower()
    if enc in ("16uc1", "mono16"):
        raw = np.frombuffer(msg.data, dtype=np.uint16)
        if raw.size < h * w:
            return None
        return raw.reshape(h, w).astype(np.float32) / 1000.0
    if enc in ("32fc1", "32fc"):
        raw = np.frombuffer(msg.data, dtype=np.float32)
        if raw.size < h * w:
            return None
        return raw.reshape(h, w)
    return None


def _decode_rgb(msg: Image):
    if np is None:
        return None
    h, w = msg.height, msg.width
    if h == 0 or w == 0 or msg.step < w:
        return None
    enc = (msg.encoding or "").lower()
    row = np.frombuffer(msg.data, dtype=np.uint8)
    if row.size < h * msg.step:
        return None
    row = row.reshape(h, msg.step)
    if enc == "rgb8":
        return row[:, : w * 3].reshape(h, w, 3)
    if enc == "bgr8":
        bgr = row[:, : w * 3].reshape(h, w, 3)
        return bgr[:, :, ::-1]
    return None


def _xyzrgb_cloud(xs, ys, zs, rgb_u32, header, frame_id: str) -> PointCloud2:
    n = int(xs.shape[0])
    # 32-byte PCL XYZRGB: x y z pad rgb pad pad pad
    buf = np.zeros((n, 8), dtype="<f4")
    buf[:, 0] = xs
    buf[:, 1] = ys
    buf[:, 2] = zs
    buf[:, 4] = np.ascontiguousarray(rgb_u32, dtype=np.uint32).view(np.float32)
    msg = PointCloud2()
    msg.header.stamp = header
    msg.header.frame_id = frame_id
    msg.height = 1
    msg.width = n
    msg.fields = [
        PointField(name="x", offset=0, datatype=PointField.FLOAT32, count=1),
        PointField(name="y", offset=4, datatype=PointField.FLOAT32, count=1),
        PointField(name="z", offset=8, datatype=PointField.FLOAT32, count=1),
        PointField(name="rgb", offset=16, datatype=PointField.FLOAT32, count=1),
    ]
    msg.is_bigendian = False
    msg.point_step = 32
    msg.row_step = 32 * n
    msg.is_dense = True
    msg.data = buf.tobytes()
    return msg


class RealCameraOverlay(Node):
    def __init__(self) -> None:
        super().__init__("real_camera_overlay")
        self.declare_parameter("input_ns", "/realsense/camera")
        self.declare_parameter("output_ns", "/camera/camera")
        self.declare_parameter("frame_id", "camera_optical_link")
        self.declare_parameter("cloud_stride", 4)

        inn = self.get_parameter("input_ns").get_parameter_value().string_value.rstrip("/")
        out = self.get_parameter("output_ns").get_parameter_value().string_value.rstrip("/")
        frame = self.get_parameter("frame_id").get_parameter_value().string_value
        self._frame = frame
        self._stride = max(1, int(self.get_parameter("cloud_stride").value))

        self._have_aligned_depth = False
        self._have_native_points = False
        self._saw_color = False
        self._saw_depth = False
        self._built_cloud = False
        self._last_cloud_ns = 0
        self._color: Image | None = None
        self._depth: Image | None = None
        self._depth_info: CameraInfo | None = None
        self._color_info: CameraInfo | None = None

        self._cloud_pub = self.create_publisher(PointCloud2, f"{out}/depth/points", _pub_qos())

        self._relays = [
            _Relay(
                self, Image, f"{inn}/color/image_raw", f"{out}/color/image_raw", frame,
                on_msg=lambda: setattr(self, "_saw_color", True),
            ),
            _Relay(
                self,
                CompressedImage,
                f"{inn}/color/image_raw/compressed",
                f"{out}/color/image_raw/compressed",
                frame,
            ),
            _Relay(
                self,
                CameraInfo,
                f"{inn}/color/camera_info",
                f"{out}/color/camera_info",
                frame,
            ),
            _Relay(
                self,
                Image,
                f"{inn}/aligned_depth_to_color/image_raw",
                f"{out}/depth/image_rect_raw",
                frame,
                on_msg=lambda: setattr(self, "_have_aligned_depth", True),
            ),
            _Relay(
                self,
                Image,
                f"{inn}/depth/image_rect_raw",
                f"{out}/depth/image_rect_raw",
                frame,
                gate=lambda: not self._have_aligned_depth,
                on_msg=lambda: setattr(self, "_saw_depth", True),
            ),
            _Relay(
                self,
                CameraInfo,
                f"{inn}/aligned_depth_to_color/camera_info",
                f"{out}/depth/camera_info",
                frame,
            ),
            _Relay(
                self,
                CameraInfo,
                f"{inn}/depth/camera_info",
                f"{out}/depth/camera_info",
                frame,
                gate=lambda: not self._have_aligned_depth,
            ),
            _Relay(
                self,
                PointCloud2,
                f"{inn}/depth/color/points",
                f"{out}/depth/points",
                frame,
                on_msg=lambda: setattr(self, "_have_native_points", True),
            ),
            _Relay(
                self,
                PointCloud2,
                f"{inn}/depth/points",
                f"{out}/depth/points",
                frame,
                gate=lambda: not self._have_native_points,
                on_msg=lambda: setattr(self, "_have_native_points", True),
            ),
        ]

        self.create_subscription(Image, f"{inn}/color/image_raw", self._on_color, qos_profile_sensor_data)
        self.create_subscription(
            Image, f"{inn}/aligned_depth_to_color/image_raw", self._on_aligned_depth, qos_profile_sensor_data,
        )
        self.create_subscription(Image, f"{inn}/depth/image_rect_raw", self._on_depth, qos_profile_sensor_data)
        self.create_subscription(
            CameraInfo, f"{inn}/aligned_depth_to_color/camera_info", self._on_aligned_info, qos_profile_sensor_data,
        )
        self.create_subscription(CameraInfo, f"{inn}/depth/camera_info", self._on_depth_info, qos_profile_sensor_data)
        self.create_subscription(CameraInfo, f"{inn}/color/camera_info", self._on_color_info, qos_profile_sensor_data)

        self.create_timer(8.0, self._status)
        self.get_logger().info(
            f"Waiting for RealSense on {inn}/… → {out}/… "
            f"(frame_id={frame}). Color/depth confirm the camera; "
            "a D585 often has no native PointCloud2 so this node synthesizes one."
        )

    def _on_color(self, msg: Image) -> None:
        self._color = msg
        self._saw_color = True

    def _on_color_info(self, msg: CameraInfo) -> None:
        self._color_info = msg

    def _on_aligned_depth(self, msg: Image) -> None:
        self._have_aligned_depth = True
        self._saw_depth = True
        self._depth = msg
        self._maybe_build_cloud()

    def _on_depth(self, msg: Image) -> None:
        self._saw_depth = True
        if self._have_aligned_depth:
            return
        self._depth = msg
        self._maybe_build_cloud()

    def _on_aligned_info(self, msg: CameraInfo) -> None:
        self._depth_info = msg

    def _on_depth_info(self, msg: CameraInfo) -> None:
        if self._have_aligned_depth:
            return
        self._depth_info = msg

    def _maybe_build_cloud(self) -> None:
        try:
            self._build_cloud()
        except Exception as exc:  # noqa: BLE001 — keep the overlay alive
            self.get_logger().warning(f"cloud build failed: {exc}")

    def _build_cloud(self) -> None:
        if self._have_native_points or np is None or self._depth is None:
            return
        now_ns = self.get_clock().now().nanoseconds
        if now_ns - self._last_cloud_ns < 100_000_000:
            return
        info = self._depth_info or self._color_info
        k = list(info.k) if info is not None else []
        if info is None or len(k) < 9 or float(k[0]) == 0.0:
            return
        depth = _decode_depth_m(self._depth)
        if depth is None:
            return
        h, w = depth.shape
        stride = self._stride
        fx, fy, cx, cy = float(k[0]), float(k[4]), float(k[2]), float(k[5])
        vs = np.arange(0, h, stride)
        us = np.arange(0, w, stride)
        uu, vv = np.meshgrid(us, vs)
        zz = depth[vv, uu]
        valid = (zz > 0.15) & (zz < 8.0) & np.isfinite(zz)
        if not np.any(valid):
            return
        uu, vv, zz = uu[valid], vv[valid], zz[valid]
        xx = (uu.astype(np.float32) - cx) * zz / fx
        yy = (vv.astype(np.float32) - cy) * zz / fy
        rgb_u32 = np.full(zz.shape[0], 0x00B0B0B0, dtype=np.uint32)
        if self._color is not None:
            rgb = _decode_rgb(self._color)
            if rgb is not None and rgb.shape[0] == h and rgb.shape[1] == w:
                pix = rgb[vv, uu]
                rgb_u32 = (
                    (pix[:, 0].astype(np.uint32) << 16)
                    | (pix[:, 1].astype(np.uint32) << 8)
                    | pix[:, 2].astype(np.uint32)
                )
        stamp = self.get_clock().now().to_msg()
        cloud = _xyzrgb_cloud(xx, yy, zz, rgb_u32, stamp, self._frame)
        self._cloud_pub.publish(cloud)
        self._last_cloud_ns = now_ns
        if not self._built_cloud:
            self._built_cloud = True
            self.get_logger().info(
                f"synthesized /camera/camera/depth/points from depth "
                f"({zz.shape[0]} pts, stride={stride}) — D585 has no native cloud"
            )

    def _status(self) -> None:
        color = "yes" if self._saw_color else "NO"
        depth = "yes" if self._saw_depth else "NO"
        native = "yes" if self._have_native_points else "no"
        synth = "yes" if self._built_cloud else "no"
        self.get_logger().info(
            f"RealSense status: color={color} depth={depth} "
            f"native_cloud={native} synthesized_cloud={synth}"
        )


def main() -> None:
    rclpy.init()
    node = RealCameraOverlay()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
