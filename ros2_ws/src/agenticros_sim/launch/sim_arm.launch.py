"""sim_arm.launch.py

Bring up the AgenticROS 6-DOF arm in Gazebo (Fortress / ign-gazebo 6 on
Humble Jetson, or Harmonic / gz-sim 8 on Jazzy) with full ROS-side
plumbing:
  * gz sim agenticros_indoor.sdf                  (the world)
  * ros_gz_sim create                             (spawn the arm)
  * ros_gz_bridge parameter_bridge                (gz <-> ROS topics)
  * robot_state_publisher (URDF mirror)           (for RViz RobotModel)
  * Optional RViz (--rviz launch arg)

Joint commands are exposed as std_msgs/Float64 (radians) on:
  /arm/shoulder_pan/cmd_pos
  /arm/shoulder_lift/cmd_pos
  /arm/elbow/cmd_pos
  /arm/wrist_1/cmd_pos
  /arm/wrist_2/cmd_pos
  /arm/wrist_3/cmd_pos

Examples:
  ros2 launch agenticros_sim sim_arm.launch.py
  ros2 launch agenticros_sim sim_arm.launch.py use_rviz:=true
  ros2 launch agenticros_sim sim_arm.launch.py gui:=false       # headless
"""

from __future__ import annotations

import os

from ament_index_python.packages import get_package_share_directory
from launch import LaunchContext, LaunchDescription
from launch.actions import (
    DeclareLaunchArgument,
    ExecuteProcess,
    IncludeLaunchDescription,
    OpaqueFunction,
    TimerAction,
)
from launch.conditions import IfCondition
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import Command, LaunchConfiguration, PathJoinSubstitution
from launch_ros.actions import Node
from launch_ros.parameter_descriptions import ParameterValue
from launch_ros.substitutions import FindPackageShare


PKG_NAME = "agenticros_sim"

# Default "home" pose, published once after spawn so the arm settles in a
# stable known configuration instead of whatever gravity happens to find:
#   shoulder_pan  =  0          (forward)
#   shoulder_lift = -pi/2       (upper arm up)
#   elbow         =  pi/2       (forearm horizontal, forming an L)
#   wrist_*       =  0
HOME_POSE = {
    "shoulder_pan":  0.0,
    "shoulder_lift": -1.5707963,
    "elbow":          1.5707963,
    "wrist_1":        0.0,
    "wrist_2":        0.0,
    "wrist_3":        0.0,
}


def generate_launch_description() -> LaunchDescription:
    pkg_share = get_package_share_directory(PKG_NAME)
    default_world = os.path.join(pkg_share, "worlds", "agenticros_indoor.sdf")
    default_bridge = os.path.join(pkg_share, "config", "arm_bridge.yaml")
    default_rviz = os.path.join(pkg_share, "config", "arm_view.rviz")
    model_sdf = os.path.join(pkg_share, "models", "agenticros_arm", "model.sdf")
    urdf_xacro = os.path.join(pkg_share, "urdf", "agenticros_arm.urdf.xacro")

    world_arg = DeclareLaunchArgument(
        "world", default_value=default_world,
        description="SDF world file to load (absolute path).",
    )
    use_rviz_arg = DeclareLaunchArgument(
        "use_rviz", default_value="false",
        description="Open RViz with the arm view config.",
    )
    use_sim_time_arg = DeclareLaunchArgument(
        "use_sim_time", default_value="true",
        description="Tell ROS nodes to use /clock published by gz.",
    )
    # Spawn the arm well away from the AMR spawn point (which is 0,0) so users
    # running the indoor world can see both side by side if curious.
    x_arg = DeclareLaunchArgument("x", default_value="3.0", description="Arm spawn X (m)")
    y_arg = DeclareLaunchArgument("y", default_value="0.0", description="Arm spawn Y (m)")
    z_arg = DeclareLaunchArgument("z", default_value="0.0", description="Arm spawn Z (m)")
    yaw_arg = DeclareLaunchArgument("yaw", default_value="0.0", description="Arm yaw (rad)")
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

    # ---------- Spawn the arm ----------
    spawn_arm = Node(
        package="ros_gz_sim",
        executable="create",
        name="spawn_agenticros_arm",
        output="screen",
        arguments=[
            "-name", "agenticros_arm",
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
        name="agenticros_arm_bridge",
        output="screen",
        parameters=[{
            "config_file": LaunchConfiguration("bridge_config_file"),
            "qos_overrides./tf_static.publisher.durability": "transient_local",
            "use_sim_time": LaunchConfiguration("use_sim_time"),
        }],
    )

    # ---------- robot_state_publisher (URDF mirror of the SDF) ----------
    # Without this, RViz only has TF axes and won't draw the arm. The URDF is
    # purely for visualization; physics, joint controllers, and gravity all
    # live in the SDF.
    # NOTE: `Command(... on_stderr='ignore')` keeps xacro's "redefining global
    # symbol: pi" warnings from aborting the launch.
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

    # ---------- Redundant home-pose publisher ----------
    # The SDF already sets <initial_position> on the joints and the
    # JointPositionController plugins so the arm spawns at home pose and
    # the controllers hold it there immediately. This timer is a safety
    # net: if a user `gz service`-spawned a fresh arm from a controller
    # config that didn't include initial_position, this still gets it
    # into a sane pose.
    #
    # `ros2 topic pub --once` is unreliable: the publisher exits before
    # discovery completes, so the bridge often drops the message.
    # `--times 5 --rate 5` publishes 5 copies over 1 s, which is enough
    # for the bridge subscription to come up and consume at least one.
    home_publishers = [
        ExecuteProcess(
            cmd=[
                "ros2", "topic", "pub", "--times", "5", "--rate", "5",
                f"/arm/{joint}/cmd_pos", "std_msgs/msg/Float64",
                f"{{data: {angle}}}",
            ],
            output="log",
        )
        for joint, angle in HOME_POSE.items()
    ]
    home_pose_action = TimerAction(period=8.0, actions=home_publishers)

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

    return LaunchDescription([
        world_arg,
        use_rviz_arg,
        use_sim_time_arg,
        x_arg, y_arg, z_arg, yaw_arg,
        bridge_arg,
        gui_arg,
        rviz_config_arg,
        OpaqueFunction(function=_launch_gz_sim),
        spawn_arm,
        bridge,
        rsp,
        home_pose_action,
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
