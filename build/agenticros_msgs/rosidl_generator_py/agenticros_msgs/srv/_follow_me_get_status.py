# generated from rosidl_generator_py/resource/_idl.py.em
# with input from agenticros_msgs:srv/FollowMeGetStatus.idl
# generated code does not contain a copyright notice

# This is being done at the module level and not on the instance level to avoid looking
# for the same variable multiple times on each instance. This variable is not supposed to
# change during runtime so it makes sense to only look for it once.
from os import getenv

ros_python_check_fields = getenv('ROS_PYTHON_CHECK_FIELDS', default='')


# Import statements for member types

import rosidl_parser.definition  # noqa: E402, I100


class Metaclass_FollowMeGetStatus_Request(type):
    """Metaclass of message 'FollowMeGetStatus_Request'."""

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
                'agenticros_msgs.srv.FollowMeGetStatus_Request')
            logger.debug(
                'Failed to import needed modules for type support:\n' +
                traceback.format_exc())
        else:
            cls._CREATE_ROS_MESSAGE = module.create_ros_message_msg__srv__follow_me_get_status__request
            cls._CONVERT_FROM_PY = module.convert_from_py_msg__srv__follow_me_get_status__request
            cls._CONVERT_TO_PY = module.convert_to_py_msg__srv__follow_me_get_status__request
            cls._TYPE_SUPPORT = module.type_support_msg__srv__follow_me_get_status__request
            cls._DESTROY_ROS_MESSAGE = module.destroy_ros_message_msg__srv__follow_me_get_status__request

    @classmethod
    def __prepare__(cls, name, bases, **kwargs):
        # list constant names here so that they appear in the help text of
        # the message class under "Data and other attributes defined here:"
        # as well as populate each message instance
        return {
        }


class FollowMeGetStatus_Request(metaclass=Metaclass_FollowMeGetStatus_Request):
    """Message class 'FollowMeGetStatus_Request'."""

    __slots__ = [
        '_check_fields',
    ]

    _fields_and_field_types = {
    }

    # This attribute is used to store an rosidl_parser.definition variable
    # related to the data type of each of the components the message.
    SLOT_TYPES = (
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
        return True

    @classmethod
    def get_fields_and_field_types(cls):
        from copy import copy
        return copy(cls._fields_and_field_types)


# Import statements for member types

import builtins  # noqa: E402, I100

import math  # noqa: E402, I100

# already imported above
# import rosidl_parser.definition


class Metaclass_FollowMeGetStatus_Response(type):
    """Metaclass of message 'FollowMeGetStatus_Response'."""

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
                'agenticros_msgs.srv.FollowMeGetStatus_Response')
            logger.debug(
                'Failed to import needed modules for type support:\n' +
                traceback.format_exc())
        else:
            cls._CREATE_ROS_MESSAGE = module.create_ros_message_msg__srv__follow_me_get_status__response
            cls._CONVERT_FROM_PY = module.convert_from_py_msg__srv__follow_me_get_status__response
            cls._CONVERT_TO_PY = module.convert_to_py_msg__srv__follow_me_get_status__response
            cls._TYPE_SUPPORT = module.type_support_msg__srv__follow_me_get_status__response
            cls._DESTROY_ROS_MESSAGE = module.destroy_ros_message_msg__srv__follow_me_get_status__response

            from geometry_msgs.msg import Twist
            if Twist.__class__._TYPE_SUPPORT is None:
                Twist.__class__.__import_type_support__()

    @classmethod
    def __prepare__(cls, name, bases, **kwargs):
        # list constant names here so that they appear in the help text of
        # the message class under "Data and other attributes defined here:"
        # as well as populate each message instance
        return {
        }


