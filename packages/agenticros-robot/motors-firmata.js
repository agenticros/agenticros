import {createRequire } from "module";
const require = createRequire(import.meta.url);

import { getRobotId, getApiToken } from './robot-config.js';
import { fetchRobotConfig, getCmdVelTopic } from './ros-topics.js';

var robotId = getRobotId();
var apiToken = getApiToken();
import { Motor } from './lib/firmata-motor.js';

const rclnodejs = require('rclnodejs');
const Firmata = require('firmata');
const geometry_msgs = rclnodejs.require('geometry_msgs').msg;
const nav_msgs = rclnodejs.require('nav_msgs').msg;

// Odometry variables
let wheeltrack = 135; // Default value
let wheelradius = 32; // Default value (wheelDiameter/2)
let cmdVelTopic = '/cmd_vel';

// Fetch robot details
async function fetchRobotDetails() {
  try {
    const data = await fetchRobotConfig(robotId, apiToken);
    cmdVelTopic = getCmdVelTopic(robotId, data);
    console.log('Robot Details:', data);
    
    if (data.wheelBetween) {
      wheeltrack = data.wheelBetween;
    } else {
      console.error('Warning: wheelBetween not found in robot details, using default value');
    }

    if (data.wheelDiameter) {
      wheelradius = data.wheelDiameter / 2;
    } else {
      console.error('Warning: wheelDiameter not found in robot details, using default value');
    }
  } catch (error) {
    console.error('Error fetching robot details:', error);
  }
}

// Checks for --device and if it has a value
const deviceIndex = process.argv.indexOf('--device');
let deviceValue;
if (deviceIndex > -1) {
  deviceValue = process.argv[deviceIndex + 1];
}
const device = (deviceValue || '/dev/ttyACM0');
console.log('Device:', `${device}`);
const board = new Firmata(device);


// Parse command line arguments for pins
const pinsIndex = process.argv.indexOf('--pins');
let pinsValue;
let pins;
if (pinsIndex > -1) {
  pinsValue = process.argv[pinsIndex + 1];
  pins = (pinsValue.split(","))
} else {
  pins = "3,4,5,7,8,9".split(",");
}
console.log('Pins:', `${pins}`);

// Check for encoder pins
const epinsIndex = process.argv.indexOf('--encoderpins');
let epinsValue;
let epins;
if (epinsIndex > -1) {
  epinsValue = process.argv[epinsIndex + 1];
  epins = (epinsValue.split(","))
} else {
  epins = "13,2,12,11".split(",");
}
console.log('Encoder Pins:', `${epins}`);

// Initialize robot details
fetchRobotDetails().catch(console.error);

// Encoder pin configuration
// const LEFT_ENCODER_PIN1 = epins[0];
// const LEFT_ENCODER_PIN2 = epins[1];
// const RIGHT_ENCODER_PIN1 = epins[2];
// const RIGHT_ENCODER_PIN2 = epins[3];

// Motor pin configuration
const LEFT_MOTOR_PIN1 = pins[0];
const LEFT_MOTOR_PIN2 = pins[1];
const LEFT_MOTOR_PIN3 = pins[2];
const RIGHT_MOTOR_PIN1 = pins[3];
const RIGHT_MOTOR_PIN2 = pins[4];
const RIGHT_MOTOR_PIN3 = pins[5];

// Odometry variables
// let wheeltrack; // Will be set from API response
// let wheelradius; // Will be set from API response (wheelDiameter/2)
// let TPR = 351;
// let left_ticks = 0;
// let right_ticks = 0;
// let last_left_ticks = 0;
// let last_right_ticks = 0;

// let x = 0.0;
// let y = 0.0;
// let th = 0.0;

// let vx = 0.0;
// let vy = 0.0;
// let vth = 0.0;

// let current_time;
// let last_time;

