"""RealSense (optional) + RTAB-Map + Nav2 navigation (no AMCL) + explore node.

RTAB-Map publishes /map and map→odom. Nav2 is started via navigation_launch.py
only — do not include localization_launch / AMCL.

Requires (Humble example)::

    sudo apt-get install -y \\
      ros-humble-navigation2 \\
      ros-humble-nav2-bringup \\
      ros-humble-rtabmap-ros
    ./scripts/install_diagnostic_updater.sh humble   # if libdiagnostic_updater.so missing

Example::

    ros2 launch agenticros_bringup rtabmap_nav2.launch.py
    ros2 launch agenticros_bringup rtabmap_nav2.launch.py use_realsense:=false use_rtabmap:=false

Jetson RealSense D457 (broken HW stamps, no URDF yet)::

    ros2 launch agenticros_bringup rtabmap_nav2.launch.py \\
      use_realsense:=false \\
      rewrite_camera_stamps:=true \\
      use_static_robot_tf:=true \\
      depth_topic:=/camera/camera/depth/image_rect_raw

Jetson D436 (this launch owns the camera; stop any other realsense node first)::

    ros2 launch agenticros_bringup rtabmap_nav2.launch.py \\
      use_static_robot_tf:=true \\
      color_profile:=640x480x15 depth_profile:=640x480x15
"""

from __future__ import annotations

import os

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import (
    DeclareLaunchArgument,
    IncludeLaunchDescription,
    LogInfo,
    OpaqueFunction,
)
from launch.conditions import IfCondition
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution
from launch_ros.actions import Node
from launch_ros.substitutions import FindPackageShare


def _bool_cfg(context, name: str) -> bool:
    return LaunchConfiguration(name).perform(context).lower() in ("true", "1", "yes")


