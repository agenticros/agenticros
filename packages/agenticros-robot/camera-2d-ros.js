import {createRequire } from "module";
const require = createRequire(import.meta.url);

import { getRobotId, getApiToken } from './robot-config.js';
import { fetchRobotConfig, resolveTopic, getCmdVelTopic } from './ros-topics.js';

var robotId = getRobotId();
var apiToken = getApiToken();

const { exec, spawn } = require('child_process');
const rclnodejs = require('rclnodejs');
const fs = require('fs').promises;
const StreamSplitter = require('stream-split');  // Add this import
const ffmpeg = require('ffmpeg-static');
const JPEG_START = Buffer.from([0xff, 0xd8]);
const JPEG_END = Buffer.from([0xff, 0xd9]);

// Move cameraPub to top level scope
let cameraPub;
let webcam;

// Checks for --device and if it has a value
const deviceIndex = process.argv.indexOf('--device');
let deviceValue;
if (deviceIndex > -1) {
  deviceValue = process.argv[deviceIndex + 1];
}
let device = (deviceValue || '/dev/video0');
console.log('Device:', `${device}`);

// Checks for --resolution and if it has a value
const scaleIndex = process.argv.indexOf('--resolution');
let scaleValue;
if (scaleIndex > -1) {
  scaleValue = process.argv[scaleIndex + 1];
}
const resolution = (scaleValue || '672x672');
console.log('Resolution:', `${resolution}`);

// Checks for --fps and if it has a value
const fpsIndex = process.argv.indexOf('--fps');
let fpsValue;
if (fpsIndex > -1) {
  fpsValue = process.argv[fpsIndex + 1];
}
const fps = (fpsValue || 15);
console.log('FPS:', `${fps}`);

// Helper function to list available video devices
function listVideoDevices() {
    return new Promise((resolve, reject) => {
        exec('ls /dev/video*', (error, stdout, stderr) => {
            if (error) {
                console.warn('No video devices found in /dev/video*');
                resolve([]);
                return;
            }
            const devices = stdout.trim().split('\n');
            resolve(devices);
        });
    });
}

// Validate and initialize webcam
async function initializeWebcam() {
    const availableDevices = await listVideoDevices();
    console.log('Available video devices:', availableDevices);

    if (!availableDevices.includes(device)) {
        console.error(`Device ${device} not found. Available devices: ${availableDevices.join(', ')}`);
        if (availableDevices.length > 0) {
            console.log(`Falling back to ${availableDevices[0]}`);
            device = availableDevices[0];
        } else {
            throw new Error('No video devices available');
        }
    }

    // Validate ffmpeg availability
    if (!ffmpeg) {
        throw new Error('ffmpeg binary not found. Please install ffmpeg-static package.');
    }
    console.log('Using ffmpeg from:', ffmpeg);

    // Instead of creating NodeWebcam instance, we'll return the validated device
    return device;
}

// Replace the ROS initialization block with this version
async function initializeROS() {
    const robotConfig = await fetchRobotConfig(robotId, apiToken);
    const cameraTopic = resolveTopic('camera2d', robotId, robotConfig.rosNamespace);
    await rclnodejs.init();
    const node = new rclnodejs.Node('robotics_dev_camera_node');
    cameraPub = node.createPublisher('std_msgs/msg/String', cameraTopic);
    node.spin();
}

// Main execution
async function main() {
    try {
        await initializeROS();
        webcam = await initializeWebcam();
        await startStreaming(webcam);
    } catch (error) {
        console.error('Failed to initialize:', error);
        process.exit(1);
    }
}

// Start the application
main();

async function createVideoStream(device) {
    const args = [
        '-f', 'video4linux2',
        '-framerate', fps.toString(),
        '-video_size', resolution,
        '-i', device,
        '-f', 'mjpeg',  // Changed from image2pipe to mjpeg
        '-vf', 'format=yuvj420p',  // Ensure correct pixel format
        '-q:v', '2',  // Adjusted quality (1-31, lower is better)
        '-'  // Output to stdout
    ];

    try {
        const ffmpegProcess = spawn(ffmpeg, args);

        // Add immediate error handler for spawn issues
        ffmpegProcess.on('error', (error) => {
            console.error('Failed to start ffmpeg:', error);
            throw error;
        });

        // Add startup validation
        const startupPromise = new Promise((resolve, reject) => {
            let errorOutput = '';

            ffmpegProcess.stderr.once('data', (data) => {
                errorOutput += data.toString();
                if (errorOutput.includes('Server returned 404')) {
                    reject(new Error(`Device ${device} not accessible`));
                } else if (errorOutput.includes('Input/output error')) {
                    reject(new Error(`Cannot access ${device}. Check permissions.`));
                } else {
                    resolve(ffmpegProcess);
                }
            });

            // Timeout if no response
            setTimeout(() => reject(new Error('FFmpeg startup timeout')), 5000);
        });

        const splitter = new StreamSplitter(JPEG_END);
        let currentFrame = Buffer.from([]);

        ffmpegProcess.stderr.on('data', (data) => {
            console.log('ffmpeg:', data.toString());
        });

        splitter.on('data', (chunk) => {
            // Combine with JPEG_END that was removed by splitter
            const frame = Buffer.concat([chunk, JPEG_END]);
            if (frame[0] === JPEG_START[0] && frame[1] === JPEG_START[1]) {
                try {
                    const base64Data = frame.toString('base64');
                    cameraPub.publish(base64Data);
                } catch (error) {
                    console.error('Error publishing frame:', error);
                }
            }
        });

        ffmpegProcess.stdout.pipe(splitter);

        await startupPromise;
        return ffmpegProcess;
    } catch (error) {
        console.error('Video stream initialization failed:', error);
        throw error;
    }
}

async function startStreaming(device) {
    try {
        const stream = await createVideoStream(device);

        // Handle stream closure
        stream.on('close', (code) => {
            if (code !== 0) {
                console.error(`ffmpeg exited with code ${code}`);
                process.exit(1);
            }
        });

        // Handle stream errors
        stream.on('error', (error) => {
            console.error('Stream error:', error);
            process.exit(1);
        });

    } catch (error) {
        console.error('Failed to start video stream:', error);
        process.exit(1);
    }
}

// Enhanced shutdown handler
process.on('SIGINT', () => {
    console.log('\nGracefully shutting down...');
    process.exit(0);
});
