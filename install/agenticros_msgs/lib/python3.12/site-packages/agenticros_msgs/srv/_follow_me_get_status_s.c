// generated from rosidl_generator_py/resource/_idl_support.c.em
// with input from agenticros_msgs:srv/FollowMeGetStatus.idl
// generated code does not contain a copyright notice
#define NPY_NO_DEPRECATED_API NPY_1_7_API_VERSION
#include <Python.h>
#include <stdbool.h>
#ifndef _WIN32
# pragma GCC diagnostic push
# pragma GCC diagnostic ignored "-Wunused-function"
#endif
#include "numpy/ndarrayobject.h"
#ifndef _WIN32
# pragma GCC diagnostic pop
#endif
#include "rosidl_runtime_c/visibility_control.h"
#include "agenticros_msgs/srv/detail/follow_me_get_status__struct.h"
#include "agenticros_msgs/srv/detail/follow_me_get_status__functions.h"


ROSIDL_GENERATOR_C_EXPORT
bool agenticros_msgs__srv__follow_me_get_status__request__convert_from_py(PyObject * _pymsg, void * _ros_message)
{
  // check that the passed message is of the expected Python class
  {
    char full_classname_dest[68];
    {
      char * class_name = NULL;
      char * module_name = NULL;
      {
        PyObject * class_attr = PyObject_GetAttrString(_pymsg, "__class__");
        if (class_attr) {
          PyObject * name_attr = PyObject_GetAttrString(class_attr, "__name__");
          if (name_attr) {
            class_name = (char *)PyUnicode_1BYTE_DATA(name_attr);
            Py_DECREF(name_attr);
          }
          PyObject * module_attr = PyObject_GetAttrString(class_attr, "__module__");
          if (module_attr) {
            module_name = (char *)PyUnicode_1BYTE_DATA(module_attr);
            Py_DECREF(module_attr);
          }
          Py_DECREF(class_attr);
        }
      }
      if (!class_name || !module_name) {
        return false;
      }
      snprintf(full_classname_dest, sizeof(full_classname_dest), "%s.%s", module_name, class_name);
    }
    assert(strncmp("agenticros_msgs.srv._follow_me_get_status.FollowMeGetStatus_Request", full_classname_dest, 67) == 0);
  }
  agenticros_msgs__srv__FollowMeGetStatus_Request * ros_message = _ros_message;
  ros_message->structure_needs_at_least_one_member = 0;

  return true;
}

ROSIDL_GENERATOR_C_EXPORT
PyObject * agenticros_msgs__srv__follow_me_get_status__request__convert_to_py(void * raw_ros_message)
{
  /* NOTE(esteve): Call constructor of FollowMeGetStatus_Request */
  PyObject * _pymessage = NULL;
  {
    PyObject * pymessage_module = PyImport_ImportModule("agenticros_msgs.srv._follow_me_get_status");
    assert(pymessage_module);
    PyObject * pymessage_class = PyObject_GetAttrString(pymessage_module, "FollowMeGetStatus_Request");
    assert(pymessage_class);
    Py_DECREF(pymessage_module);
    _pymessage = PyObject_CallObject(pymessage_class, NULL);
    Py_DECREF(pymessage_class);
    if (!_pymessage) {
      return NULL;
    }
  }
  (void)raw_ros_message;

  // ownership of _pymessage is transferred to the caller
  return _pymessage;
}

#define NPY_NO_DEPRECATED_API NPY_1_7_API_VERSION
// already included above
// #include <Python.h>
// already included above
// #include <stdbool.h>
// already included above
// #include "numpy/ndarrayobject.h"
// already included above
// #include "rosidl_runtime_c/visibility_control.h"
// already included above
// #include "agenticros_msgs/srv/detail/follow_me_get_status__struct.h"
// already included above
// #include "agenticros_msgs/srv/detail/follow_me_get_status__functions.h"

#include "rosidl_runtime_c/string.h"
#include "rosidl_runtime_c/string_functions.h"

ROSIDL_GENERATOR_C_IMPORT
bool geometry_msgs__msg__twist__convert_from_py(PyObject * _pymsg, void * _ros_message);
ROSIDL_GENERATOR_C_IMPORT
PyObject * geometry_msgs__msg__twist__convert_to_py(void * raw_ros_message);

