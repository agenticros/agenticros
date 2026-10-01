# generated from rosidl_cmake/cmake/rosidl_cmake_aggregate_target-extras.cmake.in

# Create a convenience aggregate target agenticros_msgs::agenticros_msgs
# that links all generated interface targets, so downstream packages can use
# a single modern CMake target name instead of ${agenticros_msgs_TARGETS}.
if(agenticros_msgs_TARGETS AND NOT TARGET agenticros_msgs::agenticros_msgs)
  add_library(agenticros_msgs::agenticros_msgs INTERFACE IMPORTED)
  set_target_properties(agenticros_msgs::agenticros_msgs PROPERTIES
    INTERFACE_LINK_LIBRARIES "${agenticros_msgs_TARGETS}")
endif()
