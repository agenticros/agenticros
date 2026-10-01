"""TurtleBot3 Gazebo world + RViz (use_sim_time:=true). For machines with a display."""

from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution
from launch_ros.substitutions import FindPackageShare


def generate_launch_description():
    bringup = FindPackageShare("agenticros_bringup")
    gazebo = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            PathJoinSubstitution([bringup, "launch", "gazebo_turtlebot3.launch.py"])
        ),
        launch_arguments={
            "robot_namespace": LaunchConfiguration("robot_namespace"),
            "turtlebot3_model": LaunchConfiguration("turtlebot3_model"),
        }.items(),
    )
    rviz = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            PathJoinSubstitution([bringup, "launch", "rviz.launch.py"])
        ),
        launch_arguments={"use_sim_time": "true"}.items(),
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
                description="Same as AgenticROS robot.namespace; enables cmd_vel relay",
            ),
            gazebo,
            rviz,
        ]
    )