ROSIDL_GENERATOR_C_EXPORT
bool agenticros_msgs__srv__follow_me_get_status__response__convert_from_py(PyObject * _pymsg, void * _ros_message)
{
  // check that the passed message is of the expected Python class
  {
    char full_classname_dest[69];
    {
      char * class_name = NULL;
      char * module_name = NULL;
      {
        PyObject * class_attr = PyObject_GetAttrString(_pymsg, "__class__");
        if (class_attr) {
          PyObject * name_attr = PyObject_GetAttrString(class_attr, "__name__");
          if (name_attr) {
            class_name = (char *)PyUnicode_1BYTE_DATA(name_attr);
            Py_DECREF(name_attr);
          }
          PyObject * module_attr = PyObject_GetAttrString(class_attr, "__module__");
          if (module_attr) {
            module_name = (char *)PyUnicode_1BYTE_DATA(module_attr);
            Py_DECREF(module_attr);
          }
          Py_DECREF(class_attr);
        }
      }
      if (!class_name || !module_name) {
        return false;
      }
      snprintf(full_classname_dest, sizeof(full_classname_dest), "%s.%s", module_name, class_name);
    }
    assert(strncmp("agenticros_msgs.srv._follow_me_get_status.FollowMeGetStatus_Response", full_classname_dest, 68) == 0);
  }
  agenticros_msgs__srv__FollowMeGetStatus_Response * ros_message = _ros_message;
  {  // success
    PyObject * field = PyObject_GetAttrString(_pymsg, "success");
    if (!field) {
      return false;
    }
    assert(PyBool_Check(field));
    ros_message->success = (Py_True == field);
    Py_DECREF(field);
  }
  {  // enabled
    PyObject * field = PyObject_GetAttrString(_pymsg, "enabled");
    if (!field) {
      return false;
    }
    assert(PyBool_Check(field));
    ros_message->enabled = (Py_True == field);
    Py_DECREF(field);
  }
  {  // tracking
    PyObject * field = PyObject_GetAttrString(_pymsg, "tracking");
    if (!field) {
      return false;
    }
    assert(PyBool_Check(field));
    ros_message->tracking = (Py_True == field);
    Py_DECREF(field);
  }
  {  // target_distance
    PyObject * field = PyObject_GetAttrString(_pymsg, "target_distance");
    if (!field) {
      return false;
    }
    assert(PyFloat_Check(field));
    ros_message->target_distance = (float)PyFloat_AS_DOUBLE(field);
    Py_DECREF(field);
  }
  {  // current_distance
    PyObject * field = PyObject_GetAttrString(_pymsg, "current_distance");
    if (!field) {
      return false;
    }
    assert(PyFloat_Check(field));
    ros_message->current_distance = (float)PyFloat_AS_DOUBLE(field);
    Py_DECREF(field);
  }
  {  // target_person_id
    PyObject * field = PyObject_GetAttrString(_pymsg, "target_person_id");
    if (!field) {
      return false;
    }
    assert(PyLong_Check(field));
    ros_message->target_person_id = (int32_t)PyLong_AsLong(field);
    Py_DECREF(field);
  }
  {  // target_description
    PyObject * field = PyObject_GetAttrString(_pymsg, "target_description");
    if (!field) {
      return false;
    }
    assert(PyUnicode_Check(field));
    PyObject * encoded_field = PyUnicode_AsUTF8String(field);
    if (!encoded_field) {
      Py_DECREF(field);
      return false;
    }
    rosidl_runtime_c__String__assign(&ros_message->target_description, PyBytes_AS_STRING(encoded_field));
    Py_DECREF(encoded_field);
    Py_DECREF(field);
  }
  {  // persons_detected
    PyObject * field = PyObject_GetAttrString(_pymsg, "persons_detected");
    if (!field) {
      return false;
    }
    assert(PyLong_Check(field));
    ros_message->persons_detected = (int32_t)PyLong_AsLong(field);
    Py_DECREF(field);
  }
  {  // twist
    PyObject * field = PyObject_GetAttrString(_pymsg, "twist");
    if (!field) {
      return false;
    }
    if (!geometry_msgs__msg__twist__convert_from_py(field, &ros_message->twist)) {
      Py_DECREF(field);
      return false;
    }
    Py_DECREF(field);
  }
  {  // error_message
    PyObject * field = PyObject_GetAttrString(_pymsg, "error_message");
    if (!field) {
      return false;
    }
    assert(PyUnicode_Check(field));
    PyObject * encoded_field = PyUnicode_AsUTF8String(field);
    if (!encoded_field) {
      Py_DECREF(field);
      return false;
    }
    rosidl_runtime_c__String__assign(&ros_message->error_message, PyBytes_AS_STRING(encoded_field));
    Py_DECREF(encoded_field);
    Py_DECREF(field);
  }

  return true;
}

