# synapse_arm_moveit_config

This project was previously known as AgenticROS.


MoveIt2 config for the Corebrum Synapse **sim arm** (group `arm`, planning frame
`base_link`, tip `tool0`). Named SRDF targets: `home`, `ready`.

Brought up by:

```bash
synapse up sim-arm --moveit
# or
ros2 launch synapse_sim sim_arm_moveit.launch.py gui:=false
```

The Gazebo arm still takes per-joint `std_msgs/Float64` on `/arm/*/cmd_pos`.
`synapse_sim/scripts/arm_trajectory_bridge.py` advertises
`/arm_controller/follow_joint_trajectory` so `move_group` can execute.

Requires `ros-$ROS_DISTRO-moveit`. Intended target: Jazzy + Gazebo Harmonic.
No gripper / pick-place / `ros2_control` in this package.
