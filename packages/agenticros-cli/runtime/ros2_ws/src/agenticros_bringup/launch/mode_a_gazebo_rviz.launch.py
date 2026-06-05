"""
Gazebo + TurtleBot3 + RViz for **Mode A (local DDS)**.

Sets **ROS_DOMAIN_ID** for the whole tree, then starts simulation + RViz with
**use_sim_time:=true**. Configure AgenticROS with **transport: local** and the same domain.
"""

from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription, SetEnvironmentVariable
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution
from launch_ros.substitutions import FindPackageShare


def generate_launch_description():
    bringup = FindPackageShare("agenticros_bringup")
    return LaunchDescription(
        [
            DeclareLaunchArgument(
                "ros_domain_id",
                default_value="0",
                description="ROS_DOMAIN_ID; must match AgenticROS local domainId",
            ),
            SetEnvironmentVariable(
                name="ROS_DOMAIN_ID",
                value=LaunchConfiguration("ros_domain_id"),
            ),
            DeclareLaunchArgument(
                "robot_namespace",
                default_value="",
                description="Same as AgenticROS robot.namespace; enables cmd_vel relay",
            ),
            DeclareLaunchArgument(
                "turtlebot3_model",
                default_value="burger",
                description="TurtleBot3 model: burger | waffle | waffle_pi",
            ),
            IncludeLaunchDescription(
                PythonLaunchDescriptionSource(
                    PathJoinSubstitution([bringup, "launch", "turtlebot3_gazebo_rviz.launch.py"])
                ),
                launch_arguments={
                    "robot_namespace": LaunchConfiguration("robot_namespace"),
                    "turtlebot3_model": LaunchConfiguration("turtlebot3_model"),
                }.items(),
            ),
        ]
    )
