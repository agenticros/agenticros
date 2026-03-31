"""Rosbridge WebSocket + TurtleBot3 Gazebo world — same topology the AgenticROS Docker image expects (ws://…:9090)."""

from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription
from launch.launch_description_sources import AnyLaunchDescriptionSource, PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution
from launch_ros.substitutions import FindPackageShare


def generate_launch_description():
    rosbridge = IncludeLaunchDescription(
        AnyLaunchDescriptionSource(
            PathJoinSubstitution(
                [
                    FindPackageShare("rosbridge_server"),
                    "launch",
                    "rosbridge_websocket_launch.xml",
                ]
            )
        ),
    )

    gazebo = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            PathJoinSubstitution(
                [
                    FindPackageShare("agenticros_bringup"),
                    "launch",
                    "gazebo_turtlebot3.launch.py",
                ]
            )
        ),
        launch_arguments={
            "turtlebot3_model": LaunchConfiguration("turtlebot3_model"),
            "robot_namespace": LaunchConfiguration("robot_namespace"),
        }.items(),
    )

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
                description="Same as AgenticROS robot.namespace; enables cmd_vel relay to /cmd_vel",
            ),
            rosbridge,
            gazebo,
        ]
    )
