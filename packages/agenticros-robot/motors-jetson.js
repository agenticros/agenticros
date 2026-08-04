import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import { getRobotId, getApiToken } from './robot-config.js';
import { fetchRobotConfig, getCmdVelTopic } from './ros-topics.js';

var robotId = getRobotId();
var apiToken = getApiToken();
import * as gpio from './lib/jetson-gpio.js';

const rclnodejs = require('rclnodejs');

// BOARD pin numbers (40-pin Jetson header). Defaults are common GPIO pins on Orin Nano.
const pinsIndex = process.argv.indexOf('--pins');
let pinsValue;
let pins;
if (pinsIndex > -1) {
  pinsValue = process.argv[pinsIndex + 1];
  pins = pinsValue.split(',');
} else {
  pins = '16,18,22,26'.split(',');
}
console.log('Pins (BOARD):', `${pins}`);

const LEFT_MOTOR_PIN1 = Number(pins[0]);
const LEFT_MOTOR_PIN2 = Number(pins[1]);
const RIGHT_MOTOR_PIN1 = Number(pins[2]);
const RIGHT_MOTOR_PIN2 = Number(pins[3]);

gpio.init();
gpio.initOutput(LEFT_MOTOR_PIN1);
gpio.initOutput(LEFT_MOTOR_PIN2);
gpio.initOutput(RIGHT_MOTOR_PIN1);
gpio.initOutput(RIGHT_MOTOR_PIN2);
console.log('Jetson GPIO motors initialized (JETGPIO).');

function setMotorSpeed(pin1, pin2, speed) {
  // speed should be between -1 and 1 (same as motors-rpi5.js)
  if (speed > 0) {
    gpio.pwm(pin1, 200, speed * 100);
    gpio.pwm(pin2, 200, 0);
  } else {
    gpio.pwm(pin1, 200, 0);
    gpio.pwm(pin2, 200, Math.abs(speed * 100));
  }
}

function stopMotors() {
  gpio.pwm(LEFT_MOTOR_PIN1, 200, 0);
  gpio.pwm(LEFT_MOTOR_PIN2, 200, 0);
  gpio.pwm(RIGHT_MOTOR_PIN1, 200, 0);
  gpio.pwm(RIGHT_MOTOR_PIN2, 200, 0);
}

async function main() {
  const robotConfig = await fetchRobotConfig(robotId, apiToken);
  const cmdVelTopic = getCmdVelTopic(robotId, robotConfig);

  await rclnodejs.init();

  const node = new rclnodejs.Node('motor_controller');

  node.createSubscription('geometry_msgs/msg/Twist', cmdVelTopic, (msg) => {
    const linear_x = -msg.linear.x;
    const angular_z = msg.angular.z;

    let leftSpeed = linear_x - angular_z;
    let rightSpeed = linear_x + angular_z;

    leftSpeed = Math.max(-1, Math.min(1, leftSpeed));
    rightSpeed = Math.max(-1, Math.min(1, rightSpeed));

    leftSpeed = Number(leftSpeed.toFixed(2));
    rightSpeed = Number(rightSpeed.toFixed(2));

    setMotorSpeed(LEFT_MOTOR_PIN1, LEFT_MOTOR_PIN2, leftSpeed);
    setMotorSpeed(RIGHT_MOTOR_PIN1, RIGHT_MOTOR_PIN2, rightSpeed);
  });

  process.on('SIGINT', () => {
    console.log('Shutting down...');
    stopMotors();
    gpio.deinit();
    node.destroy();
    process.exit(0);
  });

  node.spin();
}

main().catch((err) => {
  console.error(err);
  try {
    stopMotors();
    gpio.deinit();
  } catch {
    // ignore cleanup errors
  }
  process.exit(1);
});
