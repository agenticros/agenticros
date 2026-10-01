# generated from rosidl_generator_py/resource/_idl.py.em
# with input from agenticros_msgs:msg/RobotInfo.idl
# generated code does not contain a copyright notice

# This is being done at the module level and not on the instance level to avoid looking
# for the same variable multiple times on each instance. This variable is not supposed to
# change during runtime so it makes sense to only look for it once.
from os import getenv

ros_python_check_fields = getenv('ROS_PYTHON_CHECK_FIELDS', default='')


# Import statements for member types

import builtins  # noqa: E402, I100

import rosidl_parser.definition  # noqa: E402, I100


class Metaclass_RobotInfo(type):
    """Metaclass of message 'RobotInfo'."""

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
                'agenticros_msgs.msg.RobotInfo')
            logger.debug(
                'Failed to import needed modules for type support:\n' +
                traceback.format_exc())
        else:
            cls._CREATE_ROS_MESSAGE = module.create_ros_message_msg__msg__robot_info
            cls._CONVERT_FROM_PY = module.convert_from_py_msg__msg__robot_info
            cls._CONVERT_TO_PY = module.convert_to_py_msg__msg__robot_info
            cls._TYPE_SUPPORT = module.type_support_msg__msg__robot_info
            cls._DESTROY_ROS_MESSAGE = module.destroy_ros_message_msg__msg__robot_info

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


class RobotInfo(metaclass=Metaclass_RobotInfo):
    """Message class 'RobotInfo'."""

    __slots__ = [
        '_id',
        '_name',
        '_kind',
        '_robot_namespace',
        '_capability_ids',
        '_has_realsense',
        '_has_lidar',
        '_has_arm',
        '_stamp',
        '_check_fields',
    ]

    _fields_and_field_types = {
        'id': 'string',
        'name': 'string',
        'kind': 'string',
        'robot_namespace': 'string',
        'capability_ids': 'sequence<string>',
        'has_realsense': 'boolean',
        'has_lidar': 'boolean',
        'has_arm': 'boolean',
        'stamp': 'builtin_interfaces/Time',
    }

    # This attribute is used to store an rosidl_parser.definition variable
    # related to the data type of each of the components the message.
    SLOT_TYPES = (
        rosidl_parser.definition.UnboundedString(),  # noqa: E501
        rosidl_parser.definition.UnboundedString(),  # noqa: E501
        rosidl_parser.definition.UnboundedString(),  # noqa: E501
        rosidl_parser.definition.UnboundedString(),  # noqa: E501
        rosidl_parser.definition.UnboundedSequence(rosidl_parser.definition.UnboundedString()),  # noqa: E501
        rosidl_parser.definition.BasicType('boolean'),  # noqa: E501
        rosidl_parser.definition.BasicType('boolean'),  # noqa: E501
        rosidl_parser.definition.BasicType('boolean'),  # noqa: E501
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
        self.id = kwargs.get('id', str())
        self.name = kwargs.get('name', str())
        self.kind = kwargs.get('kind', str())
        self.robot_namespace = kwargs.get('robot_namespace', str())
        self.capability_ids = kwargs.get('capability_ids', [])
        self.has_realsense = kwargs.get('has_realsense', bool())
        self.has_lidar = kwargs.get('has_lidar', bool())
        self.has_arm = kwargs.get('has_arm', bool())
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
        if self.id != other.id:
            return False
        if self.name != other.name:
            return False
        if self.kind != other.kind:
            return False
        if self.robot_namespace != other.robot_namespace:
            return False
        if self.capability_ids != other.capability_ids:
            return False
        if self.has_realsense != other.has_realsense:
            return False
        if self.has_lidar != other.has_lidar:
            return False
        if self.has_arm != other.has_arm:
            return False
        if self.stamp != other.stamp:
            return False
        return True

    @classmethod
    def get_fields_and_field_types(cls):
        from copy import copy
        return copy(cls._fields_and_field_types)

    @builtins.property  # noqa: A003
    def id(self):  # noqa: A003
        """Message field 'id'."""
        return self._id

    @id.setter  # noqa: A003
    def id(self, value):  # noqa: A003
        if self._check_fields:
            assert \
                isinstance(value, str), \
                "The 'id' field must be of type 'str'"
        self._id = value

    @builtins.property
    def name(self):
        """Message field 'name'."""
        return self._name

    @name.setter
    def name(self, value):
        if self._check_fields:
            assert \
                isinstance(value, str), \
                "The 'name' field must be of type 'str'"
        self._name = value

    @builtins.property
    def kind(self):
        """Message field 'kind'."""
        return self._kind

    @kind.setter
    def kind(self, value):
        if self._check_fields:
            assert \
                isinstance(value, str), \
                "The 'kind' field must be of type 'str'"
        self._kind = value

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
    def capability_ids(self):
        """Message field 'capability_ids'."""
        return self._capability_ids

    @capability_ids.setter
    def capability_ids(self, value):
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
                "The 'capability_ids' field must be a set or sequence and each value of type 'str'"
        self._capability_ids = value

    @builtins.property
    def has_realsense(self):
        """Message field 'has_realsense'."""
        return self._has_realsense

    @has_realsense.setter
    def has_realsense(self, value):
        if self._check_fields:
            assert \
                isinstance(value, bool), \
                "The 'has_realsense' field must be of type 'bool'"
        self._has_realsense = value

    @builtins.property
    def has_lidar(self):
        """Message field 'has_lidar'."""
        return self._has_lidar

    @has_lidar.setter
    def has_lidar(self, value):
        if self._check_fields:
            assert \
                isinstance(value, bool), \
                "The 'has_lidar' field must be of type 'bool'"
        self._has_lidar = value

    @builtins.property
    def has_arm(self):
        """Message field 'has_arm'."""
        return self._has_arm

    @has_arm.setter
    def has_arm(self, value):
        if self._check_fields:
            assert \
                isinstance(value, bool), \
                "The 'has_arm' field must be of type 'bool'"
        self._has_arm = value

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