def _launch_setup(context, *args, **kwargs):
    use_sim_time = LaunchConfiguration("use_sim_time")
    rewrite = _bool_cfg(context, "rewrite_camera_stamps")

    rgb_src = LaunchConfiguration("rgb_topic").perform(context)
    depth_src = LaunchConfiguration("depth_topic").perform(context)
    info_src = LaunchConfiguration("camera_info_topic").perform(context)
    rgb_fixed = LaunchConfiguration("rgb_fixed_topic").perform(context)
    depth_fixed = LaunchConfiguration("depth_fixed_topic").perform(context)
    info_fixed = LaunchConfiguration("camera_info_fixed_topic").perform(context)

    if rewrite:
        rtab_rgb, rtab_depth, rtab_info = rgb_fixed, depth_fixed, info_fixed
    else:
        rtab_rgb, rtab_depth, rtab_info = rgb_src, depth_src, info_src

    stamp_fix = Node(
        package="agenticros_bringup",
        executable="camera_stamp_fix",
        name="camera_stamp_fix",
        output="screen",
        condition=IfCondition(LaunchConfiguration("rewrite_camera_stamps")),
        parameters=[
            {
                "use_sim_time": use_sim_time,
                "rgb_topic": rgb_src,
                "depth_topic": depth_src,
                "camera_info_topic": info_src,
                "rgb_out_topic": rgb_fixed,
                "depth_out_topic": depth_fixed,
                "camera_info_out_topic": info_fixed,
                "rate_hz": float(LaunchConfiguration("stamp_fix_rate_hz").perform(context)),
            }
        ],
    )

    # Temporary robot model until a URDF publishes these frames.
    # Tree: odom (VO) → base_link → base_footprint; base_link → camera_link.
    static_footprint = Node(
        package="tf2_ros",
        executable="static_transform_publisher",
        name="static_tf_base_link_footprint",
        output="screen",
        condition=IfCondition(LaunchConfiguration("use_static_robot_tf")),
        arguments=[
            "--x",
            "0",
            "--y",
            "0",
            "--z",
            "0",
            "--qx",
            "0",
            "--qy",
            "0",
            "--qz",
            "0",
            "--qw",
            "1",
            "--frame-id",
            LaunchConfiguration("frame_id"),
            "--child-frame-id",
            "base_footprint",
        ],
    )
    static_camera = Node(
        package="tf2_ros",
        executable="static_transform_publisher",
        name="static_tf_base_link_camera",
        output="screen",
        condition=IfCondition(LaunchConfiguration("use_static_robot_tf")),
        arguments=[
            "--x",
            LaunchConfiguration("camera_x"),
            "--y",
            LaunchConfiguration("camera_y"),
            "--z",
            LaunchConfiguration("camera_z"),
            "--yaw",
            LaunchConfiguration("camera_yaw"),
            "--pitch",
            LaunchConfiguration("camera_pitch"),
            "--roll",
            LaunchConfiguration("camera_roll"),
            "--frame-id",
            LaunchConfiguration("frame_id"),
            "--child-frame-id",
            LaunchConfiguration("camera_frame"),
        ],
    )

    # Launch the camera node directly. Including rs_launch.py (realsense-ros
    # 4.57+) warns on every parent launch argument (use_rtabmap, params_file, …)
    # because it iterates context.launch_configurations.
    realsense = Node(
        package="realsense2_camera",
        executable="realsense2_camera_node",
        namespace="camera",
        name="camera",
        output="screen",
        emulate_tty=True,
        condition=IfCondition(LaunchConfiguration("use_realsense")),
        parameters=[
            {
                "camera_name": "camera",
                "camera_namespace": "camera",
                "enable_color": True,
                "enable_depth": True,
                "enable_sync": True,
                "align_depth.enable": True,
                "pointcloud.enable": False,
                "enable_gyro": False,
                "enable_accel": False,
                "initial_reset": True,
                "rgb_camera.color_profile": LaunchConfiguration("color_profile"),
                "depth_module.depth_profile": LaunchConfiguration("depth_profile"),
            }
        ],
    )
    realsense_hint = LogInfo(
        condition=IfCondition(LaunchConfiguration("use_realsense")),
        msg=(
            "Starting realsense2_camera_node. If you see "
            "'Device or resource busy' / VIDIOC_S_FMT errno=16, another process "
            "already owns the camera (agenticros start realsense, realsense-viewer, "
            "or a leftover node). Stop it, or relaunch with use_realsense:=false."
        ),
    )

    rtabmap = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            PathJoinSubstitution(
                [FindPackageShare("rtabmap_launch"), "launch", "rtabmap.launch.py"]
            )
        ),
        condition=IfCondition(LaunchConfiguration("use_rtabmap")),
        launch_arguments={
            "use_sim_time": use_sim_time,
            "rgb_topic": rtab_rgb,
            "depth_topic": rtab_depth,
            "camera_info_topic": rtab_info,
            "frame_id": LaunchConfiguration("frame_id"),
            "approx_sync": "true",
            "visual_odometry": LaunchConfiguration("visual_odometry"),
            # Absolute topic so Nav2 sees /odom; vo_frame_id must NOT have a
            # leading slash (TF2 rejects "/odom" as a frame id).
            "odom_topic": LaunchConfiguration("odom_topic"),
            "vo_frame_id": LaunchConfiguration("vo_frame_id"),
            # Absolute so explore/Nav2 get /map (not /rtabmap/map under ns).
            "map_topic": LaunchConfiguration("rtabmap_map_topic"),
            "database_path": LaunchConfiguration("database_path"),
            # Keep RTAB-Map nodes under /rtabmap without leaking this into Nav2.
            "namespace": "rtabmap",
            "rviz": "false",
            "rtabmap_viz": "false",
        }.items(),
    )

    def _include_nav2(nav2_context, *args, **kwargs):
        # rtabmap.launch.py writes namespace:=rtabmap into the global launch
        # context. Nav2 RewrittenYaml uses that as root_key *when nodes start*,
        # so an empty launch_arguments override is not enough — clear it here.
        nav2_context.launch_configurations["namespace"] = ""
        navigation_launch = os.path.join(
            get_package_share_directory("nav2_bringup"),
            "launch",
            "navigation_launch.py",
        )
        return [
            IncludeLaunchDescription(
                PythonLaunchDescriptionSource(navigation_launch),
                launch_arguments={
                    "namespace": "",
                    "use_sim_time": use_sim_time,
                    "params_file": LaunchConfiguration("params_file"),
                    "autostart": LaunchConfiguration("autostart"),
                    "use_composition": "False",
                    "use_respawn": "False",
                }.items(),
            )
        ]

    explore = Node(
        package="agenticros_explore",
        executable="explore_node",
        name="agenticros_explore",
        output="screen",
        condition=IfCondition(LaunchConfiguration("use_explore")),
        parameters=[
            {
                "use_sim_time": use_sim_time,
                "map_topic": LaunchConfiguration("map_topic"),
                "navigate_action": LaunchConfiguration("navigate_action"),
                "map_frame": LaunchConfiguration("map_frame"),
                "base_frame": LaunchConfiguration("base_frame"),
            }
        ],
    )

    return [
        stamp_fix,
        static_footprint,
        static_camera,
        realsense_hint,
        realsense,
        rtabmap,
        OpaqueFunction(function=_include_nav2),
        explore,
    ]


