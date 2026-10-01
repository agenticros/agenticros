# generated from rosidl_generator_py/resource/_idl.py.em
# with input from agenticros_msgs:msg/CapabilityManifest.idl
# generated code does not contain a copyright notice

# This is being done at the module level and not on the instance level to avoid looking
# for the same variable multiple times on each instance. This variable is not supposed to
# change during runtime so it makes sense to only look for it once.
from os import getenv

ros_python_check_fields = getenv('ROS_PYTHON_CHECK_FIELDS', default='')


# Import statements for member types

import builtins  # noqa: E402, I100

import rosidl_parser.definition  # noqa: E402, I100


class Metaclass_CapabilityManifest(type):
    """Metaclass of message 'CapabilityManifest'."""

    _CREATE_ROS_MESSAGE = None
    _CONVERT_FROM_PY = None
    _CONVERT_TO_PY = None
    _DESTROY_ROS_MESSAGE = None
    _TYPE_SUPPORT = None

    __constants = {
    }

    @classmethod
    def __import_type_support__(cls):
        try:
            from rosidl_generator_py import import_type_support
            module = import_type_support('agenticros_msgs')
        except ImportError:
            import logging
            import traceback
            logger = logging.getLogger(
                'agenticros_msgs.msg.CapabilityManifest')
            logger.debug(
                'Failed to import needed modules for type support:\n' +
                traceback.format_exc())
        else:
            cls._CREATE_ROS_MESSAGE = module.create_ros_message_msg__msg__capability_manifest
            cls._CONVERT_FROM_PY = module.convert_from_py_msg__msg__capability_manifest
            cls._CONVERT_TO_PY = module.convert_to_py_msg__msg__capability_manifest
            cls._TYPE_SUPPORT = module.type_support_msg__msg__capability_manifest
            cls._DESTROY_ROS_MESSAGE = module.destroy_ros_message_msg__msg__capability_manifest

            from builtin_interfaces.msg import Time
            if Time.__class__._TYPE_SUPPORT is None:
                Time.__class__.__import_type_support__()

    @classmethod
    def __prepare__(cls, name, bases, **kwargs):
        # list constant names here so that they appear in the help text of
        # the message class under "Data and other attributes defined here:"
        # as well as populate each message instance
        return {
        }


