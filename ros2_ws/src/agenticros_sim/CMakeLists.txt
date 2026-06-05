cmake_minimum_required(VERSION 3.10)
project(agenticros_sim)

# This package is share-only: SDF worlds, model definitions, YAML configs,
# Python launch files. No compiled targets — ament_cmake exists only to give
# us a proper ROS 2 package with `ros2 launch` discovery and a share/ install.

find_package(ament_cmake REQUIRED)

install(DIRECTORY
  launch
  worlds
  models
  config
  urdf
  DESTINATION share/${PROJECT_NAME}/
)

# Tell gz_sim where to find our world + model files at runtime when the
# package is installed (colcon-built workspaces source this via the
# package.dsv environment hooks installed below).
ament_environment_hooks(${CMAKE_CURRENT_SOURCE_DIR}/env-hooks/gz_resource_path.sh.in)
ament_environment_hooks(${CMAKE_CURRENT_SOURCE_DIR}/env-hooks/gz_resource_path.dsv.in)

ament_package()
