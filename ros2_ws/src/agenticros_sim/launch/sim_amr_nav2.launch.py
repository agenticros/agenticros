"""sim_amr_nav2.launch.py

Bring up Gazebo AMR sim + Nav2 (static map + AMCL + navigation stack).

Includes:
  * agenticros_sim/sim_amr.launch.py  (gz + bridge + robot_state_publisher)
  * nav2_bringup/bringup_launch.py    (map_server + amcl + controller/planner/bt)

Launch args (forwarded to sim_amr where applicable):
  gui, use_rviz, use_sim_time, x, y, z, yaw
  map          — occupancy grid YAML (default: maps/agenticros_indoor.yaml)
  params_file  — Nav2 params (default: config/nav2_params.yaml)
  autostart    — lifecycle autostart (default true)

Examples:
  ros2 launch agenticros_sim sim_amr_nav2.launch.py gui:=false
  ros2 launch agenticros_sim sim_amr_nav2.launch.py use_rviz:=true
"""

from __future__ import annotations

import os

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration


PKG_NAME = "agenticros_sim"


def generate_launch_description() -> LaunchDescription:
    pkg_share = get_package_share_directory(PKG_NAME)
    default_map = os.path.join(pkg_share, "maps", "agenticros_indoor.yaml")
    default_params = os.path.join(pkg_share, "config", "nav2_params.yaml")
    sim_amr_launch = os.path.join(pkg_share, "launch", "sim_amr.launch.py")
    nav2_bringup = get_package_share_directory("nav2_bringup")
    bringup_launch = os.path.join(nav2_bringup, "launch", "bringup_launch.py")

    gui_arg = DeclareLaunchArgument("gui", default_value="true")
    use_rviz_arg = DeclareLaunchArgument("use_rviz", default_value="false")
    use_sim_time_arg = DeclareLaunchArgument("use_sim_time", default_value="true")
    x_arg = DeclareLaunchArgument("x", default_value="0.0")
    y_arg = DeclareLaunchArgument("y", default_value="0.0")
    z_arg = DeclareLaunchArgument("z", default_value="0.1")
    yaw_arg = DeclareLaunchArgument("yaw", default_value="0.0")
    map_arg = DeclareLaunchArgument("map", default_value=default_map)
    params_arg = DeclareLaunchArgument("params_file", default_value=default_params)
    autostart_arg = DeclareLaunchArgument("autostart", default_value="true")

    sim = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(sim_amr_launch),
        launch_arguments={
            "gui": LaunchConfiguration("gui"),
            "use_rviz": LaunchConfiguration("use_rviz"),
            "use_sim_time": LaunchConfiguration("use_sim_time"),
            "x": LaunchConfiguration("x"),
            "y": LaunchConfiguration("y"),
            "z": LaunchConfiguration("z"),
            "yaw": LaunchConfiguration("yaw"),
        }.items(),
    )

    # slam:=False → localization_launch (map_server + amcl) + navigation_launch
    nav2 = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(bringup_launch),
        launch_arguments={
            "slam": "False",
            "map": LaunchConfiguration("map"),
            "use_sim_time": LaunchConfiguration("use_sim_time"),
            "params_file": LaunchConfiguration("params_file"),
            "autostart": LaunchConfiguration("autostart"),
            "use_composition": "False",
            "use_respawn": "False",
        }.items(),
    )

    # Remap Nav2's default cmd_vel if velocity_smoother is in the graph —
    # our bridge listens on /cmd_vel. bringup already uses /cmd_vel by default
    # for the controller; keep a no-op note via a tiny static transform wait
    # is unnecessary. Publish map→odom is AMCL's job once initial pose is set
    # (set_initial_pose: true in nav2_params.yaml).

    return LaunchDescription(
        [
            gui_arg,
            use_rviz_arg,
            use_sim_time_arg,
            x_arg,
            y_arg,
            z_arg,
            yaw_arg,
            map_arg,
            params_arg,
            autostart_arg,
            sim,
            nav2,
        ]
    )
