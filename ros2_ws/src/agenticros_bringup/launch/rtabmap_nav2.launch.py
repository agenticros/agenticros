"""RealSense (optional) + RTAB-Map + Nav2 navigation (no AMCL) + explore node.

RTAB-Map publishes /map and map→odom. Nav2 is started via navigation_launch.py
only — do not include localization_launch / AMCL.

Requires (Jazzy)::

    sudo apt-get install -y \\
      ros-jazzy-navigation2 \\
      ros-jazzy-nav2-bringup \\
      ros-jazzy-rtabmap-ros

Example::

    ros2 launch agenticros_bringup rtabmap_nav2.launch.py
    ros2 launch agenticros_bringup rtabmap_nav2.launch.py use_realsense:=false use_rtabmap:=false
"""

from __future__ import annotations

import os

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription
from launch.conditions import IfCondition
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution
from launch_ros.actions import Node
from launch_ros.substitutions import FindPackageShare


def generate_launch_description() -> LaunchDescription:
    bringup_share = get_package_share_directory("agenticros_bringup")
    default_params = os.path.join(bringup_share, "config", "nav2_rtabmap.yaml")

    nav2_bringup = get_package_share_directory("nav2_bringup")
    navigation_launch = os.path.join(nav2_bringup, "launch", "navigation_launch.py")

    use_sim_time = LaunchConfiguration("use_sim_time")

    realsense = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            PathJoinSubstitution(
                [FindPackageShare("realsense2_camera"), "launch", "rs_launch.py"]
            )
        ),
        condition=IfCondition(LaunchConfiguration("use_realsense")),
        launch_arguments={
            "camera_name": "camera",
            "camera_namespace": "camera",
            "enable_color": "true",
            "enable_depth": "true",
            "align_depth.enable": "true",
            "pointcloud.enable": "false",
        }.items(),
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
            "rgb_topic": LaunchConfiguration("rgb_topic"),
            "depth_topic": LaunchConfiguration("depth_topic"),
            "camera_info_topic": LaunchConfiguration("camera_info_topic"),
            "frame_id": LaunchConfiguration("frame_id"),
            "approx_sync": "true",
            "visual_odometry": LaunchConfiguration("visual_odometry"),
            "odom_topic": LaunchConfiguration("odom_topic"),
            "database_path": LaunchConfiguration("database_path"),
            "rviz": "false",
            "rtabmap_viz": "false",
        }.items(),
    )

    nav2 = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(navigation_launch),
        launch_arguments={
            "use_sim_time": use_sim_time,
            "params_file": LaunchConfiguration("params_file"),
            "autostart": LaunchConfiguration("autostart"),
            "use_composition": "False",
            "use_respawn": "False",
        }.items(),
    )

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

    return LaunchDescription(
        [
            DeclareLaunchArgument(
                "use_realsense",
                default_value="true",
                description="Launch realsense2_camera (D435/D455).",
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
            DeclareLaunchArgument("use_sim_time", default_value="false"),
            DeclareLaunchArgument("autostart", default_value="true"),
            DeclareLaunchArgument("params_file", default_value=default_params),
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
            DeclareLaunchArgument("frame_id", default_value="base_link"),
            DeclareLaunchArgument(
                "visual_odometry",
                default_value="true",
                description="RTAB-Map visual odom. Set false and provide odom_topic for wheel odom.",
            ),
            DeclareLaunchArgument("odom_topic", default_value="/odom"),
            DeclareLaunchArgument(
                "database_path",
                default_value="~/.ros/rtabmap.db",
            ),
            DeclareLaunchArgument("map_topic", default_value="map"),
            DeclareLaunchArgument("navigate_action", default_value="navigate_to_pose"),
            DeclareLaunchArgument("map_frame", default_value="map"),
            DeclareLaunchArgument("base_frame", default_value="base_footprint"),
            realsense,
            rtabmap,
            nav2,
            explore,
        ]
    )
