#!/usr/bin/env python3
"""Subscribe Twist on input_topic and republish on output_topic (no topic_tools dep)."""

import rclpy
from geometry_msgs.msg import Twist
from rclpy.node import Node


class CmdVelRelay(Node):
    def __init__(self) -> None:
        super().__init__("agenticros_cmd_vel_relay")
        self.declare_parameter("input_topic", "/cmd_vel_in")
        self.declare_parameter("output_topic", "/cmd_vel")
        in_topic = self.get_parameter("input_topic").get_parameter_value().string_value
        out_topic = self.get_parameter("output_topic").get_parameter_value().string_value
        self._pub = self.create_publisher(Twist, out_topic, 10)
        self.create_subscription(Twist, in_topic, self._on_twist, 10)
        self.get_logger().info("Relay %s -> %s" % (in_topic, out_topic))

    def _on_twist(self, msg: Twist) -> None:
        self._pub.publish(msg)


def main() -> None:
    rclpy.init()
    try:
        rclpy.spin(CmdVelRelay())
    finally:
        rclpy.shutdown()


if __name__ == "__main__":
    main()