ROSIDL_GENERATOR_C_EXPORT
PyObject * agenticros_msgs__srv__follow_me_get_status__response__convert_to_py(void * raw_ros_message)
{
  /* NOTE(esteve): Call constructor of FollowMeGetStatus_Response */
  PyObject * _pymessage = NULL;
  {
    PyObject * pymessage_module = PyImport_ImportModule("agenticros_msgs.srv._follow_me_get_status");
    assert(pymessage_module);
    PyObject * pymessage_class = PyObject_GetAttrString(pymessage_module, "FollowMeGetStatus_Response");
    assert(pymessage_class);
    Py_DECREF(pymessage_module);
    _pymessage = PyObject_CallObject(pymessage_class, NULL);
    Py_DECREF(pymessage_class);
    if (!_pymessage) {
      return NULL;
    }
  }
  agenticros_msgs__srv__FollowMeGetStatus_Response * ros_message = (agenticros_msgs__srv__FollowMeGetStatus_Response *)raw_ros_message;
  {  // success
    PyObject * field = NULL;
    field = PyBool_FromLong(ros_message->success ? 1 : 0);
    {
      int rc = PyObject_SetAttrString(_pymessage, "success", field);
      Py_DECREF(field);
      if (rc) {
        return NULL;
      }
    }
  }
  {  // enabled
    PyObject * field = NULL;
    field = PyBool_FromLong(ros_message->enabled ? 1 : 0);
    {
      int rc = PyObject_SetAttrString(_pymessage, "enabled", field);
      Py_DECREF(field);
      if (rc) {
        return NULL;
      }
    }
  }
  {  // tracking
    PyObject * field = NULL;
    field = PyBool_FromLong(ros_message->tracking ? 1 : 0);
    {
      int rc = PyObject_SetAttrString(_pymessage, "tracking", field);
      Py_DECREF(field);
      if (rc) {
        return NULL;
      }
    }
  }
  {  // target_distance
    PyObject * field = NULL;
    field = PyFloat_FromDouble(ros_message->target_distance);
    {
      int rc = PyObject_SetAttrString(_pymessage, "target_distance", field);
      Py_DECREF(field);
      if (rc) {
        return NULL;
      }
    }
  }
  {  // current_distance
    PyObject * field = NULL;
    field = PyFloat_FromDouble(ros_message->current_distance);
    {
      int rc = PyObject_SetAttrString(_pymessage, "current_distance", field);
      Py_DECREF(field);
      if (rc) {
        return NULL;
      }
    }
  }
  {  // target_person_id
    PyObject * field = NULL;
    field = PyLong_FromLong(ros_message->target_person_id);
    {
      int rc = PyObject_SetAttrString(_pymessage, "target_person_id", field);
      Py_DECREF(field);
      if (rc) {
        return NULL;
      }
    }
  }
  {  // target_description
    PyObject * field = NULL;
    field = PyUnicode_DecodeUTF8(
      ros_message->target_description.data,
      strlen(ros_message->target_description.data),
      "replace");
    if (!field) {
      return NULL;
    }
    {
      int rc = PyObject_SetAttrString(_pymessage, "target_description", field);
      Py_DECREF(field);
      if (rc) {
        return NULL;
      }
    }
  }
  {  // persons_detected
    PyObject * field = NULL;
    field = PyLong_FromLong(ros_message->persons_detected);
    {
      int rc = PyObject_SetAttrString(_pymessage, "persons_detected", field);
      Py_DECREF(field);
      if (rc) {
        return NULL;
      }
    }
  }
  {  // twist
    PyObject * field = NULL;
    field = geometry_msgs__msg__twist__convert_to_py(&ros_message->twist);
    if (!field) {
      return NULL;
    }
    {
      int rc = PyObject_SetAttrString(_pymessage, "twist", field);
      Py_DECREF(field);
      if (rc) {
        return NULL;
      }
    }
  }
  {  // error_message
    PyObject * field = NULL;
    field = PyUnicode_DecodeUTF8(
      ros_message->error_message.data,
      strlen(ros_message->error_message.data),
      "replace");
    if (!field) {
      return NULL;
    }
    {
      int rc = PyObject_SetAttrString(_pymessage, "error_message", field);
      Py_DECREF(field);
      if (rc) {
        return NULL;
      }
    }
  }

  // ownership of _pymessage is transferred to the caller
  return _pymessage;
}

