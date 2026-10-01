"""TurtleBot3 in Gazebo (TurtleBot3 world). Matches AgenticROS turtlebot examples: /cmd_vel, /scan.

Optional **robot_namespace**: when set to the same value as AgenticROS **robot.namespace** (no
leading slash), launches a **topic_tools relay** from `/<namespace>/cmd_vel` to `/cmd_vel` so
the diff_drive plugin (which listens on `/cmd_vel`) receives commands from the plugin.
"""

from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription, OpaqueFunction, SetEnvironmentVariable
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution
from launch_ros.actions import Node
from launch_ros.substitutions import FindPackageShare


def _launch_setup(context, *args, **kwargs):
    model = LaunchConfiguration("turtlebot3_model").perform(context)
    ns = LaunchConfiguration("robot_namespace").perform(context).strip()

    inc = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            PathJoinSubstitution(
                [
                    FindPackageShare("turtlebot3_gazebo"),
                    "launch",
                    "turtlebot3_world.launch.py",
                ]
            )
        )
    )
    actions: list = [
        SetEnvironmentVariable(name="TURTLEBOT3_MODEL", value=model),
        inc,
    ]

    if ns:
        ns_clean = ns.strip("/")
        in_topic = f"/{ns_clean}/cmd_vel"
        actions.append(
            Node(
                package="agenticros_bringup",
                executable="cmd_vel_relay",
                name="agenticros_cmd_vel_to_gazebo",
                output="screen",
                parameters=[
                    {"input_topic": in_topic, "output_topic": "/cmd_vel"},
                ],
            )
        )

    return actions


def generate_launch_description():
    return LaunchDescription(
        [
            DeclareLaunchArgument(
                "turtlebot3_model",
                default_value="burger",
                description="TurtleBot3 model: burger | waffle | waffle_pi",
            ),
            DeclareLaunchArgument(
                "robot_namespace",
                default_value="",
                description="Same as AgenticROS robot.namespace (no slashes). When non-empty, relays /<namespace>/cmd_vel -> /cmd_vel for Gazebo (built-in cmd_vel_relay node).",
            ),
            OpaqueFunction(function=_launch_setup),
        ]
    )
