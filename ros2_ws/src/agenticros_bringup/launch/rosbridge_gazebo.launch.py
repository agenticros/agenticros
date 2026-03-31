"""Rosbridge WebSocket + TurtleBot3 Gazebo world — same topology the AgenticROS Docker image expects (ws://…:9090)."""

from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription, SetEnvironmentVariable
from launch.launch_description_sources import AnyLaunchDescriptionSource, PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution
from launch_ros.substitutions import FindPackageShare


def generate_launch_description():
    model = LaunchConfiguration("turtlebot3_model")

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
                    FindPackageShare("turtlebot3_gazebo"),
                    "launch",
                    "turtlebot3_world.launch.py",
                ]
            )
        ),
    )

    return LaunchDescription(
        [
            DeclareLaunchArgument(
                "turtlebot3_model",
                default_value="burger",
                description="TurtleBot3 model: burger | waffle | waffle_pi",
            ),
            SetEnvironmentVariable(name="TURTLEBOT3_MODEL", value=model),
            rosbridge,
            gazebo,
        ]
    )