def generate_launch_description() -> LaunchDescription:
    bringup_share = get_package_share_directory("agenticros_bringup")
    default_params = os.path.join(bringup_share, "config", "nav2_rtabmap.yaml")

    return LaunchDescription(
        [
            DeclareLaunchArgument(
                "use_realsense",
                default_value="true",
                description="Launch realsense2_camera (D435/D455/D457).",
            ),
            DeclareLaunchArgument(
                "use_rtabmap",
                default_value="true",
                description="Launch rtabmap_launch/rtabmap.launch.py (publishes /map + map→odom).",
            ),
            DeclareLaunchArgument(
                "use_explore",
                default_value="true",
                description="Launch agenticros_explore (explore + wander actions).",
            ),
            DeclareLaunchArgument(
                "rewrite_camera_stamps",
                default_value="false",
                description=(
                    "Republish rgb/depth/info with synced ROS-time stamps on "
                    "/camera_fixed/* (needed for some Jetson GMSL RealSense clocks)."
                ),
            ),
            DeclareLaunchArgument(
                "use_static_robot_tf",
                default_value="false",
                description=(
                    "Publish static base_link→base_footprint and base_link→camera_frame "
                    "until a URDF is available."
                ),
            ),
            DeclareLaunchArgument("use_sim_time", default_value="false"),
            DeclareLaunchArgument("autostart", default_value="true"),
            DeclareLaunchArgument("params_file", default_value=default_params),
            DeclareLaunchArgument(
                "namespace",
                default_value="",
                description="Nav2 namespace. Must stay empty so params_file is not nested under rtabmap.",
            ),
            DeclareLaunchArgument(
                "color_profile",
                default_value="640x480x15",
                description="RealSense RGB WxHxFPS. Keep this modest on Jetson.",
            ),
            DeclareLaunchArgument(
                "depth_profile",
                default_value="640x480x15",
                description="RealSense depth WxHxFPS (match RGB when align_depth is on).",
            ),
            DeclareLaunchArgument(
                "rgb_topic",
                default_value="/camera/camera/color/image_raw",
            ),
            DeclareLaunchArgument(
                "depth_topic",
                default_value="/camera/camera/aligned_depth_to_color/image_raw",
            ),
            DeclareLaunchArgument(
                "camera_info_topic",
                default_value="/camera/camera/color/camera_info",
            ),
            DeclareLaunchArgument(
                "rgb_fixed_topic",
                default_value="/camera_fixed/color/image_raw",
            ),
            DeclareLaunchArgument(
                "depth_fixed_topic",
                default_value="/camera_fixed/depth/image_raw",
            ),
            DeclareLaunchArgument(
                "camera_info_fixed_topic",
                default_value="/camera_fixed/color/camera_info",
            ),
            DeclareLaunchArgument("stamp_fix_rate_hz", default_value="10.0"),
            DeclareLaunchArgument("frame_id", default_value="base_link"),
            DeclareLaunchArgument("camera_frame", default_value="camera_link"),
            DeclareLaunchArgument("camera_x", default_value="0.1"),
            DeclareLaunchArgument("camera_y", default_value="0.0"),
            DeclareLaunchArgument("camera_z", default_value="0.15"),
            DeclareLaunchArgument("camera_yaw", default_value="0.0"),
            DeclareLaunchArgument("camera_pitch", default_value="0.0"),
            DeclareLaunchArgument("camera_roll", default_value="0.0"),
            DeclareLaunchArgument(
                "visual_odometry",
                default_value="true",
                description="RTAB-Map visual odom. Set false and provide odom_topic for wheel odom.",
            ),
            DeclareLaunchArgument("odom_topic", default_value="/odom"),
            DeclareLaunchArgument(
                "vo_frame_id",
                default_value="odom",
                description="TF frame for visual odometry (no leading slash).",
            ),
            DeclareLaunchArgument(
                "database_path",
                default_value="~/.ros/rtabmap.db",
            ),
            DeclareLaunchArgument(
                "rtabmap_map_topic",
                default_value="/map",
                description="Where rtabmap publishes the occupancy grid (absolute).",
            ),
            DeclareLaunchArgument("map_topic", default_value="/map"),
            DeclareLaunchArgument("navigate_action", default_value="navigate_to_pose"),
            DeclareLaunchArgument("map_frame", default_value="map"),
            DeclareLaunchArgument("base_frame", default_value="base_link"),
            OpaqueFunction(function=_launch_setup),
        ]
    )
