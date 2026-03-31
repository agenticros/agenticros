"""TurtleBot3 Gazebo world + RViz (use_sim_time:=true). For machines with a display."""

from launch import LaunchDescription
from launch.actions import IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import PathJoinSubstitution
from launch_ros.substitutions import FindPackageShare


def generate_launch_description():
    bringup = FindPackageShare("agenticros_bringup")
    gazebo = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            PathJoinSubstitution([bringup, "launch", "gazebo_turtlebot3.launch.py"])
        )
    )
    rviz = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            PathJoinSubstitution([bringup, "launch", "rviz.launch.py"])
        ),
        launch_arguments={"use_sim_time": "true"}.items(),
    )
    return LaunchDescription([gazebo, rviz])
