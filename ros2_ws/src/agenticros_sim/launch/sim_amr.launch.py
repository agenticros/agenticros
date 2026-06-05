"""sim_amr.launch.py

Bring up the AgenticROS 2-wheel AMR in Gazebo Harmonic with full ROS-side
plumbing:
  * gz sim agenticros_indoor.sdf                  (the world + everything in it)
  * ros_gz_sim create                             (spawn the AMR if it isn't
                                                  already baked into the world)
  * ros_gz_bridge parameter_bridge config_file    (gz <-> ROS topic bridge)
  * Optional RViz (--rviz launch arg)

Launch args:
  world       (default 'agenticros_indoor.sdf')    Override the world file.
  use_rviz    (default 'false')                    Show RViz with the AMR config.
  use_sim_time (default 'true')                    /clock is bridged; downstream
                                                  nodes should honour this.
  x, y, z, yaw                                    Spawn pose for the AMR.
  bridge_config_file                              Override the bridge YAML.
  gui         (default 'true')                    Headless if 'false' (CI / docker).

Examples:
  ros2 launch agenticros_sim sim_amr.launch.py
  ros2 launch agenticros_sim sim_amr.launch.py use_rviz:=true
  ros2 launch agenticros_sim sim_amr.launch.py gui:=false       # headless
"""

from __future__ import annotations

import os

from ament_index_python.packages import get_package_share_directory
from launch import LaunchContext, LaunchDescription
from launch.actions import (
    DeclareLaunchArgument,
    IncludeLaunchDescription,
    OpaqueFunction,
)
from launch.conditions import IfCondition
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution
from launch_ros.actions import Node
from launch_ros.substitutions import FindPackageShare
from launch_ros.parameter_descriptions import ParameterValue
from launch.substitutions import Command


PKG_NAME = "agenticros_sim"


def generate_launch_description() -> LaunchDescription:
    pkg_share = get_package_share_directory(PKG_NAME)
    default_world = os.path.join(pkg_share, "worlds", "agenticros_indoor.sdf")
    default_bridge = os.path.join(pkg_share, "config", "amr_bridge.yaml")
    default_rviz = os.path.join(pkg_share, "config", "amr_view.rviz")
    model_sdf = os.path.join(pkg_share, "models", "agenticros_amr", "model.sdf")
    urdf_xacro = os.path.join(pkg_share, "urdf", "agenticros_amr.urdf.xacro")

    # --- Launch arguments ---
    world_arg = DeclareLaunchArgument(
        "world", default_value=default_world,
        description="SDF world file to load (absolute path).",
    )
    use_rviz_arg = DeclareLaunchArgument(
        "use_rviz", default_value="false",
        description="Open RViz with the AMR view config.",
    )
    use_sim_time_arg = DeclareLaunchArgument(
        "use_sim_time", default_value="true",
        description="Tell ROS nodes to use /clock published by gz.",
    )
    x_arg = DeclareLaunchArgument("x", default_value="0.0", description="AMR spawn X (m)")
    y_arg = DeclareLaunchArgument("y", default_value="0.0", description="AMR spawn Y (m)")
    z_arg = DeclareLaunchArgument("z", default_value="0.1", description="AMR spawn Z (m)")
    yaw_arg = DeclareLaunchArgument("yaw", default_value="0.0", description="AMR yaw (rad)")
    bridge_arg = DeclareLaunchArgument(
        "bridge_config_file", default_value=default_bridge,
        description="ros_gz_bridge parameter_bridge config YAML.",
    )
    gui_arg = DeclareLaunchArgument(
        "gui", default_value="true",
        description="If 'false', run gz-sim headless (-s -r).",
    )
    rviz_config_arg = DeclareLaunchArgument(
        "rviz_config", default_value=default_rviz,
        description="RViz config path (used when use_rviz is true).",
    )

    # ---------- Spawn the AMR ----------
    spawn_amr = Node(
        package="ros_gz_sim",
        executable="create",
        name="spawn_agenticros_amr",
        output="screen",
        arguments=[
            "-name", "agenticros_amr",
            "-file", model_sdf,
            "-x", LaunchConfiguration("x"),
            "-y", LaunchConfiguration("y"),
            "-z", LaunchConfiguration("z"),
            "-Y", LaunchConfiguration("yaw"),
        ],
    )

    # ---------- gz <-> ROS bridge ----------
    bridge = Node(
        package="ros_gz_bridge",
        executable="parameter_bridge",
        name="agenticros_amr_bridge",
        output="screen",
        parameters=[{
            "config_file": LaunchConfiguration("bridge_config_file"),
            "qos_overrides./tf_static.publisher.durability": "transient_local",
            "use_sim_time": LaunchConfiguration("use_sim_time"),
        }],
    )

    # ---------- robot_state_publisher (URDF mirror of the SDF) ----------
    # Without this, RViz only has TF axes - it doesn't know the robot's geometry
    # and can't render a 3D model in the RobotModel display. The URDF is purely
    # for visualization; physics + sensors stay in the SDF.
    # NOTE: `Command(... on_stderr='ignore')` is critical - xacro often prints
    # benign warnings ("redefining global symbol: pi", etc.) to stderr, and the
    # default behaviour of Command is to FAIL the launch on any stderr output.
    robot_description = ParameterValue(
        Command(["xacro ", urdf_xacro], on_stderr="ignore"), value_type=str,
    )
    rsp = Node(
        package="robot_state_publisher",
        executable="robot_state_publisher",
        name="robot_state_publisher",
        output="screen",
        parameters=[{
            "robot_description": robot_description,
            "use_sim_time": LaunchConfiguration("use_sim_time"),
        }],
    )

    # ---------- Optional RViz ----------
    rviz = Node(
        package="rviz2",
        executable="rviz2",
        name="rviz2",
        output="screen",
        condition=IfCondition(LaunchConfiguration("use_rviz")),
        arguments=["-d", LaunchConfiguration("rviz_config")],
        parameters=[{"use_sim_time": LaunchConfiguration("use_sim_time")}],
    )

    # The gz sim launcher needs a single space-separated `gz_args` string. We
    # build it inside an OpaqueFunction so the conditional headless flag is
    # evaluated at launch-time (substitutions can't do string concatenation).
    return LaunchDescription([
        world_arg,
        use_rviz_arg,
        use_sim_time_arg,
        x_arg, y_arg, z_arg, yaw_arg,
        bridge_arg,
        gui_arg,
        rviz_config_arg,
        OpaqueFunction(function=_launch_gz_sim),
        spawn_amr,
        bridge,
        rsp,
        rviz,
    ])


def _launch_gz_sim(context: LaunchContext, *_, **__):
    """Resolve launch args and emit the gz_sim IncludeLaunchDescription action."""
    gui = context.launch_configurations.get("gui", "true").lower() == "true"
    world = context.launch_configurations.get(
        "world",
        os.path.join(get_package_share_directory(PKG_NAME), "worlds", "agenticros_indoor.sdf"),
    )
    gz_args = f"-r {world}" if gui else f"-r -s --headless-rendering {world}"

    gz_launch = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            PathJoinSubstitution(
                [FindPackageShare("ros_gz_sim"), "launch", "gz_sim.launch.py"]
            )
        ),
        launch_arguments=[("gz_args", gz_args)],
    )
    return [gz_launch]