class CapabilityManifest(metaclass=Metaclass_CapabilityManifest):
    """Message class 'CapabilityManifest'."""

    __slots__ = [
        '_robot_name',
        '_robot_namespace',
        '_topic_names',
        '_topic_types',
        '_service_names',
        '_service_types',
        '_action_names',
        '_action_types',
        '_stamp',
        '_check_fields',
    ]

    _fields_and_field_types = {
        'robot_name': 'string',
        'robot_namespace': 'string',
        'topic_names': 'sequence<string>',
        'topic_types': 'sequence<string>',
        'service_names': 'sequence<string>',
        'service_types': 'sequence<string>',
        'action_names': 'sequence<string>',
        'action_types': 'sequence<string>',
        'stamp': 'builtin_interfaces/Time',
    }

    # This attribute is used to store an rosidl_parser.definition variable
    # related to the data type of each of the components the message.
    SLOT_TYPES = (
        rosidl_parser.definition.UnboundedString(),  # noqa: E501
        rosidl_parser.definition.UnboundedString(),  # noqa: E501
        rosidl_parser.definition.UnboundedSequence(rosidl_parser.definition.UnboundedString()),  # noqa: E501
        rosidl_parser.definition.UnboundedSequence(rosidl_parser.definition.UnboundedString()),  # noqa: E501
        rosidl_parser.definition.UnboundedSequence(rosidl_parser.definition.UnboundedString()),  # noqa: E501
        rosidl_parser.definition.UnboundedSequence(rosidl_parser.definition.UnboundedString()),  # noqa: E501
        rosidl_parser.definition.UnboundedSequence(rosidl_parser.definition.UnboundedString()),  # noqa: E501
        rosidl_parser.definition.UnboundedSequence(rosidl_parser.definition.UnboundedString()),  # noqa: E501
        rosidl_parser.definition.NamespacedType(['builtin_interfaces', 'msg'], 'Time'),  # noqa: E501
    )

    def __init__(self, **kwargs):
        if 'check_fields' in kwargs:
            self._check_fields = kwargs['check_fields']
        else:
            self._check_fields = ros_python_check_fields == '1'
        if self._check_fields:
            assert all('_' + key in self.__slots__ for key in kwargs.keys()), \
                'Invalid arguments passed to constructor: %s' % \
                ', '.join(sorted(k for k in kwargs.keys() if '_' + k not in self.__slots__))
        self.robot_name = kwargs.get('robot_name', str())
        self.robot_namespace = kwargs.get('robot_namespace', str())
        self.topic_names = kwargs.get('topic_names', [])
        self.topic_types = kwargs.get('topic_types', [])
        self.service_names = kwargs.get('service_names', [])
        self.service_types = kwargs.get('service_types', [])
        self.action_names = kwargs.get('action_names', [])
        self.action_types = kwargs.get('action_types', [])
        from builtin_interfaces.msg import Time
        self.stamp = kwargs.get('stamp', Time())

    def __repr__(self):
        typename = self.__class__.__module__.split('.')
        typename.pop()
        typename.append(self.__class__.__name__)
        args = []
        for s, t in zip(self.get_fields_and_field_types().keys(), self.SLOT_TYPES):
            field = getattr(self, s)
            fieldstr = repr(field)
            # We use Python array type for fields that can be directly stored
            # in them, and "normal" sequences for everything else.  If it is
            # a type that we store in an array, strip off the 'array' portion.
            if (
                isinstance(t, rosidl_parser.definition.AbstractSequence) and
                isinstance(t.value_type, rosidl_parser.definition.BasicType) and
                t.value_type.typename in ['float', 'double', 'int8', 'uint8', 'int16', 'uint16', 'int32', 'uint32', 'int64', 'uint64']
            ):
                if len(field) == 0:
                    fieldstr = '[]'
                else:
                    if self._check_fields:
                        assert fieldstr.startswith('array(')
                    prefix = "array('X', "
                    suffix = ')'
                    fieldstr = fieldstr[len(prefix):-len(suffix)]
            args.append(s + '=' + fieldstr)
        return '%s(%s)' % ('.'.join(typename), ', '.join(args))

    def __eq__(self, other):
        if not isinstance(other, self.__class__):
            return False
        if self.robot_name != other.robot_name:
            return False
        if self.robot_namespace != other.robot_namespace:
            return False
        if self.topic_names != other.topic_names:
            return False
        if self.topic_types != other.topic_types:
            return False
        if self.service_names != other.service_names:
            return False
        if self.service_types != other.service_types:
            return False
        if self.action_names != other.action_names:
            return False
        if self.action_types != other.action_types:
            return False
        if self.stamp != other.stamp:
            return False
        return True

    @classmethod
    def get_fields_and_field_types(cls):
        from copy import copy
        return copy(cls._fields_and_field_types)

    @builtins.property
    def robot_name(self):
        """Message field 'robot_name'."""
        return self._robot_name

    @robot_name.setter
    def robot_name(self, value):
        if self._check_fields:
            assert \
                isinstance(value, str), \
                "The 'robot_name' field must be of type 'str'"
        self._robot_name = value

    @builtins.property
    def robot_namespace(self):
        """Message field 'robot_namespace'."""
        return self._robot_namespace

    @robot_namespace.setter
    def robot_namespace(self, value):
        if self._check_fields:
            assert \
                isinstance(value, str), \
                "The 'robot_namespace' field must be of type 'str'"
        self._robot_namespace = value

    @builtins.property
    def topic_names(self):
        """Message field 'topic_names'."""
        return self._topic_names

    @topic_names.setter
    def topic_names(self, value):
        if self._check_fields:
            from collections.abc import Sequence
            from collections.abc import Set
            from collections import UserList
            from collections import UserString
            assert \
                ((isinstance(value, Sequence) or
                  isinstance(value, Set) or
                  isinstance(value, UserList)) and
                 not isinstance(value, str) and
                 not isinstance(value, UserString) and
                 all(isinstance(v, str) for v in value) and
                 True), \
                "The 'topic_names' field must be a set or sequence and each value of type 'str'"
        self._topic_names = value

    @builtins.property
    def topic_types(self):
        """Message field 'topic_types'."""
        return self._topic_types

    @topic_types.setter
    def topic_types(self, value):
        if self._check_fields:
            from collections.abc import Sequence
            from collections.abc import Set
            from collections import UserList
            from collections import UserString
            assert \
                ((isinstance(value, Sequence) or
                  isinstance(value, Set) or
                  isinstance(value, UserList)) and
                 not isinstance(value, str) and
                 not isinstance(value, UserString) and
                 all(isinstance(v, str) for v in value) and
                 True), \
                "The 'topic_types' field must be a set or sequence and each value of type 'str'"
        self._topic_types = value

    @builtins.property
    def service_names(self):
        """Message field 'service_names'."""
        return self._service_names

    @service_names.setter
    def service_names(self, value):
        if self._check_fields:
            from collections.abc import Sequence
            from collections.abc import Set
            from collections import UserList
            from collections import UserString
            assert \
                ((isinstance(value, Sequence) or
                  isinstance(value, Set) or
                  isinstance(value, UserList)) and
                 not isinstance(value, str) and
                 not isinstance(value, UserString) and
                 all(isinstance(v, str) for v in value) and
                 True), \
                "The 'service_names' field must be a set or sequence and each value of type 'str'"
        self._service_names = value

    @builtins.property
    def service_types(self):
        """Message field 'service_types'."""
        return self._service_types

    @service_types.setter
    def service_types(self, value):
        if self._check_fields:
            from collections.abc import Sequence
            from collections.abc import Set
            from collections import UserList
            from collections import UserString
            assert \
                ((isinstance(value, Sequence) or
                  isinstance(value, Set) or
                  isinstance(value, UserList)) and
                 not isinstance(value, str) and
                 not isinstance(value, UserString) and
                 all(isinstance(v, str) for v in value) and
                 True), \
                "The 'service_types' field must be a set or sequence and each value of type 'str'"
        self._service_types = value

    @builtins.property
    def action_names(self):
        """Message field 'action_names'."""
        return self._action_names

    @action_names.setter
    def action_names(self, value):
        if self._check_fields:
            from collections.abc import Sequence
            from collections.abc import Set
            from collections import UserList
            from collections import UserString
            assert \
                ((isinstance(value, Sequence) or
                  isinstance(value, Set) or
                  isinstance(value, UserList)) and
                 not isinstance(value, str) and
                 not isinstance(value, UserString) and
                 all(isinstance(v, str) for v in value) and
                 True), \
                "The 'action_names' field must be a set or sequence and each value of type 'str'"
        self._action_names = value

    @builtins.property
    def action_types(self):
        """Message field 'action_types'."""
        return self._action_types

    @action_types.setter
    def action_types(self, value):
        if self._check_fields:
            from collections.abc import Sequence
            from collections.abc import Set
            from collections import UserList
            from collections import UserString
            assert \
                ((isinstance(value, Sequence) or
                  isinstance(value, Set) or
                  isinstance(value, UserList)) and
                 not isinstance(value, str) and
                 not isinstance(value, UserString) and
                 all(isinstance(v, str) for v in value) and
                 True), \
                "The 'action_types' field must be a set or sequence and each value of type 'str'"
        self._action_types = value

    @builtins.property
    def stamp(self):
        """Message field 'stamp'."""
        return self._stamp

    @stamp.setter
    def stamp(self, value):
        if self._check_fields:
            from builtin_interfaces.msg import Time
            assert \
                isinstance(value, Time), \
                "The 'stamp' field must be a sub message of type 'Time'"
        self._stamp = value
