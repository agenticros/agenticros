import {createRequire } from "module";
const require = createRequire(import.meta.url);

import { getRobotId, getApiToken } from './robot-config.js';
import { fetchRobotConfig, getCmdVelTopic } from './ros-topics.js';

var robotId = getRobotId();
var apiToken = getApiToken();

const rclnodejs = require('rclnodejs');
const gpio = require('@iiot2k/gpiox');

// Checks for --pins and if it has a value
const pinsIndex = process.argv.indexOf('--pins');
let pinsValue;
let pins;
if (pinsIndex > -1) {
  pinsValue = process.argv[pinsIndex + 1];
  pins = (pinsValue.split(","))
} else {
  pins = "27,22,17,18".split(",");
}
console.log('Pins:', `${pins}`);

// Motor pin configuration
const LEFT_MOTOR_PIN1 = pins[0];
const LEFT_MOTOR_PIN2 = pins[1];
const RIGHT_MOTOR_PIN1 = pins[2];
const RIGHT_MOTOR_PIN2 = pins[3];

// Initialize GPIO pins
gpio.init_gpio(LEFT_MOTOR_PIN1, gpio.GPIO_MODE_OUTPUT, 0);
gpio.init_gpio(LEFT_MOTOR_PIN2, gpio.GPIO_MODE_OUTPUT, 0);
gpio.init_gpio(RIGHT_MOTOR_PIN1, gpio.GPIO_MODE_OUTPUT, 0);
gpio.init_gpio(RIGHT_MOTOR_PIN2, gpio.GPIO_MODE_OUTPUT, 0);

// Motor control functions
function setMotorSpeed(pin1, pin2, speed) {
    // speed should be between -100 and 100
    if (speed > 0) {
        gpio.pwm_gpio(pin1, 200, speed*100);
        gpio.pwm_gpio(pin2, 200, 0);
    } else {
        gpio.pwm_gpio(pin1, 200, 0);
        gpio.pwm_gpio(pin2, 200, Math.abs(speed*100));
    }
}

function stopMotors() {
    gpio.pwm_gpio(LEFT_MOTOR_PIN1, 200, 0);
    gpio.pwm_gpio(LEFT_MOTOR_PIN2, 200, 0);
    gpio.pwm_gpio(RIGHT_MOTOR_PIN1, 200, 0);
    gpio.pwm_gpio(RIGHT_MOTOR_PIN2, 200, 0);
}

// ROS2 Node
async function main() {
    const robotConfig = await fetchRobotConfig(robotId, apiToken);
    const cmdVelTopic = getCmdVelTopic(robotId, robotConfig);

    await rclnodejs.init();

    const node = new rclnodejs.Node('motor_controller');

    // Subscribe to cmd_vel topic
    node.createSubscription('geometry_msgs/msg/Twist', cmdVelTopic, (msg) => {
        const linear_x = -msg.linear.x;  // Forward/backward motion (inverted)
        const angular_z = msg.angular.z; // Rotation

        // Convert twist to motor speeds (range -1 to 1)
        let leftSpeed = linear_x - angular_z;
        let rightSpeed = linear_x + angular_z;

        // Clamp values between -1 and 1
        leftSpeed = Math.max(-1, Math.min(1, leftSpeed));
        rightSpeed = Math.max(-1, Math.min(1, rightSpeed));

        // Truncate to 2 decimal places
        leftSpeed = Number(leftSpeed.toFixed(2));
        rightSpeed = Number(rightSpeed.toFixed(2));

        //console.log("leftspeed", leftSpeed)
        //console.log("rightspeed", rightSpeed)

        // Set motor speeds
        setMotorSpeed(LEFT_MOTOR_PIN1, LEFT_MOTOR_PIN2, leftSpeed);
        setMotorSpeed(RIGHT_MOTOR_PIN1, RIGHT_MOTOR_PIN2, rightSpeed);
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

main().catch(console.error);
