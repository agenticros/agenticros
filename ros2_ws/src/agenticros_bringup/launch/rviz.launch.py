"""RViz2 with a TurtleBot3-friendly layout: grid, TF, robot model, laser scan (/scan)."""

from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution
from launch_ros.actions import Node
from launch_ros.parameter_descriptions import ParameterValue
from launch_ros.substitutions import FindPackageShare


def generate_launch_description():
    pkg = FindPackageShare("agenticros_bringup")
    default_cfg = PathJoinSubstitution([pkg, "rviz", "turtlebot3_agenticros.rviz"])

    return LaunchDescription(
        [
            DeclareLaunchArgument(
                "rviz_config",
                default_value=default_cfg,
                description="Path to an RViz2 config file",
            ),
            DeclareLaunchArgument(
                "use_sim_time",
                default_value="false",
                description="Set true when Gazebo (or other sim) is publishing /clock",
            ),
            Node(
                package="rviz2",
                executable="rviz2",
                name="rviz2",
                arguments=["-d", LaunchConfiguration("rviz_config")],
                parameters=[
                    {"use_sim_time": ParameterValue(LaunchConfiguration("use_sim_time"), value_type=bool)}
                ],
                output="screen",
            ),
        ]
    )