#define NPY_NO_DEPRECATED_API NPY_1_7_API_VERSION
// already included above
// #include <Python.h>
// already included above
// #include <stdbool.h>
// already included above
// #include "numpy/ndarrayobject.h"
// already included above
// #include "rosidl_runtime_c/visibility_control.h"
// already included above
// #include "agenticros_msgs/srv/detail/follow_me_get_status__struct.h"
// already included above
// #include "agenticros_msgs/srv/detail/follow_me_get_status__functions.h"

#include "rosidl_runtime_c/primitives_sequence.h"
#include "rosidl_runtime_c/primitives_sequence_functions.h"

// Nested array functions includes


// end nested array functions include
ROSIDL_GENERATOR_C_IMPORT
bool service_msgs__msg__service_event_info__convert_from_py(PyObject * _pymsg, void * _ros_message);
ROSIDL_GENERATOR_C_IMPORT
PyObject * service_msgs__msg__service_event_info__convert_to_py(void * raw_ros_message);
bool agenticros_msgs__srv__follow_me_get_status__request__convert_from_py(PyObject * _pymsg, void * _ros_message);
PyObject * agenticros_msgs__srv__follow_me_get_status__request__convert_to_py(void * raw_ros_message);
bool agenticros_msgs__srv__follow_me_get_status__response__convert_from_py(PyObject * _pymsg, void * _ros_message);
PyObject * agenticros_msgs__srv__follow_me_get_status__response__convert_to_py(void * raw_ros_message);

ROSIDL_GENERATOR_C_EXPORT
bool agenticros_msgs__srv__follow_me_get_status__event__convert_from_py(PyObject * _pymsg, void * _ros_message)
{
  // check that the passed message is of the expected Python class
  {
    char full_classname_dest[66];
    {
      char * class_name = NULL;
      char * module_name = NULL;
      {
        PyObject * class_attr = PyObject_GetAttrString(_pymsg, "__class__");
        if (class_attr) {
          PyObject * name_attr = PyObject_GetAttrString(class_attr, "__name__");
          if (name_attr) {
            class_name = (char *)PyUnicode_1BYTE_DATA(name_attr);
            Py_DECREF(name_attr);
          }
          PyObject * module_attr = PyObject_GetAttrString(class_attr, "__module__");
          if (module_attr) {
            module_name = (char *)PyUnicode_1BYTE_DATA(module_attr);
            Py_DECREF(module_attr);
          }
          Py_DECREF(class_attr);
        }
      }
      if (!class_name || !module_name) {
        return false;
      }
      snprintf(full_classname_dest, sizeof(full_classname_dest), "%s.%s", module_name, class_name);
    }
    assert(strncmp("agenticros_msgs.srv._follow_me_get_status.FollowMeGetStatus_Event", full_classname_dest, 65) == 0);
  }
  agenticros_msgs__srv__FollowMeGetStatus_Event * ros_message = _ros_message;
  {  // info
    PyObject * field = PyObject_GetAttrString(_pymsg, "info");
    if (!field) {
      return false;
    }
    if (!service_msgs__msg__service_event_info__convert_from_py(field, &ros_message->info)) {
      Py_DECREF(field);
      return false;
    }
    Py_DECREF(field);
  }
  {  // request
    PyObject * field = PyObject_GetAttrString(_pymsg, "request");
    if (!field) {
      return false;
    }
    PyObject * seq_field = PySequence_Fast(field, "expected a sequence in 'request'");
    if (!seq_field) {
      Py_DECREF(field);
      return false;
    }
    Py_ssize_t size = PySequence_Size(field);
    if (-1 == size) {
      Py_DECREF(seq_field);
      Py_DECREF(field);
      return false;
    }
    if (!agenticros_msgs__srv__FollowMeGetStatus_Request__Sequence__init(&(ros_message->request), size)) {
      PyErr_SetString(PyExc_RuntimeError, "unable to create agenticros_msgs__srv__FollowMeGetStatus_Request__Sequence ros_message");
      Py_DECREF(seq_field);
      Py_DECREF(field);
      return false;
    }
    agenticros_msgs__srv__FollowMeGetStatus_Request * dest = ros_message->request.data;
    for (Py_ssize_t i = 0; i < size; ++i) {
      if (!agenticros_msgs__srv__follow_me_get_status__request__convert_from_py(PySequence_Fast_GET_ITEM(seq_field, i), &dest[i])) {
        Py_DECREF(seq_field);
        Py_DECREF(field);
        return false;
      }
    }
    Py_DECREF(seq_field);
    Py_DECREF(field);
  }
  {  // response
    PyObject * field = PyObject_GetAttrString(_pymsg, "response");
    if (!field) {
      return false;
    }
    PyObject * seq_field = PySequence_Fast(field, "expected a sequence in 'response'");
    if (!seq_field) {
      Py_DECREF(field);
      return false;
    }
    Py_ssize_t size = PySequence_Size(field);
    if (-1 == size) {
      Py_DECREF(seq_field);
      Py_DECREF(field);
      return false;
    }
    if (!agenticros_msgs__srv__FollowMeGetStatus_Response__Sequence__init(&(ros_message->response), size)) {
      PyErr_SetString(PyExc_RuntimeError, "unable to create agenticros_msgs__srv__FollowMeGetStatus_Response__Sequence ros_message");
      Py_DECREF(seq_field);
      Py_DECREF(field);
      return false;
    }
    agenticros_msgs__srv__FollowMeGetStatus_Response * dest = ros_message->response.data;
    for (Py_ssize_t i = 0; i < size; ++i) {
      if (!agenticros_msgs__srv__follow_me_get_status__response__convert_from_py(PySequence_Fast_GET_ITEM(seq_field, i), &dest[i])) {
        Py_DECREF(seq_field);
        Py_DECREF(field);
        return false;
      }
    }
    Py_DECREF(seq_field);
    Py_DECREF(field);
  }

  return true;
}

