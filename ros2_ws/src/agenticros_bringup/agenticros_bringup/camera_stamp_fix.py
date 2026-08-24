#!/usr/bin/env python3
"""Republish color/depth/camera_info with synchronized ROS-time stamps.

Some RealSense GMSL / Jetson setups publish broken or desynced hardware
timestamps that break RTAB-Map visual odometry. This node takes the latest
rgb, depth, and camera_info (independently) and republishes them at a fixed
rate with identical ``header.stamp = now``.
"""

from __future__ import annotations

import threading

import rclpy
from rclpy.node import Node
from rclpy.qos import qos_profile_sensor_data
from sensor_msgs.msg import CameraInfo, Image


class CameraStampFix(Node):
    def __init__(self) -> None:
        super().__init__("camera_stamp_fix")
        self.declare_parameter("rgb_topic", "/camera/camera/color/image_raw")
        self.declare_parameter("depth_topic", "/camera/camera/depth/image_rect_raw")
        self.declare_parameter("camera_info_topic", "/camera/camera/color/camera_info")
        self.declare_parameter("rgb_out_topic", "/camera_fixed/color/image_raw")
        self.declare_parameter("depth_out_topic", "/camera_fixed/depth/image_raw")
        self.declare_parameter("camera_info_out_topic", "/camera_fixed/color/camera_info")
        self.declare_parameter("rate_hz", 10.0)

        rgb_in = self.get_parameter("rgb_topic").value
        depth_in = self.get_parameter("depth_topic").value
        info_in = self.get_parameter("camera_info_topic").value
        rgb_out = self.get_parameter("rgb_out_topic").value
        depth_out = self.get_parameter("depth_out_topic").value
        info_out = self.get_parameter("camera_info_out_topic").value
        rate_hz = float(self.get_parameter("rate_hz").value)
        period = 1.0 / rate_hz if rate_hz > 0.0 else 0.1

        self._lock = threading.Lock()
        self._rgb: Image | None = None
        self._depth: Image | None = None
        self._info: CameraInfo | None = None
        self._n = 0

        qos = qos_profile_sensor_data
        self.create_subscription(Image, rgb_in, self._on_rgb, qos)
        self.create_subscription(Image, depth_in, self._on_depth, qos)
        self.create_subscription(CameraInfo, info_in, self._on_info, qos)
        self._rgb_pub = self.create_publisher(Image, rgb_out, 10)
        self._depth_pub = self.create_publisher(Image, depth_out, 10)
        self._info_pub = self.create_publisher(CameraInfo, info_out, 10)
        self.create_timer(period, self._tick)
        self.get_logger().info(
            "Rewriting stamps: %s + %s + %s -> %s / %s / %s (%.1f Hz)"
            % (rgb_in, depth_in, info_in, rgb_out, depth_out, info_out, 1.0 / period)
        )

    def _on_rgb(self, msg: Image) -> None:
        with self._lock:
            self._rgb = msg

    def _on_depth(self, msg: Image) -> None:
        with self._lock:
            self._depth = msg

    def _on_info(self, msg: CameraInfo) -> None:
        with self._lock:
            self._info = msg

    def _tick(self) -> None:
        with self._lock:
            rgb, depth, info = self._rgb, self._depth, self._info
        if rgb is None or depth is None or info is None:
            return
        # RTAB-Map requires depth size == RGB or an integer scale factor.
        # Independent "latest" frames can briefly mismatch after a stream
        # reconfigure — skip until both agree.
        if depth.height == 0 or depth.width == 0:
            return
        if rgb.height % depth.height != 0 or rgb.width % depth.width != 0:
            if depth.height % rgb.height != 0 or depth.width % rgb.width != 0:
                if self._n % 50 == 0:
                    self.get_logger().warn(
                        "Skipping mismatched frames rgb=%dx%d depth=%dx%d"
                        % (rgb.width, rgb.height, depth.width, depth.height)
                    )
                return
        now = self.get_clock().now().to_msg()
        rgb.header.stamp = now
        depth.header.stamp = now
        info.header.stamp = now
        self._rgb_pub.publish(rgb)
        self._depth_pub.publish(depth)
        self._info_pub.publish(info)
        self._n += 1
        if self._n == 1 or self._n % 50 == 0:
            self.get_logger().info("published %d stamp-fixed frames" % self._n)


def main() -> None:
    rclpy.init()
    node = CameraStampFix()
    try:
        rclpy.spin(node)
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == "__main__":
    main()