class FollowMeGetStatus_Response(metaclass=Metaclass_FollowMeGetStatus_Response):
    """Message class 'FollowMeGetStatus_Response'."""

    __slots__ = [
        '_success',
        '_enabled',
        '_tracking',
        '_target_distance',
        '_current_distance',
        '_target_person_id',
        '_target_description',
        '_persons_detected',
        '_twist',
        '_error_message',
        '_check_fields',
    ]

    _fields_and_field_types = {
        'success': 'boolean',
        'enabled': 'boolean',
        'tracking': 'boolean',
        'target_distance': 'float',
        'current_distance': 'float',
        'target_person_id': 'int32',
        'target_description': 'string',
        'persons_detected': 'int32',
        'twist': 'geometry_msgs/Twist',
        'error_message': 'string',
    }

    # This attribute is used to store an rosidl_parser.definition variable
    # related to the data type of each of the components the message.
    SLOT_TYPES = (
        rosidl_parser.definition.BasicType('boolean'),  # noqa: E501
        rosidl_parser.definition.BasicType('boolean'),  # noqa: E501
        rosidl_parser.definition.BasicType('boolean'),  # noqa: E501
        rosidl_parser.definition.BasicType('float'),  # noqa: E501
        rosidl_parser.definition.BasicType('float'),  # noqa: E501
        rosidl_parser.definition.BasicType('int32'),  # noqa: E501
        rosidl_parser.definition.UnboundedString(),  # noqa: E501
        rosidl_parser.definition.BasicType('int32'),  # noqa: E501
        rosidl_parser.definition.NamespacedType(['geometry_msgs', 'msg'], 'Twist'),  # noqa: E501
        rosidl_parser.definition.UnboundedString(),  # noqa: E501
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
        self.success = kwargs.get('success', bool())
        self.enabled = kwargs.get('enabled', bool())
        self.tracking = kwargs.get('tracking', bool())
        self.target_distance = kwargs.get('target_distance', float())
        self.current_distance = kwargs.get('current_distance', float())
        self.target_person_id = kwargs.get('target_person_id', int())
        self.target_description = kwargs.get('target_description', str())
        self.persons_detected = kwargs.get('persons_detected', int())
        from geometry_msgs.msg import Twist
        self.twist = kwargs.get('twist', Twist())
        self.error_message = kwargs.get('error_message', str())

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
        if self.success != other.success:
            return False
        if self.enabled != other.enabled:
            return False
        if self.tracking != other.tracking:
            return False
        if self.target_distance != other.target_distance:
            return False
        if self.current_distance != other.current_distance:
            return False
        if self.target_person_id != other.target_person_id:
            return False
        if self.target_description != other.target_description:
            return False
        if self.persons_detected != other.persons_detected:
            return False
        if self.twist != other.twist:
            return False
        if self.error_message != other.error_message:
            return False
        return True

    @classmethod
    def get_fields_and_field_types(cls):
        from copy import copy
        return copy(cls._fields_and_field_types)

    @builtins.property
    def success(self):
        """Message field 'success'."""
        return self._success

    @success.setter
    def success(self, value):
        if self._check_fields:
            assert \
                isinstance(value, bool), \
                "The 'success' field must be of type 'bool'"
        self._success = value

    @builtins.property
    def enabled(self):
        """Message field 'enabled'."""
        return self._enabled

    @enabled.setter
    def enabled(self, value):
        if self._check_fields:
            assert \
                isinstance(value, bool), \
                "The 'enabled' field must be of type 'bool'"
        self._enabled = value

    @builtins.property
    def tracking(self):
        """Message field 'tracking'."""
        return self._tracking

    @tracking.setter
    def tracking(self, value):
        if self._check_fields:
            assert \
                isinstance(value, bool), \
                "The 'tracking' field must be of type 'bool'"
        self._tracking = value

    @builtins.property
    def target_distance(self):
        """Message field 'target_distance'."""
        return self._target_distance

    @target_distance.setter
    def target_distance(self, value):
        if self._check_fields:
            assert \
                isinstance(value, float), \
                "The 'target_distance' field must be of type 'float'"
            assert not (value < -3.402823466e+38 or value > 3.402823466e+38) or math.isinf(value), \
                "The 'target_distance' field must be a float in [-3.402823466e+38, 3.402823466e+38]"
        self._target_distance = value

    @builtins.property
    def current_distance(self):
        """Message field 'current_distance'."""
        return self._current_distance

    @current_distance.setter
    def current_distance(self, value):
        if self._check_fields:
            assert \
                isinstance(value, float), \
                "The 'current_distance' field must be of type 'float'"
            assert not (value < -3.402823466e+38 or value > 3.402823466e+38) or math.isinf(value), \
                "The 'current_distance' field must be a float in [-3.402823466e+38, 3.402823466e+38]"
        self._current_distance = value

    @builtins.property
    def target_person_id(self):
        """Message field 'target_person_id'."""
        return self._target_person_id

    @target_person_id.setter
    def target_person_id(self, value):
        if self._check_fields:
            assert \
                isinstance(value, int), \
                "The 'target_person_id' field must be of type 'int'"
            assert value >= -2147483648 and value < 2147483648, \
                "The 'target_person_id' field must be an integer in [-2147483648, 2147483647]"
        self._target_person_id = value

    @builtins.property
    def target_description(self):
        """Message field 'target_description'."""
        return self._target_description

    @target_description.setter
    def target_description(self, value):
        if self._check_fields:
            assert \
                isinstance(value, str), \
                "The 'target_description' field must be of type 'str'"
        self._target_description = value

    @builtins.property
    def persons_detected(self):
        """Message field 'persons_detected'."""
        return self._persons_detected

    @persons_detected.setter
    def persons_detected(self, value):
        if self._check_fields:
            assert \
                isinstance(value, int), \
                "The 'persons_detected' field must be of type 'int'"
            assert value >= -2147483648 and value < 2147483648, \
                "The 'persons_detected' field must be an integer in [-2147483648, 2147483647]"
        self._persons_detected = value

    @builtins.property
    def twist(self):
        """Message field 'twist'."""
        return self._twist

    @twist.setter
    def twist(self, value):
        if self._check_fields:
            from geometry_msgs.msg import Twist
            assert \
                isinstance(value, Twist), \
                "The 'twist' field must be a sub message of type 'Twist'"
        self._twist = value

    @builtins.property
    def error_message(self):
        """Message field 'error_message'."""
        return self._error_message

    @error_message.setter
    def error_message(self, value):
        if self._check_fields:
            assert \
                isinstance(value, str), \
                "The 'error_message' field must be of type 'str'"
        self._error_message = value


# Import statements for member types

# already imported above
# import builtins

# already imported above
# import rosidl_parser.definition


class Metaclass_FollowMeGetStatus_Event(type):
    """Metaclass of message 'FollowMeGetStatus_Event'."""

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
                'agenticros_msgs.srv.FollowMeGetStatus_Event')
            logger.debug(
                'Failed to import needed modules for type support:\n' +
                traceback.format_exc())
        else:
            cls._CREATE_ROS_MESSAGE = module.create_ros_message_msg__srv__follow_me_get_status__event
            cls._CONVERT_FROM_PY = module.convert_from_py_msg__srv__follow_me_get_status__event
            cls._CONVERT_TO_PY = module.convert_to_py_msg__srv__follow_me_get_status__event
            cls._TYPE_SUPPORT = module.type_support_msg__srv__follow_me_get_status__event
            cls._DESTROY_ROS_MESSAGE = module.destroy_ros_message_msg__srv__follow_me_get_status__event

            from service_msgs.msg import ServiceEventInfo
            if ServiceEventInfo.__class__._TYPE_SUPPORT is None:
                ServiceEventInfo.__class__.__import_type_support__()

    @classmethod
    def __prepare__(cls, name, bases, **kwargs):
        # list constant names here so that they appear in the help text of
        # the message class under "Data and other attributes defined here:"
        # as well as populate each message instance
        return {
        }


