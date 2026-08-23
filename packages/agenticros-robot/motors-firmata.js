import { createRequire } from "module";
const require = createRequire(import.meta.url);

import { getRobotId, getApiToken } from './robot-config.js';
import { fetchRobotConfig, getCmdVelTopic, resolveTopic } from './ros-topics.js';
import { createOdometry, resolveOdomSetup } from './lib/odometry.js';
import { startFirmataEncoderPoller } from './lib/firmata-encoders.js';
import { Motor } from './lib/firmata-motor.js';

var robotId = getRobotId();
var apiToken = getApiToken();

const rclnodejs = require('rclnodejs');
const Firmata = require('firmata');

const configPromise = fetchRobotConfig(robotId, apiToken);

const deviceIndex = process.argv.indexOf('--device');
let deviceValue;
if (deviceIndex > -1) {
  deviceValue = process.argv[deviceIndex + 1];
}
const device = (deviceValue || '/dev/ttyACM0');
console.log('Device:', `${device}`);
const board = new Firmata(device);

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

const LEFT_MOTOR_PIN1 = pins[0];
const LEFT_MOTOR_PIN2 = pins[1];
const LEFT_MOTOR_PIN3 = pins[2];
const RIGHT_MOTOR_PIN1 = pins[3];
const RIGHT_MOTOR_PIN2 = pins[4];
const RIGHT_MOTOR_PIN3 = pins[5];

board.on("ready", async () => {
  console.log('Board ready, initializing motors...');
  const robotConfig = await configPromise;
  const cmdVelTopic = getCmdVelTopic(robotId, robotConfig);
  console.log('Robot Details:', robotConfig);

  await rclnodejs.init();
  const node = new rclnodejs.Node('motor_controller');

  console.log('Left motor pins:', LEFT_MOTOR_PIN1, LEFT_MOTOR_PIN2, LEFT_MOTOR_PIN3)
  console.log('Right motor pins:', RIGHT_MOTOR_PIN1, RIGHT_MOTOR_PIN2, RIGHT_MOTOR_PIN3)

  const motors = {
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

  const odomSetup = resolveOdomSetup({ config: robotConfig, argv: process.argv });
  let odom = null;
  let stopEncoders = null;
  if (odomSetup.enabled) {
    const odomTopic = resolveTopic('odom', robotId, robotConfig.rosNamespace);
    odom = createOdometry({
      node,
      odomTopic,
      kinematics: odomSetup.kinematics,
      mode: odomSetup.mode,
    });
    odom.start();
    console.log(`Odometry: ${odomSetup.mode} → ${odomTopic}`);
    if (odomSetup.mode === 'encoder' && odomSetup.encoderPins?.length >= 4) {
      stopEncoders = startFirmataEncoderPoller(board, odomSetup.encoderPins, odom);
      console.log('Encoder pins:', odomSetup.encoderPins.join(','));
    }
  }

  function setMotorSpeed(motor, speed) {
      const absSpeed = Math.min(255, Math.max(0, Math.round(Math.abs(speed))));

      try {
          if (speed > 0) {
              motor.forward(absSpeed);
          } else if (speed < 0) {
              motor.reverse(absSpeed);
          } else {
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

  node.createSubscription('geometry_msgs/msg/Twist', cmdVelTopic, (msg) => {
        odom?.setCmdVel(msg.linear.x, msg.angular.z);

        const linear_x = -msg.linear.x;  // Forward/backward motion (inverted)
        const angular_z = -msg.angular.z; // Rotation (inverted)

        let leftSpeed = (linear_x - angular_z) * 255;
        let rightSpeed = (linear_x + angular_z) * 255;

        leftSpeed = Math.round(Math.max(-255, Math.min(255, leftSpeed)));
        rightSpeed = Math.round(Math.max(-255, Math.min(255, rightSpeed)));

        if (!motors || !motors.a || !motors.b) {
            console.error('Motors not properly initialized!');
            return;
        }

        setMotorSpeed(motors.a, leftSpeed);
        setMotorSpeed(motors.b, rightSpeed);
    });

  process.on('SIGINT', () => {
        console.log('Shutting down...');
        stopEncoders?.();
        odom?.stop();
        stopMotors();
        node.destroy();
        process.exit(0);
    });

  node.spin();
});