ROSIDL_GENERATOR_C_EXPORT
PyObject * agenticros_msgs__srv__follow_me_get_status__event__convert_to_py(void * raw_ros_message)
{
  /* NOTE(esteve): Call constructor of FollowMeGetStatus_Event */
  PyObject * _pymessage = NULL;
  {
    PyObject * pymessage_module = PyImport_ImportModule("agenticros_msgs.srv._follow_me_get_status");
    assert(pymessage_module);
    PyObject * pymessage_class = PyObject_GetAttrString(pymessage_module, "FollowMeGetStatus_Event");
    assert(pymessage_class);
    Py_DECREF(pymessage_module);
    _pymessage = PyObject_CallObject(pymessage_class, NULL);
    Py_DECREF(pymessage_class);
    if (!_pymessage) {
      return NULL;
    }
  }
  agenticros_msgs__srv__FollowMeGetStatus_Event * ros_message = (agenticros_msgs__srv__FollowMeGetStatus_Event *)raw_ros_message;
  {  // info
    PyObject * field = NULL;
    field = service_msgs__msg__service_event_info__convert_to_py(&ros_message->info);
    if (!field) {
      return NULL;
    }
    {
      int rc = PyObject_SetAttrString(_pymessage, "info", field);
      Py_DECREF(field);
      if (rc) {
        return NULL;
      }
    }
  }
  {  // request
    PyObject * field = NULL;
    size_t size = ros_message->request.size;
    field = PyList_New(size);
    if (!field) {
      return NULL;
    }
    agenticros_msgs__srv__FollowMeGetStatus_Request * item;
    for (size_t i = 0; i < size; ++i) {
      item = &(ros_message->request.data[i]);
      PyObject * pyitem = agenticros_msgs__srv__follow_me_get_status__request__convert_to_py(item);
      if (!pyitem) {
        Py_DECREF(field);
        return NULL;
      }
      int rc = PyList_SetItem(field, i, pyitem);
      (void)rc;
      assert(rc == 0);
    }
    assert(PySequence_Check(field));
    {
      int rc = PyObject_SetAttrString(_pymessage, "request", field);
      Py_DECREF(field);
      if (rc) {
        return NULL;
      }
    }
  }
  {  // response
    PyObject * field = NULL;
    size_t size = ros_message->response.size;
    field = PyList_New(size);
    if (!field) {
      return NULL;
    }
    agenticros_msgs__srv__FollowMeGetStatus_Response * item;
    for (size_t i = 0; i < size; ++i) {
      item = &(ros_message->response.data[i]);
      PyObject * pyitem = agenticros_msgs__srv__follow_me_get_status__response__convert_to_py(item);
      if (!pyitem) {
        Py_DECREF(field);
        return NULL;
      }
      int rc = PyList_SetItem(field, i, pyitem);
      (void)rc;
      assert(rc == 0);
    }
    assert(PySequence_Check(field));
    {
      int rc = PyObject_SetAttrString(_pymessage, "response", field);
      Py_DECREF(field);
      if (rc) {
        return NULL;
      }
    }
  }

  // ownership of _pymessage is transferred to the caller
  return _pymessage;
}