class FollowMeGetStatus_Event(metaclass=Metaclass_FollowMeGetStatus_Event):
    """Message class 'FollowMeGetStatus_Event'."""

    __slots__ = [
        '_info',
        '_request',
        '_response',
        '_check_fields',
    ]

    _fields_and_field_types = {
        'info': 'service_msgs/ServiceEventInfo',
        'request': 'sequence<agenticros_msgs/FollowMeGetStatus_Request, 1>',
        'response': 'sequence<agenticros_msgs/FollowMeGetStatus_Response, 1>',
    }

    # This attribute is used to store an rosidl_parser.definition variable
    # related to the data type of each of the components the message.
    SLOT_TYPES = (
        rosidl_parser.definition.NamespacedType(['service_msgs', 'msg'], 'ServiceEventInfo'),  # noqa: E501
        rosidl_parser.definition.BoundedSequence(rosidl_parser.definition.NamespacedType(['agenticros_msgs', 'srv'], 'FollowMeGetStatus_Request'), 1),  # noqa: E501
        rosidl_parser.definition.BoundedSequence(rosidl_parser.definition.NamespacedType(['agenticros_msgs', 'srv'], 'FollowMeGetStatus_Response'), 1),  # noqa: E501
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
        from service_msgs.msg import ServiceEventInfo
        self.info = kwargs.get('info', ServiceEventInfo())
        self.request = kwargs.get('request', [])
        self.response = kwargs.get('response', [])

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
        if self.info != other.info:
            return False
        if self.request != other.request:
            return False
        if self.response != other.response:
            return False
        return True

    @classmethod
    def get_fields_and_field_types(cls):
        from copy import copy
        return copy(cls._fields_and_field_types)

    @builtins.property
    def info(self):
        """Message field 'info'."""
        return self._info

    @info.setter
    def info(self, value):
        if self._check_fields:
            from service_msgs.msg import ServiceEventInfo
            assert \
                isinstance(value, ServiceEventInfo), \
                "The 'info' field must be a sub message of type 'ServiceEventInfo'"
        self._info = value

    @builtins.property
    def request(self):
        """Message field 'request'."""
        return self._request

    @request.setter
    def request(self, value):
        if self._check_fields:
            from agenticros_msgs.srv import FollowMeGetStatus_Request
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
                 len(value) <= 1 and
                 all(isinstance(v, FollowMeGetStatus_Request) for v in value) and
                 True), \
                "The 'request' field must be a set or sequence with length <= 1 and each value of type 'FollowMeGetStatus_Request'"
        self._request = value

    @builtins.property
    def response(self):
        """Message field 'response'."""
        return self._response

    @response.setter
    def response(self, value):
        if self._check_fields:
            from agenticros_msgs.srv import FollowMeGetStatus_Response
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
                 len(value) <= 1 and
                 all(isinstance(v, FollowMeGetStatus_Response) for v in value) and
                 True), \
                "The 'response' field must be a set or sequence with length <= 1 and each value of type 'FollowMeGetStatus_Response'"
        self._response = value


