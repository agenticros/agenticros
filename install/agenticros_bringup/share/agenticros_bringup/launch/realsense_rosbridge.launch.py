"""RealSense + rosbridge + cmd_vel relay — host-side stack for the NemoClaw hybrid setup.

This launch is intended to run **on the host** (or robot) alongside a NemoClaw
sandbox that hosts the AgenticROS OpenClaw plugin. The plugin connects to
rosbridge on this host via ``ws://host.docker.internal:9090`` (i.e.
``ws://172.19.0.1:9090`` from inside the sandbox).

Topics published by realsense2_camera (default ``camera_name=camera``)::

    /camera/camera/color/image_raw                       sensor_msgs/Image
    /camera/camera/color/image_raw/compressed            sensor_msgs/CompressedImage (via image_transport_plugins)
    /camera/camera/depth/image_rect_raw                  sensor_msgs/Image
    /camera/camera/aligned_depth_to_color/image_raw      sensor_msgs/Image

cmd_vel relay: the AgenticROS plugin publishes Twist on
``/<robot_namespace>/cmd_vel``. This launch relays that to ``/cmd_vel`` so a
robot base controller listening on the unnamespaced topic still gets driven.
Disable the relay by setting ``relay_cmd_vel:=false``.

Example::

    ros2 launch agenticros_bringup realsense_rosbridge.launch.py \\
        robot_namespace:=3946b404-c33e-4aa3-9a8d-16deb1c5c593 \\
        enable_depth:=true \\
        align_depth:=true
"""

from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, GroupAction, IncludeLaunchDescription, LogInfo
from launch.conditions import IfCondition
from launch.launch_description_sources import AnyLaunchDescriptionSource, PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration, PathJoinSubstitution, PythonExpression
from launch_ros.actions import Node
from launch_ros.substitutions import FindPackageShare


def generate_launch_description() -> LaunchDescription:
    realsense = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            PathJoinSubstitution(
                [FindPackageShare("realsense2_camera"), "launch", "rs_launch.py"]
            )
        ),
        launch_arguments={
            "camera_name": "camera",
            "camera_namespace": "camera",
            "enable_color": LaunchConfiguration("enable_color"),
            "enable_depth": LaunchConfiguration("enable_depth"),
            "align_depth.enable": LaunchConfiguration("align_depth"),
            "rgb_camera.color_profile": LaunchConfiguration("color_profile"),
            "depth_module.depth_profile": LaunchConfiguration("depth_profile"),
            "pointcloud.enable": "false",
        }.items(),
    )

    rosbridge = IncludeLaunchDescription(
        AnyLaunchDescriptionSource(
            PathJoinSubstitution(
                [FindPackageShare("rosbridge_server"), "launch", "rosbridge_websocket_launch.xml"]
            )
        ),
        launch_arguments={
            "port": LaunchConfiguration("rosbridge_port"),
            "address": LaunchConfiguration("rosbridge_address"),
        }.items(),
    )

    cmd_vel_relay = GroupAction(
        actions=[
            Node(
                package="agenticros_bringup",
                executable="cmd_vel_relay",
                name="agenticros_cmd_vel_bridge",
                output="screen",
                parameters=[
                    {
                        "input_topic": PythonExpression(
                            [
                                "'/' + '",
                                LaunchConfiguration("robot_namespace"),
                                "'.strip('/') + '/cmd_vel'",
                            ]
                        ),
                        "output_topic": LaunchConfiguration("dst_cmd_vel"),
                    }
                ],
            ),
        ],
        condition=IfCondition(LaunchConfiguration("relay_cmd_vel")),
    )

    return LaunchDescription(
        [
            DeclareLaunchArgument(
                "robot_namespace",
                default_value="3946b404-c33e-4aa3-9a8d-16deb1c5c593",
                description="ROS2 namespace AgenticROS publishes cmd_vel under, e.g. 3946b404-...",
            ),
            DeclareLaunchArgument(
                "dst_cmd_vel",
                default_value="/cmd_vel",
                description="Topic the robot base listens on; the relay republishes namespaced cmd_vel here.",
            ),
            DeclareLaunchArgument(
                "relay_cmd_vel",
                default_value="true",
                description="Relay /<robot_namespace>/cmd_vel -> dst_cmd_vel.",
            ),
            DeclareLaunchArgument(
                "rosbridge_port",
                default_value="9090",
                description="rosbridge_websocket port (sandbox connects via host.docker.internal:9090).",
            ),
            DeclareLaunchArgument(
                "rosbridge_address",
                default_value="0.0.0.0",
                description="rosbridge_websocket bind address; 0.0.0.0 lets the docker bridge reach it.",
            ),
            DeclareLaunchArgument(
                "enable_color",
                default_value="true",
                description="Enable RealSense RGB color stream.",
            ),
            DeclareLaunchArgument(
                "enable_depth",
                default_value="true",
                description="Enable RealSense depth stream.",
            ),
            DeclareLaunchArgument(
                "align_depth",
                default_value="true",
                description="Publish depth aligned to color (better for ros2_depth_distance center sampling).",
            ),
            DeclareLaunchArgument(
                "color_profile",
                default_value="640x480x15",
                description="RealSense color profile WxHxFPS; lower fps reduces rosbridge bandwidth.",
            ),
            DeclareLaunchArgument(
                "depth_profile",
                default_value="640x480x15",
                description="RealSense depth profile WxHxFPS.",
            ),
            LogInfo(
                msg=(
                    "agenticros_bringup: launching RealSense + rosbridge (0.0.0.0:9090) + cmd_vel relay."
                    " The NemoClaw sandbox should connect to ws://host.docker.internal:9090."
                )
            ),
            realsense,
            rosbridge,
            cmd_vel_relay,
        ]
    )
