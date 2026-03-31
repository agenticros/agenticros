"""TurtleBot3 in Gazebo (TurtleBot3 world). Matches AgenticROS turtlebot examples: /cmd_vel, /scan."""

from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription, SetEnvironmentVariable
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution
from launch_ros.substitutions import FindPackageShare


def generate_launch_description():
    model = LaunchConfiguration("turtlebot3_model")

    return LaunchDescription(
        [
            DeclareLaunchArgument(
                "turtlebot3_model",
                default_value="burger",
                description="TurtleBot3 model: burger | waffle | waffle_pi",
            ),
            SetEnvironmentVariable(name="TURTLEBOT3_MODEL", value=model),
            IncludeLaunchDescription(
                PythonLaunchDescriptionSource(
                    PathJoinSubstitution(
                        [
                            FindPackageShare("turtlebot3_gazebo"),
                            "launch",
                            "turtlebot3_world.launch.py",
                        ]
                    )
                ),
            ),
        ]
    )