class Metaclass_FollowMeGetStatus(type):
    """Metaclass of service 'FollowMeGetStatus'."""

    _TYPE_SUPPORT = None

    @classmethod
    def __import_type_support__(cls):
        try:
            from rosidl_generator_py import import_type_support
            module = import_type_support('agenticros_msgs')
        except ImportError:
            import logging
            import traceback
            logger = logging.getLogger(
                'agenticros_msgs.srv.FollowMeGetStatus')
            logger.debug(
                'Failed to import needed modules for type support:\n' +
                traceback.format_exc())
        else:
            cls._TYPE_SUPPORT = module.type_support_srv__srv__follow_me_get_status

            from agenticros_msgs.srv import _follow_me_get_status
            if _follow_me_get_status.Metaclass_FollowMeGetStatus_Request._TYPE_SUPPORT is None:
                _follow_me_get_status.Metaclass_FollowMeGetStatus_Request.__import_type_support__()
            if _follow_me_get_status.Metaclass_FollowMeGetStatus_Response._TYPE_SUPPORT is None:
                _follow_me_get_status.Metaclass_FollowMeGetStatus_Response.__import_type_support__()
            if _follow_me_get_status.Metaclass_FollowMeGetStatus_Event._TYPE_SUPPORT is None:
                _follow_me_get_status.Metaclass_FollowMeGetStatus_Event.__import_type_support__()


class FollowMeGetStatus(metaclass=Metaclass_FollowMeGetStatus):
    from agenticros_msgs.srv._follow_me_get_status import FollowMeGetStatus_Request as Request
    from agenticros_msgs.srv._follow_me_get_status import FollowMeGetStatus_Response as Response
    from agenticros_msgs.srv._follow_me_get_status import FollowMeGetStatus_Event as Event

    def __init__(self):
        raise NotImplementedError('Service classes can not be instantiated')