board.on("ready", async () => {
  console.log('Board ready, initializing motors and encoders...');
  var motors;

  // Initialize ROS2
  await rclnodejs.init();
  const node = new rclnodejs.Node('motor_controller');
  // current_time = node.now();
  // last_time = current_time;

  console.log('Left motor pins:', LEFT_MOTOR_PIN1, LEFT_MOTOR_PIN2, LEFT_MOTOR_PIN3)
  console.log('Right motor pins:', RIGHT_MOTOR_PIN1, RIGHT_MOTOR_PIN2, RIGHT_MOTOR_PIN3)

  motors = {
    a: new Motor(board, {
      pins: {
        pwm: LEFT_MOTOR_PIN3,
        dir: LEFT_MOTOR_PIN1,
        cdir: LEFT_MOTOR_PIN2
      }
    }),
    b: new Motor(board, {
      pins: {
        pwm: RIGHT_MOTOR_PIN3,
        dir: RIGHT_MOTOR_PIN1,
        cdir: RIGHT_MOTOR_PIN2
      }
    })
  }

  console.log('Motors initialized.');

  // Setup encoders
  // five.Pin.prototype.setMaxListeners(20);

  // const leftEncoder = new five.Pin({
  //   pin: LEFT_ENCODER_PIN1,
  //   mode: five.Pin.INPUT,
  //   type: 'digital'
  // });

  // const leftDirection = new five.Pin({
  //   pin: LEFT_ENCODER_PIN2,
  //   mode: five.Pin.INPUT,
  //   type: 'digital'
  // });

  // const rightEncoder = new five.Pin({
  //   pin: RIGHT_ENCODER_PIN1,
  //   mode: five.Pin.INPUT,
  //   type: 'digital'
  // });

  // const rightDirection = new five.Pin({
  //   pin: RIGHT_ENCODER_PIN2,
  //   mode: five.Pin.INPUT,
  //   type: 'digital'
  // });

  // let leftLastState = 0;
  // let rightLastState = 0;

  // // Set up polling for encoder states
  // const pollInterval = setInterval(() => {
  //   const leftState = leftEncoder.value;
  //   const leftDirState = leftDirection.value;

  //   if (leftState !== leftLastState) {
  //     if (leftDirState !== leftState) {
  //       left_ticks -= 1;
  //     } else {
  //       left_ticks += 1;
  //     }
  //     //console.log('Left Position:', left_ticks);
  //   }
  //   leftLastState = leftState;

  //   const rightState = rightEncoder.value;
  //   const rightDirState = rightDirection.value;

  //   if (rightState !== rightLastState) {
  //     if (rightDirState !== rightState) {
  //       right_ticks += 1;
  //     } else {
  //       right_ticks -= 1;
  //     }
  //     //console.log('Right Position:', right_ticks);
  //   }
  //   rightLastState = rightState;
  // }, 10);

  // // Clean up on board close
  // board.on('close', () => {
  //   clearInterval(pollInterval);
  //   leftEncoder.removeAllListeners();
  //   rightEncoder.removeAllListeners();
  //   leftDirection.removeAllListeners();
  //   rightDirection.removeAllListeners();
  //   console.log('Board connection closed, cleaning up...');
  // });

  // // Initialize pin values
  // leftEncoder.query(() => {});
  // rightEncoder.query(() => {});
  // leftDirection.query(() => {});
  // rightDirection.query(() => {});

  // Motor control functions
  function setMotorSpeed(motor, speed) {
      // speed should be between -255 and 255
      const absSpeed = Math.min(255, Math.max(0, Math.round(Math.abs(speed))));
      //console.log('Setting motor speed:', speed, 'abs:', absSpeed);

      try {
          if (speed > 0) {
              //console.log('Forward at', absSpeed);
              motor.forward(absSpeed);
          } else if (speed < 0) {
              //console.log('Reverse at', absSpeed);
              motor.reverse(absSpeed);
          } else {
              //console.log('Stop');
              motor.stop();
          }
      } catch (error) {
          console.error('Error setting motor speed:', error);
      }
  }

  function stopMotors() {
      motors.a.stop();
      motors.b.stop();
  }

// ROS2 Node
// function quaternionFromEuler(roll, pitch, yaw) {
//     const cy = Math.cos(yaw * 0.5);
//     const sy = Math.sin(yaw * 0.5);
//     const cr = Math.cos(roll * 0.5);
//     const sr = Math.sin(roll * 0.5);
//     const cp = Math.cos(pitch * 0.5);
//     const sp = Math.sin(pitch * 0.5);

//     const q = new geometry_msgs.Quaternion();
//     q.w = cy * cr * cp + sy * sr * sp;
//     q.x = cy * sr * cp - sy * cr * sp;
//     q.y = cy * cr * sp + sy * sr * cp;
//     q.z = sy * cr * cp - cy * sr * sp;

//     return q;
// }

// function updateOdometry(node) {
//     current_time = node.now();

//     const delta_L = left_ticks - last_left_ticks;
//     const delta_R = right_ticks - last_right_ticks;
//     const dl = 2 * Math.PI * wheelradius * delta_L / TPR;
//     const dr = 2 * Math.PI * wheelradius * delta_R / TPR;
//     const dc = (dl + dr) / 2;
//     const dt = (current_time.nanoseconds - last_time.nanoseconds) / 1e9;
//     const dth = (dr - dl) / wheeltrack;

//     let dx, dy;
//     if (dr === dl) {
//         dx = dr * Math.cos(th);
//         dy = dr * Math.sin(th);
//     } else {
//         const radius = dc / dth;
//         const iccX = x - radius * Math.sin(th);
//         const iccY = y + radius * Math.cos(th);

//         dx = Math.cos(dth) * (x - iccX) - Math.sin(dth) * (y - iccY) + iccX - x;
//         dy = Math.sin(dth) * (x - iccX) + Math.cos(dth) * (y - iccY) + iccY - y;
//     }

//     x += dx;
//     y += dy;
//     th = (th + dth) % (2 * Math.PI);

//     const odom_quat = quaternionFromEuler(0, 0, th);

//     // Create odometry message
//     const odom = new nav_msgs.Odometry();
//     odom.header.stamp = current_time;
//     odom.header.frame_id = 'odom';
//     odom.pose.pose.position.x = x;
//     odom.pose.pose.position.y = y;
//     odom.pose.pose.position.z = 0.0;
//     odom.pose.pose.orientation = odom_quat;

//     if (dt > 0) {
//         vx = dx / dt;
//         vy = dy / dt;
//         vth = dth / dt;
//     }

//     odom.child_frame_id = 'base_link';
//     odom.twist.twist.linear.x = vx;
//     odom.twist.twist.linear.y = vy;
//     odom.twist.twist.linear.z = 0.0;
//     odom.twist.twist.angular.x = 0.0;
//     odom.twist.twist.angular.y = 0.0;
//     odom.twist.twist.angular.z = vth;

//     return odom;
// }

function initROS(node) {

    // Create odometry publisher
    // const odomPublisher = node.createPublisher('nav_msgs/msg/Odometry', `robot${robotId.replace(/-/g, "")}/odom`, {qos: 50});

    // Subscribe to cmd_vel topic
    node.createSubscription('geometry_msgs/msg/Twist', cmdVelTopic, (msg) => {
        // Update and publish odometry
        // const odom = updateOdometry(node);
        // odomPublisher.publish(odom);

        // last_left_ticks = left_ticks;
        // last_right_ticks = right_ticks;
        // last_time = current_time;
        //console.log('Received cmd_vel:', msg);
        const linear_x = -msg.linear.x;  // Forward/backward motion (inverted)
        const angular_z = -msg.angular.z; // Rotation (inverted)
        //console.log('Processed values - linear_x:', linear_x, 'angular_z:', angular_z);

        // Convert twist to motor speeds (range -255 to 255)
        let leftSpeed = (linear_x - angular_z) * 255;  // Left motor
        let rightSpeed = (linear_x + angular_z) * 255;  // Right motor

        // Ensure speeds are whole numbers between -255 and 255
        leftSpeed = Math.round(Math.max(-255, Math.min(255, leftSpeed)));
        rightSpeed = Math.round(Math.max(-255, Math.min(255, rightSpeed)));

        //console.log('Calculated speeds - left:', leftSpeed, 'right:', rightSpeed);

        // Verify motors object exists
        if (!motors || !motors.a || !motors.b) {
            console.error('Motors not properly initialized!');
            return;
        }

        // Set motor speeds
        setMotorSpeed(motors.a, leftSpeed);
        setMotorSpeed(motors.b, rightSpeed);
    });

    // Handle shutdown
    process.on('SIGINT', () => {
        console.log('Shutting down...');
        stopMotors();
        node.destroy();
        process.exit(0);
    });

    node.spin();
}

initROS(node);

});
