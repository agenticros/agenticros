process.on('uncaughtException', (err) => {
    console.error('An uncaught exception occurred:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection:', reason);
});

/**
 * NON-QUEUING MESSAGE SYSTEM
 * 
 * This implementation eliminates message queuing to reduce latency and ensure
 * only the most current ROS messages are sent. Key improvements:
 * 
 * 1. No Message Queuing: ROS messages are not queued - only the latest message
 *    for each topic is kept and sent immediately
 * 2. Priority System: High-priority topics (camera, odometry, cmd_vel) are sent
 *    immediately, while lower-priority topics have a minimal delay
 * 3. Immediate Sending: Messages are sent as soon as they arrive, not batched
 * 4. Memory Management: Stale pending messages are automatically cleaned up
 * 5. Performance Monitoring: Optional logging of message frequencies
 * 
 * Configuration options in messageConfig:
 * - enableNonQueuing: Enable/disable the new system
 * - highPriorityTopics: List of topics to prioritize
 * - pendingMessageTimeout: Timeout for stale messages (ms)
 * - lowPriorityDelay: Delay for low priority messages (ms)
 * - performanceLogging: Enable performance metrics
 */

// Add memory monitoring
let memoryCheckInterval;
function startMemoryMonitoring() {
    memoryCheckInterval = setInterval(() => {
        const memUsage = process.memoryUsage();
        const memUsageMB = {
            rss: Math.round(memUsage.rss / 1024 / 1024),
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
            external: Math.round(memUsage.external / 1024 / 1024)
        };
        
        console.log(formatLog(`Memory usage: RSS=${memUsageMB.rss}MB, Heap=${memUsageMB.heapUsed}MB/${memUsageMB.heapTotal}MB, External=${memUsageMB.external}MB`));
        
        // Force garbage collection if memory usage is high
        if (memUsageMB.heapUsed > 500) { // 500MB threshold
            console.log(formatLog('High memory usage detected, forcing garbage collection'));
            if (global.gc) {
                global.gc();
            }
        }
    }, 30000); // Check every 30 seconds
}

// Global storage for latest camera data (independent of P2P connections)
const globalCameraData = new Map(); // topic -> { data: base64, timestamp: Date.now() }

// Cleanup old camera data periodically
setInterval(() => {
    const now = Date.now();
    let cleanedCount = 0;
    for (const [topic, data] of globalCameraData.entries()) {
        if (now - data.timestamp > 10000) { // Remove data older than 10 seconds
            globalCameraData.delete(topic);
            cleanedCount++;
        }
    }
    if (cleanedCount > 0) {
        console.log(formatLog(`🧹 Cleaned up ${cleanedCount} old camera data entries`));
    }
}, 30000); // Check every 30 seconds

function stopMemoryMonitoring() {
    if (memoryCheckInterval) {
        clearInterval(memoryCheckInterval);
        memoryCheckInterval = null;
    }
}

import {createRequire } from "module";
const require = createRequire(import.meta.url);

import { getRobotId, getApiToken } from './robot-config.js';
import { fetchRobotConfig, resolveTopic, toClientTopic, getCmdVelTopic, fetchIceServers } from './ros-topics.js';

const robotId = getRobotId();
const apiToken = getApiToken();

const { exec, execFile } = require('child_process');

/** Fast in-process status for remote CLI — avoids spawning `agenticros` under camera load. */
const REMOTE_STATUS_HW = [
  { name: 'comms', pattern: 'comms.js' },
  { name: 'motors', pattern: 'motors-' },
  { name: 'camera2d', pattern: 'camera-2d-ros.js' },
  { name: 'realsense', pattern: 'realsense2_camera_node' },
];

function pgrepFirst(pattern) {
  return new Promise((resolve) => {
    execFile('pgrep', ['-f', pattern], { timeout: 2000 }, (err, stdout) => {
      if (err || !stdout || !String(stdout).trim()) {
        resolve({ running: false, pid: undefined });
        return;
      }
      const pid = Number.parseInt(String(stdout).trim().split('\n')[0], 10);
      resolve({
        running: true,
        pid: Number.isFinite(pid) ? pid : undefined,
      });
    });
  });
}

async function buildInlineStatusJson() {
  const hardware = [];
  for (const hw of REMOTE_STATUS_HW) {
    const result = await pgrepFirst(hw.pattern);
    hardware.push({ name: hw.name, running: result.running, pid: result.pid });
  }
  let openclawGatewayActive = false;
  try {
    openclawGatewayActive = await new Promise((resolve) => {
      execFile(
        'systemctl',
        ['--user', 'is-active', 'openclaw-gateway.service'],
        { timeout: 1500 },
        (err, stdout) => {
          resolve(!err && String(stdout || '').trim() === 'active');
        },
      );
    });
  } catch {
    openclawGatewayActive = false;
  }
  return {
    components: [],
    hardware,
    openclawGatewayActive,
    source: 'comms-inline',
    commsPath: __filename,
  };
}
const rclnodejs = require('rclnodejs');
const sharp = require('sharp');

var velocityPub;
var firstRun = true;

// Checks for --server and if it has a value
const serverIndex = process.argv.indexOf('--server');
let serverValue;
if (serverIndex > -1) {
  serverValue = process.argv[serverIndex + 1];
  if(!serverValue.startsWith('ws')){
    serverValue = 'ws://' + serverValue
  }
}
const serverUrl = (serverValue || 'wss://cloud.agenticros.com');
console.log('Server:', `${serverUrl}`);
//const socket = io('http://192.168.0.6:3001');
//const socket = io('https://cloud.agenticros.com');
// const socket = io(server);

const nodeDataChannel = require('node-datachannel');
const io = require('socket.io-client');
const http = require('http');
const { v4: uuidv4 } = require('uuid');

const PEER_ID = 'peer2'; // Always responder

// node-datachannel specific configuration
const config = {
    iceServers: [
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
        'stun:stun3.l.google.com:19302',
        'stun:stun4.l.google.com:19302'
    ],
    maxMessageSize: 16000,
    enableIceTcp: true,
    portRangeBegin: 5000,
    portRangeEnd: 6000,
    numDataChannels: 10  // Reduced back to 10 for better stability
};

// NEW: Non-queuing message system configuration
const messageConfig = {
    enableNonQueuing: true,        // RE-ENABLED with improvements
    highPriorityTopics: [
        '/camera2d', 
        '/camera/camera/color/image_raw',
        '/camera/camera/color/image_raw/compressed',
        '/camera/camera/depth/image_rect_raw/compressedDepth', 
        '/odom', 
        'cmd_vel'
    ], // Topics to prioritize for faster sending
    pendingMessageTimeout: 2000,   // Reduced timeout for faster cleanup (ms)
    lowPriorityDelay: 5,           // 5ms delay for low priority messages to allow high priority messages first
    performanceLogging: false      // Disable performance logging to reduce overhead
};

// Validate configuration before creating connection
if (!config.iceServers || !config.iceServers.length) {
    throw new Error('Invalid ICE server configuration');
}

// Fetch robot details
var rosTopics = [];
var rosNamespace = false;
var cmdVel = '/cmd_vel';
var camera2dTopic = '/camera2d';
var odomTopic = '/odom';

const portalServer = serverUrl.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://').replace(/\/$/, '');
let activeIceServers = config.iceServers;

async function loadRobotDetails() {
  const robotConfig = await fetchRobotConfig(robotId, apiToken, portalServer);
  rosNamespace = robotConfig.rosNamespace;
  cmdVel = getCmdVelTopic(robotId, robotConfig);
  camera2dTopic = resolveTopic('camera2d', robotId, rosNamespace);
  odomTopic = resolveTopic('odom', robotId, rosNamespace);
  rosTopics = robotConfig.rosTopics ? [...robotConfig.rosTopics] : [];

  const hasCamera2d = rosTopics.some(t => t.topic === camera2dTopic);
  if (!hasCamera2d) {
    rosTopics.push({ type: 'std_msgs/msg/String', topic: camera2dTopic });
  }

  // Teleop always needs RealSense color compressed — portal configs often omit it.
  const hasColorCompressed = rosTopics.some(
    (t) => t.topic === '/camera/camera/color/image_raw/compressed' ||
           t.topic?.endsWith('/camera/color/image_raw/compressed')
  );
  if (!hasColorCompressed) {
    rosTopics.push({
      type: 'sensor_msgs/msg/CompressedImage',
      topic: '/camera/camera/color/image_raw/compressed',
    });
  }

  activeIceServers = await fetchIceServers(apiToken, portalServer);
}

// Add ROS_TOPICS=[{"type":"nav_msgs/msg/Odometry","topic":"/odom"}] to ~/robotics.env file
await loadRobotDetails();

//speak("Initializing robot.");
function speak(msg){
	exec(`espeak "${msg}"`)
}

function checkServerStatus() {
    return new Promise((resolve, reject) => {
        var uptimeUrl;
        uptimeUrl = serverUrl.replace('wss://', 'https://');
        uptimeUrl = serverUrl.replace('ws://', 'http://');
        const request = http.get(uptimeUrl, (response) => {
            if (response.statusCode === 200) {
                resolve(true);
            } else {
                reject(new Error(`Unexpected status code: ${response.statusCode}`));
            }
        }).on('error', () => {
            reject(new Error('Signaling server is not running. Please start it first with:\n\nnode signaling-server.js'));
        });

        request.setTimeout(5000, () => {
            request.destroy();
            reject(new Error('Server check timed out'));
        });
    });
}

function formatLog(message) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] ${message}`;
}

// When stdout is redirected to a file (agenticros connect), Node block-buffers
// console.log so boot lines can stay invisible in /tmp/agenticros-comms.log.
// Force synchronous line writes for operational logs.
(function patchConsoleForFileLogs() {
    const fs = require('fs');
    const formatArgs = (args) =>
        args
            .map((a) => {
                if (typeof a === 'string') return a;
                try {
                    return JSON.stringify(a);
                } catch {
                    return String(a);
                }
            })
            .join(' ');
    console.log = (...args) => {
        try {
            fs.writeSync(1, `${formatArgs(args)}\n`);
        } catch {
            /* ignore */
        }
    };
    console.warn = (...args) => {
        try {
            fs.writeSync(2, `${formatArgs(args)}\n`);
        } catch {
            /* ignore */
        }
    };
    console.error = (...args) => {
        try {
            fs.writeSync(2, `${formatArgs(args)}\n`);
        } catch {
            /* ignore */
        }
    };
})();

let rosNode; // Add this at the top level with other global variables

class P2PServer {
    constructor() {
        this.connections = new Map();
        this.socket = null;
        this.serverId = robotId;
        this.isReconnecting = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = Infinity;
        this.reconnectDelay = 2000;
        this.nextReconnectAt = 0; // honor server cooldown / retryAfter
        this.pendingReconnections = new Map();
        this.connectionAttempts = new Map(); // Track connection attempts per peer
        
        // Initialize ROS camera subscriptions immediately
        this.initStandaloneRosCameraSubscriptions();
    }

    async start() {
        console.log(formatLog('Starting P2P server...'));
        console.log(formatLog(`comms.js path: ${__filename}`));
        console.log(formatLog(`inline status: ${typeof buildInlineStatusJson === 'function' ? 'yes' : 'no'}`));
        await this.connect();

        // Slow watchdog only — socket.io + handleReconnect do the real work.
        // A 2s poll previously caused reconnect storms against ARC cooldowns.
        setInterval(() => {
            if (this.socket?.connected || this.isReconnecting) return;
            if (Date.now() < this.nextReconnectAt) return;
            console.log(formatLog('Server disconnected (watchdog), attempting to reconnect...'));
            this.handleReconnect();
        }, 15000);
    }

    // Initialize ROS camera subscriptions independently of P2P connections
    async initStandaloneRosCameraSubscriptions() {
        try {
            console.log(formatLog('Initializing standalone ROS camera subscriptions...'));
            
            // Initialize RCL if not already done
            if (!rosNode) {
                console.log(formatLog('Initializing RCL for standalone camera subscriptions...'));
                await rclnodejs.init();
                rosNode = new rclnodejs.Node('robotics_dev_node');
                velocityPub = rosNode.createPublisher('geometry_msgs/msg/Twist', `${cmdVel}`);
                console.log(formatLog('ROS node created for standalone camera subscriptions'));
            }

            // Prefer compressed JPEG only — never subscribe to raw image_raw here.
            // Store JPEG bytes as-is (no Sharp) and throttle so photo/status RPCs
            // are not starved by a 30fps encode loop.
            const cameraTopics = [
                { topic: camera2dTopic, type: 'std_msgs/msg/String' },
                { topic: '/camera/camera/color/image_raw/compressed', type: 'sensor_msgs/msg/CompressedImage' }
            ];

            console.log(formatLog('Setting up standalone camera subscriptions...'));
            console.log(formatLog(`comms.js path: ${__filename}`));
            this._lastStandaloneCameraLog = 0;
            this._lastStandaloneStoreAt = 0;
            
            cameraTopics.forEach(({ topic, type }) => {
                try {
                    console.log(formatLog(`Setting up standalone subscription for ${topic} with type ${type}`));
                    
                    const subscriber = rosNode.createSubscription(type, topic, (msg) => {
                        const now = Date.now();
                        // Keep at most ~2 FPS in globalCameraData for photo/teleop bridge.
                        if (now - (this._lastStandaloneStoreAt || 0) < 500) return;
                        this._lastStandaloneStoreAt = now;

                        const shouldLog = now - (this._lastStandaloneCameraLog || 0) > 5000;
                        if (shouldLog) {
                            this._lastStandaloneCameraLog = now;
                            console.log(formatLog(`📸 Standalone ROS camera message received on topic: ${topic}`));
                        }
                        
                        try {
                            let modTopic = toClientTopic(topic, robotId, rosNamespace);

                            if (topic === '/camera/camera/color/image_raw/compressed') {
                                try {
                                    const imageData = msg.data || msg;
                                    // Already JPEG — do not Sharp re-encode (starves bash-script / status).
                                    const base64Image = Buffer.isBuffer(imageData)
                                        ? imageData.toString('base64')
                                        : Buffer.from(imageData).toString('base64');
                                    if (shouldLog) {
                                        console.log(formatLog(`💾 Stored standalone compressed JPEG (${base64Image.length} chars b64)`));
                                    }

                                    globalCameraData.set(modTopic, {
                                        data: base64Image,
                                        timestamp: now
                                    });
                                    // Also alias under the raw topic name so photo-request lookups still work
                                    const rawAlias = toClientTopic('/camera/camera/color/image_raw', robotId, rosNamespace);
                                    globalCameraData.set(rawAlias, {
                                        data: base64Image,
                                        timestamp: now
                                    });
                                } catch (error) {
                                    console.error(formatLog(`Error in standalone image conversion: ${error}`));
                                }
                            } else if (topic === camera2dTopic) {
                                // Handle camera2d topic (already base64)
                                if (msg && typeof msg === 'string' && msg.length > 100) {
                                    globalCameraData.set(modTopic, {
                                        data: msg,
                                        timestamp: now
                                    });
                                    if (shouldLog) {
                                        console.log(formatLog(`💾 Stored standalone camera2d data (${msg.length} chars)`));
                                    }
                                }
                            }
                        } catch (error) {
                            console.error(formatLog(`Error processing standalone camera message: ${error}`));
                        }
                    });
                    
                    // Store subscriber for cleanup
                    if (!this.standaloneSubscribers) {
                        this.standaloneSubscribers = [];
                    }
                    this.standaloneSubscribers.push(subscriber);
                    
                    console.log(formatLog(`✅ Successfully set up standalone subscription for ${topic}`));
                } catch (err) {
                    console.error(formatLog(`Error setting up standalone subscription for ${topic}: ${err}`));
                }
            });

            // Start ROS node spin if not already running
            if (rosNode && !rosNode.isSpinning) {
                console.log(formatLog('Starting standalone ROS node spin...'));
                rosNode.spin();
                console.log(formatLog('Standalone ROS node is now running'));
            }
            
        } catch (error) {
            console.error(formatLog(`Error initializing standalone ROS camera subscriptions: ${error}`));
        }
    }

    async connect() {
        if (this.isReconnecting) return;
        if (this.socket?.connected) return;
        if (Date.now() < this.nextReconnectAt) {
            console.log(formatLog(`Skipping connect — cooldown until ${new Date(this.nextReconnectAt).toISOString()}`));
            return;
        }
        this.isReconnecting = true;

        try {
            if (this.socket) {
                this.socket.removeAllListeners();
                this.socket.disconnect();
            }

            this.socket = io(serverUrl, {
                query: {
                    id: this.serverId,
                    robot: robotId,
                    token: apiToken
                },
                auth: { id: this.serverId },
                // Manual reconnect only — built-in + custom + watchdog used to storm ARC.
                reconnection: false,
                timeout: 20000
            });

            this.socket.on('connect', () => {
                console.log(formatLog(`Connected to signaling server: ${this.socket.id}`));
                speak("Robot connected.");
                this.reconnectAttempts = 0;
                this.reconnectDelay = 2000;
                this.nextReconnectAt = 0;

                loadRobotDetails().catch(err => {
                    console.error('Error refreshing robot config on connect:', err);
                });
                
                // Notify server about existing connections
                this.connections.forEach((connection, peerId) => {
                    if (connection.connectionState === 'connected') {
                        this.socket.emit('peer-status', {
                            peerId: peerId,
                            status: 'connected'
                        });
                    }
                });
                
                // Process any queued signals for all connections
                this.connections.forEach(connection => {
                    connection.processQueuedSignals();
                });

                // Process any pending reconnections
                this.pendingReconnections.forEach((timestamp, peerId) => {
                    if (Date.now() - timestamp < 30000) {
                        this.socket.emit('peer-reconnect', { peerId });
                    }
                });
                this.pendingReconnections.clear();
            });

            this.socket.on('signal', async (message) => {
                try {
                    const sourcePeer = message.sourcePeer ||
                        (message.auth && message.auth.id);

                    if (!sourcePeer) {
                        console.error(formatLog('Missing source peer ID'));
                        return;
                    }

                    const msgType = String(message.type || '').toLowerCase();
                    console.log(formatLog(`Received ${msgType} from ${sourcePeer}`));

                    // Every browser offer must get a fresh PeerConnection. Reusing a
                    // failed/closed PC (or one mid robot-side reconnect) yields no answer.
                    // Also tear down *all* other peers — teleop is single-client; zombies
                    // from a previous browser session block answers on Nano.
                    if (msgType === 'offer') {
                        for (const [peerId, conn] of [...this.connections.entries()]) {
                            console.log(formatLog(`Clearing peer ${peerId} before new offer from ${sourcePeer}`));
                            try { conn.cleanup(); } catch (e) {
                                console.warn(formatLog(`Error cleaning connection ${peerId}: ${e.message}`));
                            }
                            this.connections.delete(peerId);
                            this.connectionAttempts.delete(peerId);
                        }
                        console.log(formatLog(`Creating new connection for peer: ${sourcePeer}`));
                        const connection = new P2PConnection(sourcePeer, this.socket);
                        if (!connection.pc) {
                            console.error(formatLog(`Failed to create PeerConnection for ${sourcePeer}`));
                            return;
                        }
                        this.connections.set(sourcePeer, connection);
                        this.connectionAttempts.set(sourcePeer, 0);

                        // Let the browser know the robot is handling the offer (vs silent drop)
                        try {
                            this.socket.emit('signal-status', {
                                type: 'offer-received',
                                sourcePeer,
                                ok: true,
                            });
                        } catch (_) { /* ignore */ }
                    } else if (!this.connections.has(sourcePeer)) {
                        console.log(formatLog(`Creating new connection for peer: ${sourcePeer}`));
                        const connection = new P2PConnection(sourcePeer, this.socket);
                        this.connections.set(sourcePeer, connection);
                        this.connectionAttempts.set(sourcePeer, 0);
                    }

                    message.type = msgType;
                    await this.connections.get(sourcePeer).handleSignal(message);

                } catch (error) {
                    console.error(formatLog(`Signal error: ${error.stack || error}`));
                }
            });

            this.socket.on('peer-reconnect', async (data) => {
                const { peerId } = data;
                console.log(formatLog(`Received reconnection request from peer: ${peerId}`));
                
                if (this.connections.has(peerId)) {
                    const connection = this.connections.get(peerId);
                    const attempts = this.connectionAttempts.get(peerId) || 0;
                    
                    if (attempts < 5) { // Limit reconnection attempts per peer
                        this.connectionAttempts.set(peerId, attempts + 1);
                        this.pendingReconnections.set(peerId, Date.now());
                        await connection.reconnect();
                    } else {
                        console.log(formatLog(`Max reconnection attempts reached for peer ${peerId}`));
                        this.connections.delete(peerId);
                        this.connectionAttempts.delete(peerId);
                    }
                }
            });

            this.socket.on('peer-status', (data) => {
                const { peerId, status } = data;
                console.log(formatLog(`Peer ${peerId} status: ${status}`));
                
                if (this.connections.has(peerId)) {
                    const connection = this.connections.get(peerId);
                    if (status === 'disconnected' && connection.connectionState === 'connected') {
                        connection.handleReconnect();
                    }
                }
            });

            this.socket.on("twist", (data, callback) => {
              // console.log("TWIST:", data);
              try{
            	   velocityPub.publish(data);
              } catch(error){
              	exec(`ros2 topic pub --once ${cmdVel} geometry_msgs/Twist "{linear: {x: 0.0, y: 0.0, z: 0.0}, angular: {x: 0.0, y: 0.0, z: 0.0}}"`);
              	console.log('aborted', error);
              }
            });

            this.socket.on("speak", (data) => {
            //	console.log("Speak", data);
            	speak(data);
            });

            this.socket.on("photo-request", async (data) => {
                const { requestId } = data;
                console.log(formatLog(`📸 Photo request received with requestId: ${requestId}`));
                
                try {
                    // Get the latest camera image from any of the three camera topics
                    let base64Photo = null;
                    let sourceTopic = null;
                    
                    // Check each camera topic in order of preference
                    const cameraTopics = ['/camera2d', '/camera/camera/color/image_raw', '/camera/camera/color/image_raw/compressed'];
                    
                    // First, check global camera data (independent of P2P connections)
                    console.log(formatLog(`🔍 Checking global camera data for ${cameraTopics.length} topics`));
                    console.log(formatLog(`🔍 Available global camera topics: ${Array.from(globalCameraData.keys()).join(', ')}`));
                    
                    for (const topic of cameraTopics) {
                        if (globalCameraData.has(topic)) {
                            const cameraData = globalCameraData.get(topic);
                            const age = Date.now() - cameraData.timestamp;
                            
                            console.log(formatLog(`🔍 Found global camera data for ${topic}: age=${age}ms, dataLength=${cameraData.data ? cameraData.data.length : 'undefined'}`));
                            
                            // Only use data that's less than 5 seconds old
                            if (age < 5000 && cameraData.data && typeof cameraData.data === 'string' && cameraData.data.length > 100) {
                                base64Photo = cameraData.data;
                                sourceTopic = topic;
                                console.log(formatLog(`📸 Found latest camera image from global storage: ${topic} (${base64Photo.length} chars, age: ${age}ms) - STANDALONE MODE`));
                                break;
                            } else {
                                console.log(formatLog(`⚠️ Global camera data for ${topic} is too old (${age}ms) or invalid`));
                            }
                        } else {
                            console.log(formatLog(`🔍 No global camera data found for topic: ${topic}`));
                        }
                    }
                    
                    // Fallback: Search through all active connections for camera data
                    if (!base64Photo) {
                        for (const [peerId, connection] of this.connections) {
                            if (connection.connectionState === 'connected' && connection.pendingMessages) {
                                for (const topic of cameraTopics) {
                                    if (connection.pendingMessages.has(topic)) {
                                        const messageData = connection.pendingMessages.get(topic);
                                        const message = messageData.message;
                                        
                                        // Check if the message has base64 data
                                        if (message.data && typeof message.data === 'string' && message.data.length > 100) {
                                            base64Photo = message.data;
                                            sourceTopic = topic;
                                            console.log(formatLog(`📸 Found latest camera image from topic: ${topic} (${base64Photo.length} chars) via peer: ${peerId}`));
                                            break;
                                        }
                                    }
                                }
                                if (base64Photo) break; // Found data, no need to check other connections
                            }
                        }
                    }
                    
                    if (base64Photo) {
                        // Send the photo back to the server with the same requestId
                        this.socket.emit('photo-response', {
                            requestId: requestId,
                            base64: base64Photo
                        });
                        console.log(formatLog(`✅ Photo response sent for requestId: ${requestId} from topic: ${sourceTopic}`));
                    } else {
                        // No camera data available
                        this.socket.emit('photo-response', {
                            requestId: requestId,
                            error: 'No camera data available'
                        });
                        console.log(formatLog(`❌ No camera data available for requestId: ${requestId}`));
                    }
                } catch (error) {
                    console.error(formatLog(`❌ Error processing photo request: ${error}`));
                    // Send error response
                    this.socket.emit('photo-response', {
                        requestId: requestId,
                        error: 'Failed to capture photo'
                    });
                }
            });
            
            // Preset remote CLI actions (ARC POST /robot/:id/cli). Exact match after trim,
            // plus one parameterized pattern for skills_remove (server validates skillId).
            const ALLOWED_CLI_COMMANDS = new Set([
              'agenticros start motors',
              'agenticros stop motors',
              'agenticros start realsense',
              'agenticros stop realsense',
              'agenticros start camera',
              'agenticros stop camera',
              'agenticros status --json',
              'agenticros skills list --json',
              'agenticros skills sync --no-restart',
              'agenticros gateway restart --json',
            ]);
            const ALLOWED_CLI_COMMAND_PATTERNS = [
              /^agenticros skills remove [a-zA-Z0-9][a-zA-Z0-9._-]* --yes --no-restart$/,
            ];
            const isAllowedCliCommand = (command) => {
              if (ALLOWED_CLI_COMMANDS.has(command)) return true;
              return ALLOWED_CLI_COMMAND_PATTERNS.some((re) => re.test(command));
            };
            // Long-running starts: background so bash-response returns promptly.
            const DETACHED_CLI_COMMANDS = new Set([
              'agenticros start motors',
              'agenticros start realsense',
              'agenticros start camera',
            ]);

            this.socket.on("bash-script", (data, callback) => {
              // Accept legacy string payload or structured { requestId, content }.
              let requestId = null;
              let content = data;
              if (data && typeof data === 'object') {
                requestId = data.requestId || null;
                content = data.content;
              }
              if (typeof content !== 'string') {
                console.log(formatLog(`BASH: rejected non-string command`));
                const deny = {
                  requestId,
                  stdout: '',
                  stderr: 'Invalid bash-script payload',
                  exitCode: 1,
                  error: 'invalid_payload',
                };
                if (requestId) this.socket.emit('bash-response', deny);
                if (typeof callback === 'function') {
                  try { callback(deny); } catch (_) { /* ignore */ }
                }
                return;
              }

              const command = content.trim();
              console.log(formatLog(`BASH: ${command}${requestId ? ` (requestId=${requestId})` : ''}`));

              if (!isAllowedCliCommand(command)) {
                console.log(formatLog(`BASH: rejected (not allowlisted): ${command}`));
                const deny = {
                  requestId,
                  stdout: '',
                  stderr: `Command not allowlisted: ${command}`,
                  exitCode: 126,
                  error: 'not_allowlisted',
                };
                if (requestId) this.socket.emit('bash-response', deny);
                if (typeof callback === 'function') {
                  try { callback(deny); } catch (_) { /* ignore */ }
                }
                return;
              }
              const respond = (error, stdout, stderr) => {
                const exitCode = error && typeof error.code === 'number' ? error.code : (error ? 1 : 0);
                if (error) {
                  console.log(formatLog(`BASH: failed exit=${exitCode}: ${stderr || error.message}`));
                } else {
                  console.log(formatLog(`BASH: ok exit=0`));
                }
                const result = {
                  requestId,
                  stdout: stdout || '',
                  stderr: stderr || (error && !stderr ? error.message : '') || '',
                  exitCode,
                };
                if (requestId) {
                  this.socket.emit('bash-response', result);
                }
                if (typeof callback === 'function') {
                  try {
                    callback(result);
                  } catch (_) { /* ignore */ }
                }
              };

              // Ensure npm global bins are visible when comms.js was spawned detached.
              const execEnv = {
                ...process.env,
                PATH: [
                  process.env.PATH || '',
                  '/usr/local/bin',
                  `${process.env.HOME || ''}/.local/share/pnpm`,
                  `${process.env.HOME || ''}/.npm-global/bin`,
                  '/usr/bin',
                ].filter(Boolean).join(':'),
              };

              if (DETACHED_CLI_COMMANDS.has(command)) {
                // Shell backgrounds the CLI and exits; child keeps running.
                const shellCmd = `${command} >>/tmp/agenticros-remote-cli.log 2>&1 &`;
                exec(shellCmd, { timeout: 15000, env: execEnv }, (error, stdout, stderr) => {
                  respond(error, stdout || `Started: ${command}\n`, stderr);
                });
                return;
              }

              // Answer status in-process — spawning `agenticros status` under a
              // heavy camera encode loop often misses ARC's 25s RPC deadline.
              if (command === 'agenticros status --json') {
                buildInlineStatusJson()
                  .then((snap) => {
                    respond(null, `${JSON.stringify(snap, null, 2)}\n`, '');
                  })
                  .catch((e) => {
                    respond(e, '', e instanceof Error ? e.message : String(e));
                  });
                return;
              }

              // Keep under ARC's ~25s waiter. Gateway restart / skills sync can be slower.
              let execTimeout = 20000;
              if (command.startsWith('agenticros skills list')) {
                execTimeout = 15000;
              } else if (
                command.startsWith('agenticros gateway restart') ||
                command.startsWith('agenticros skills sync')
              ) {
                execTimeout = 22000;
              }
              exec(command, { timeout: execTimeout, maxBuffer: 2 * 1024 * 1024, env: execEnv }, respond);
            });

            this.socket.on('disconnect', (reason) => {
                console.log(formatLog(`Disconnected from signaling server: ${reason}`));
                // Don't cleanup P2P connections on WebSocket disconnect
                this.handleReconnect();
            });

            this.socket.on('connect_error', (error) => {
                const msg = error?.message || String(error);
                console.error(formatLog(`Connection error: ${msg}`));
                // ARC returns cooldown / blocklist — wait before burning attempts
                if (/cooldown|blocklist|Too many|restart cooldown|Rapid/i.test(msg)) {
                    const waitMs = 5000;
                    this.nextReconnectAt = Date.now() + waitMs;
                    console.log(formatLog(`Server asked us to back off — next try in ${waitMs}ms`));
                }
                this.handleReconnect();
            });

        } catch (error) {
            console.error(formatLog(`Connection error: ${error}`));
            this.handleReconnect();
        } finally {
            this.isReconnecting = false;
        }
    }

    handleReconnect() {
        if (this.socket?.connected) return;
        if (this._reconnectTimer) return;

        this.reconnectAttempts++;
        const cooldownWait = Math.max(0, this.nextReconnectAt - Date.now());
        this.reconnectDelay = Math.min(Math.max(this.reconnectDelay, 2000) * 1.5, 15000);
        const delay = Math.max(this.reconnectDelay, cooldownWait);
        console.log(formatLog(`Attempting reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`));
        this._reconnectTimer = setTimeout(() => {
            this._reconnectTimer = null;
            this.connect();
        }, delay);
    }

    cleanup() {
        // Only cleanup when explicitly requested, not on WebSocket disconnects
        this.connections.forEach(conn => conn.cleanup());
        this.connections.clear();
        if (this.socket) this.socket.close();
        
        // Cleanup standalone subscribers
        if (this.standaloneSubscribers) {
            this.standaloneSubscribers.forEach(sub => {
                if (sub) {
                    if (typeof sub.destroy === 'function') {
                        try { sub.destroy(); } catch (e) { console.warn('destroy() error', e); }
                    } else if (typeof sub.unsubscribe === 'function') {
                        try { sub.unsubscribe(); } catch (e) { console.warn('unsubscribe() error', e); }
                    } else if (typeof sub.close === 'function') {
                        try { sub.close(); } catch (e) { console.warn('close() error', e); }
                    }
                }
            });
            this.standaloneSubscribers = [];
        }
    }
}

class P2PConnection {
    constructor(peerId, socket) {
        if (!peerId) {
            throw new Error('Peer ID is required');
        }
        this.peerId = peerId;
        this.socket = socket;
        this.initializePeerConnection();
        
        this.dataChannels = new Map();
        this.currentChannelIndex = 0;
        this.maxChannels = 10;
        this.activeChannels = new Set();
        this.channelCreationQueue = [];
        this.isCreatingChannels = false;
        this.hasRemoteDescription = false;
        this.candidateQueue = [];
        this.dataChannelOpen = false;
        this.isDataChannelReady = false;
        // setupHandlers() is called from initializePeerConnection()
        this.messages = new Map();
        this.subscribers = [];
        this.currentDataChannel = null;
        this.connectionState = 'new';
        this.abortSend = false;
        this.rosPaused = false;
        this._browserMediaReady = false;
        this._videoBridgeTimer = null;
        this.isWebSocketConnected = true;
        this.reconnectTimer = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = Infinity;
        this.lastReconnectAttempt = 0;
        this.reconnectCooldown = 2000;
        this.isReconnecting = false;
        this.iceGatheringState = 'new';
        this.signalingState = 'stable';
        this.lastSignalTime = Date.now();
        this.signalTimeout = 60000;
        this.iceRestartTimer = null;
        this.iceRestartInterval = 300000;
        this.forceIceRestart = false;
        this.connectionTimeout = null;
        this.activeSends = new Set();
        this.channelErrors = new Map();
        this.dataChannelRetryTimer = null;
        this.dataChannelRetryInterval = 5000;
        this.maxDataChannelRetries = Infinity;
        this.dataChannelRetryCount = 0;
        this.latestMessages = new Map();
        this.lastSentTime = new Map();
        this.minSendInterval = 33;
        // Cap WebRTC color frames (~6 FPS). Full-rate high-res floods the datachannel.
        this.cameraSendIntervalMs = 167;
        this._lastCameraSendAt = 0;
        this._lastCameraLogAt = 0;
        this.lastActivityTime = Date.now();
        this.keepAliveInterval = 30000;
        this.keepAliveTimer = null;
        this.lastPingTime = 0;
        this.pingInterval = 30000; // 30 seconds between pings
        
        // NEW: Non-queuing message system
        this.pendingMessages = new Map(); // topic -> latest message
        this.sendingMessages = new Set(); // topics currently being sent
        this.messageSendQueue = []; // simple queue for non-ROS messages (like ping)
        this.isProcessingQueue = false;
        
        // Memory management
        this.messageCleanupTimer = null;
        this.messageCleanupInterval = 60000; // Clean up old messages every minute
        this.maxMessageAge = 300000; // 5 minutes
        this.maxMessagesPerPeer = 100; // Limit messages per peer
        this.startMessageCleanup();
        
        // NEW: Aggressive cleanup for non-queuing system
        this.aggressiveCleanupTimer = null;
        this.aggressiveCleanupInterval = 1000; // Clean up every second
        this.startAggressiveCleanup();
    }

    initializePeerConnection() {
        if (this.pc) {
            try {
                this.pc.close();
            } catch (error) {
                console.error(formatLog(`Error closing existing peer connection: ${error}`));
            }
        }

        console.log(formatLog('Initializing new peer connection'));
        try {
            let iceServers = Array.isArray(activeIceServers)
              ? activeIceServers.filter((s) => typeof s === 'string')
              : [];

            // node-datachannel rejects browser-style {urls,username,credential} objects.
            // Fall back to built-in STUN strings so teleop can still answer.
            if (!iceServers.length) {
              console.warn(formatLog('No valid ICE strings in activeIceServers — using default STUN'));
              iceServers = config.iceServers;
            }

            this.pc = new nodeDataChannel.PeerConnection(this.peerId, {
                iceServers,
                maxMessageSize: config.maxMessageSize,
                enableIceTcp: true,
                portRangeBegin: 0,
                portRangeEnd: 65535,
                enableIceTrickle: true,
                iceRole: 'controlled'
            });

            // Clear any existing timers
            this.clearAllTimers();

            // Start keepalive timer
            this.keepAliveTimer = setInterval(() => {
                if (this.connectionState === 'connected') {
                    const now = Date.now();
                    if (now - this.lastPingTime >= this.pingInterval) {
                        console.log(formatLog('Sending keepalive ping'));
                        try {
                            this.queueMessage({ type: 'ping' });
                            this.lastPingTime = now;
                        } catch (error) {
                            console.error(formatLog(`Error sending keepalive: ${error}`));
                        }
                    }
                }
            }, this.pingInterval);

            // Handlers must be (re)bound whenever a new native PC is created
            this.setupHandlers();

            return true;
        } catch (error) {
            console.error(formatLog(`Error initializing peer connection: ${error}`));
            this.pc = null;
            return false;
        }
    }

    clearAllTimers() {
        if (this.keepAliveTimer) {
            clearInterval(this.keepAliveTimer);
            this.keepAliveTimer = null;
        }
        if (this.iceRestartTimer) {
            clearInterval(this.iceRestartTimer);
            this.iceRestartTimer = null;
        }
        if (this.dataChannelRetryTimer) {
            clearInterval(this.dataChannelRetryTimer);
            this.dataChannelRetryTimer = null;
        }
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
        if (this.messageCleanupTimer) {
            clearInterval(this.messageCleanupTimer);
            this.messageCleanupTimer = null;
        }
        if (this.aggressiveCleanupTimer) {
            clearInterval(this.aggressiveCleanupTimer);
            this.aggressiveCleanupTimer = null;
        }
    }
    
    startMessageCleanup() {
        this.messageCleanupTimer = setInterval(() => {
            this.cleanupOldMessages();
        }, this.messageCleanupInterval);
    }
    
    // NEW: Aggressive cleanup for non-queuing system
    startAggressiveCleanup() {
        this.aggressiveCleanupTimer = setInterval(() => {
            this.aggressiveCleanup();
        }, this.aggressiveCleanupInterval);
    }
    
    aggressiveCleanup() {
        if (!messageConfig.enableNonQueuing) return;
        
        const now = Date.now();
        let cleanedCount = 0;
        
        // Clean up very old pending messages (older than 500ms)
        for (const [topic, messageData] of this.pendingMessages.entries()) {
            if (now - messageData.timestamp > 500) {
                this.pendingMessages.delete(topic);
                cleanedCount++;
            }
        }
        
        // Clean up stuck sending messages (older than 1 second)
        for (const topic of this.sendingMessages) {
            const messageData = this.pendingMessages.get(topic);
            if (messageData && (now - messageData.timestamp > 1000)) {
                this.sendingMessages.delete(topic);
                this.pendingMessages.delete(topic);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(formatLog(`Aggressive cleanup: removed ${cleanedCount} stale messages`));
        }
    }
    
    cleanupOldMessages() {
        const now = Date.now();
        let cleanedCount = 0;
        
        // Clean up old messages
        for (const [messageId, message] of this.messages.entries()) {
            if (now - message.timestamp > this.maxMessageAge) {
                this.messages.delete(messageId);
                cleanedCount++;
            }
        }
        
        // NEW: Clean up stale pending messages
        for (const [topic, messageData] of this.pendingMessages.entries()) {
            if (now - messageData.timestamp > messageConfig.pendingMessageTimeout) {
                this.pendingMessages.delete(topic);
                cleanedCount++;
            }
        }
        
        // Limit total messages per peer
        if (this.messages.size > this.maxMessagesPerPeer) {
            const entries = Array.from(this.messages.entries());
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            const toDelete = entries.slice(0, this.messages.size - this.maxMessagesPerPeer);
            toDelete.forEach(([messageId]) => {
                this.messages.delete(messageId);
                cleanedCount++;
            });
        }
        
        if (cleanedCount > 0) {
            console.log(formatLog(`Cleaned up ${cleanedCount} old messages for peer ${this.peerId}`));
        }
    }

    async retryDataChannel() {
        if (this.dataChannelRetryCount >= this.maxDataChannelRetries) {
            console.log(formatLog('Max data channel retry attempts reached'));
            return;
        }

        try {
            console.log(formatLog(`Attempting to create data channel (attempt ${this.dataChannelRetryCount + 1}/${this.maxDataChannelRetries})`));
            const dc = this.pc.createDataChannel(`robotics-${this.currentChannelIndex++}`);
            this.setupDataChannel(dc);
            this.dataChannelRetryCount++;
        } catch (error) {
            console.error(formatLog(`Error creating data channel: ${error}`));
        }
    }

    async restartIce() {
        if (!this.pc || this.connectionState !== 'connected') return;

        try {
            // console.log(formatLog('Initiating ICE restart'));
            const offer = this.pc.createOffer({ iceRestart: true });
            await this.pc.setLocalDescription(offer);
            this.forceIceRestart = false;
        } catch (error) {
            // console.error(formatLog(`Error during ICE restart: ${error}`));
        }
    }

    setupHandlers() {
        this.pc.onLocalDescription((sdp, type) => {
            console.log(formatLog(`Generated local ${type}`));
            console.log(formatLog(`SDP content: ${sdp}`));
            // Normalize to lowercase for browser RTCPeerConnection
            const signalType = String(type || '').toLowerCase();
            if (this.socket?.connected) {
                this.sendSignal({
                    type: signalType,
                    sdp: String(sdp)
                });
            } else {
                console.log(formatLog('WebSocket disconnected, queuing signal for later'));
                this.candidateQueue.push({
                    type: signalType,
                    sdp: String(sdp)
                });
            }
        });

        this.pc.onLocalCandidate((candidate, mid) => {
            if (candidate) {
                console.log(formatLog(`Generated local candidate for mid: ${mid || '0'}`));
                console.log(formatLog(`Candidate content: ${candidate}`));
                if (this.socket?.connected) {
                    this.sendSignal({
                        type: 'candidate',
                        candidate: String(candidate),
                        mid: String(mid || '0')
                    });
                } else {
                    console.log(formatLog('WebSocket disconnected, queuing candidate for later'));
                    this.candidateQueue.push({
                        type: 'candidate',
                        candidate: String(candidate),
                        mid: String(mid || '0')
                    });
                }
            }
        });

        this.pc.onStateChange((state) => {
            console.log(formatLog(`Connection state for ${this.peerId}: ${state}`));
            const oldState = this.connectionState;
            this.connectionState = state;
            
            if (state === 'connected') {
                console.log(formatLog('Peer connection established'));
                this.dataChannelOpen = true;
                this.isDataChannelReady = true;
                this.rosPaused = false;
                this.reconnectAttempts = 0;
                this.isReconnecting = false;
                this.lastActivityTime = Date.now();
                if (this.reconnectTimer) {
                    clearTimeout(this.reconnectTimer);
                    this.reconnectTimer = null;
                }
                if (this.socket?.connected) {
                    this.socket.emit('peer-status', {
                        peerId: this.peerId,
                        status: 'connected'
                    });
                }

                // Create data channel if not already created
                if (!this.currentDataChannel) {
                    console.log(formatLog('Creating data channel after connection established'));
                    try {
                        const dc = this.pc.createDataChannel('robotics-0', {
                            ordered: true,
                            maxRetransmits: 3,
                            protocol: 'binary'
                        });
                        this.setupDataChannel(dc);
                        this.activeChannels.add('robotics-0');
                        console.log(formatLog('Data channel created after connection'));
                    } catch (error) {
                        console.error(formatLog(`Error creating data channel after connection: ${error}`));
                    }
                }
            } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
                console.log(formatLog(`Peer connection ${state}`));
                this.dataChannelOpen = false;
                this.isDataChannelReady = false;
                this.rosPaused = true;
                // Do not call createOffer()-based reconnect here — native PeerConnection
                // has no createOffer/createAnswer, and teleop browser is the offerer.
                // Wait for a fresh browser offer (handler replaces this connection).
                if (this.socket?.connected) {
                    this.socket.emit('peer-status', {
                        peerId: this.peerId,
                        status: 'disconnected'
                    });
                }
            }
        });

        this.pc.onDataChannel((dc) => {
            console.log(formatLog(`Data channel from ${this.peerId}: ${dc.getLabel()}`));
            try {
                this.setupDataChannel(dc);
                if(firstRun){
                    this.initRcl(dc);
                }
            } catch (error) {
                console.error(formatLog(`Error setting up data channel: ${error}`));
            }
        });

        this.pc.onGatheringStateChange((state) => {
            console.log(formatLog(`ICE gathering state: ${state}`));
            this.iceGatheringState = state;
        });

        this.pc.onSignalingStateChange((state) => {
            console.log(formatLog(`Signaling state: ${state}`));
            this.signalingState = state;
        });
    }

    async handleSignal(message) {
        try {
            console.log(formatLog(`Handling signal of type: ${message.type}`));
            console.log(formatLog(`Signal content: ${JSON.stringify(message)}`));
            this.lastSignalTime = Date.now();
            
            if (message.type === 'offer') {
                console.log(formatLog('Setting remote description (offer)'));
                try {
                    // Set remote description — node-datachannel then generates an
                    // answer via onLocalDescription (there is no createAnswer()).
                    const sdp = message.sdp;
                    console.log(formatLog(`Setting remote SDP (${String(sdp || '').length} chars)`));
                    this.pc.setRemoteDescription(sdp, 'offer');
                    this.hasRemoteDescription = true;
                    
                    // Process any queued candidates first
                    if (this.candidateQueue.length > 0) {
                        console.log(formatLog(`Processing ${this.candidateQueue.length} queued candidates`));
                        for (const candidate of this.candidateQueue) {
                            try {
                                await this.pc.addRemoteCandidate(candidate.candidate, candidate.mid || '0');
                            } catch (e) {
                                console.warn(formatLog(`Error adding queued candidate: ${e.message}`));
                            }
                        }
                        this.candidateQueue = [];
                    }

                    // Answer is sent by onLocalDescription. Do not call createAnswer()
                    // — it does not exist on the native PeerConnection and throws.
                } catch (error) {
                    console.error(formatLog(`Error in offer handling: ${error}`));
                    throw error;
                }
            } else if (message.type === 'answer' || message.type === 'Answer') {
                console.log(formatLog('Setting remote description (answer)'));
                try {
                    const sdp = message.sdp;
                    console.log(formatLog(`Setting remote SDP: ${sdp}`));
                    await this.pc.setRemoteDescription(sdp, 'answer');
                    this.hasRemoteDescription = true;

                    // Create data channel if not already created
                    if (!this.currentDataChannel) {
                        console.log(formatLog('Creating data channel after answer'));
                        try {
                            const dc = this.pc.createDataChannel('robotics-0', {
                                ordered: true,
                                maxRetransmits: 3,
                                protocol: 'binary'
                            });
                            this.setupDataChannel(dc);
                            this.activeChannels.add('robotics-0');
                            console.log(formatLog('Data channel created after answer'));
                        } catch (error) {
                            console.error(formatLog(`Error creating data channel after answer: ${error}`));
                        }
                    }
                } catch (error) {
                    console.error(formatLog(`Error in answer handling: ${error}`));
                    throw error;
                }
            } else if (message.type === 'candidate') {
                console.log(formatLog(`Received ICE candidate for mid: ${message.mid}`));
                console.log(formatLog(`Candidate content: ${message.candidate}`));
                try {
                    if (this.hasRemoteDescription) {
                        console.log(formatLog(`Adding remote candidate with mid: ${message.mid || '0'}`));
                        await this.pc.addRemoteCandidate(message.candidate, message.mid || '0');
                    } else {
                        console.log(formatLog('Queuing candidate - no remote description yet'));
                        this.candidateQueue.push(message);
                    }
                } catch (error) {
                    console.error(formatLog(`Error in candidate handling: ${error}`));
                    throw error;
                }
            }
        } catch (error) {
            console.error(formatLog(`Error handling signal: ${error}`));
            this.handleReconnect();
        }
    }

    sendSignal(message) {
        if (!this.socket?.connected) {
            console.log(formatLog('WebSocket not connected, queuing signal'));
            this.candidateQueue.push(message);
            return;
        }
        this.socket.emit('signal', {
            ...message,
            targetPeer: this.peerId
        });
    }

    // Add method to process queued signals when WebSocket reconnects
    processQueuedSignals() {
        if (this.candidateQueue.length > 0) {
            console.log(formatLog(`Processing ${this.candidateQueue.length} queued signals`));
            while (this.candidateQueue.length > 0) {
                const signal = this.candidateQueue.shift();
                this.sendSignal(signal);
            }
        }
    }

    async createDataChannels() {
        if (this.isCreatingChannels) return;
        this.isCreatingChannels = true;

        try {
            console.log(formatLog('Creating data channels...'));
            // Create initial channels
            for (let i = 0; i < this.maxChannels; i++) {
                const channelName = `robotics-${i}`;
                try {
                    console.log(formatLog(`Creating data channel: ${channelName}`));
                    const dc = this.pc.createDataChannel(channelName, {
                        ordered: true,
                        maxRetransmits: 3,
                        protocol: 'binary'
                    });
                    this.setupDataChannel(dc); // No need to pass index, will use label
                    this.activeChannels.add(channelName);
                    console.log(formatLog(`Data channel ${channelName} created successfully`));
                } catch (error) {
                    console.error(formatLog(`Error creating data channel ${channelName}: ${error}`));
                }
            }
        } catch (error) {
            console.error(formatLog(`Error in createDataChannels: ${error}`));
        } finally {
            this.isCreatingChannels = false;
        }
    }

    setupVideoStreaming(dc) {
        if (!rosNode) {
            console.error('ROS node not initialized');
            return;
        }

        this.cleanupSubscriptions();

        // Subscribe to camera topic for browser peers
        const cameraTopic = camera2dTopic;
        console.log(formatLog(`Setting up video streaming for topic: ${cameraTopic}`));
        
        try {
            const subscriber = rosNode.createSubscription('std_msgs/msg/String', cameraTopic, async (msg) => {
                if (this.rosPaused) return;
                if (this.dataChannelOpen && dc.isOpen()) {
                    console.log(formatLog(`✅ Data channel is open and ready for sending`));
                    try {
                        // NEW: Use non-queuing system for video streaming
                        this.updateLatestMessage('/camera2d', {
                            robotId: robotId,
                            topic: '/camera2d',
                            data: msg
                        });
                        
                        // Store in global camera data for photo requests
                        if (msg && typeof msg === 'string' && msg.length > 100) {
                            globalCameraData.set('/camera2d', {
                                data: msg,
                                timestamp: Date.now()
                            });
                            console.log(formatLog(`💾 Stored camera2d data in global storage (${msg.length} chars)`));
                        }
                    } catch (error) {
                        console.warn(formatLog(`Failed to send video message: ${error}`));
                    }
                } else {
                    console.warn(formatLog(`Data channel not open for video streaming`));
                }
            });
            this.subscribers.push(subscriber);
            console.log(formatLog(`Successfully subscribed to video topic ${cameraTopic}`));
        } catch (err) {
            console.error(formatLog(`Error setting up video subscription: ${err}`));
        }
    }

    // NEW: Non-queuing message sending system
    async sendMessageImmediate(msg) {
        try {
            // Debug logging for image messages
            if (msg.topic === '/camera2d' || msg.topic === '/camera/camera/color/image_raw') {
                console.log(formatLog(`📤 sendMessageImmediate: Processing image message for topic ${msg.topic}`));
                console.log(formatLog(`📤 Data type: ${typeof msg.data}`));
                console.log(formatLog(`📤 Data length: ${msg.data ? msg.data.length : 'undefined'}`));
                if (typeof msg.data === 'string') {
                    console.log(formatLog(`📤 Data starts with: ${msg.data.substring(0, 50)}...`));
                    if (msg.data.startsWith('/9j/')) {
                        console.log(formatLog(`✅ JPEG base64 signature confirmed in sendMessageImmediate`));
                    }
                }
            }
            
            const compressed = JSON.stringify(msg);
            const compressedSize = compressed.length;
            
            // Debug: Log the compressed message for image topics
            if (msg.topic === '/camera2d' || msg.topic === '/camera/camera/color/image_raw') {
                console.log(formatLog(`📤 Compressed message size: ${compressedSize} bytes`));
                console.log(formatLog(`📤 Compressed message preview: ${compressed.substring(0, 200)}...`));
            }
            
            // Get available channels once
            const openChannels = Array.from(this.dataChannels.values())
                .filter(ch => ch.isOpen() && this.activeChannels.has(ch.getLabel()));
            
            if (openChannels.length === 0) {
                return; // Silently fail if no channels available
            }
            
            // Always use chunked binary format for compatibility with browser client
            const actualChunkSize = Math.floor(config.maxMessageSize * 0.75); // Use 75% for data to ensure room for header
            const totalChunks = Math.ceil(compressedSize / actualChunkSize);
            const messageId = uuidv4();
            
            // Send chunks immediately without per-chunk log spam
            for (let i = 0; i < totalChunks; i++) {
                if (this.abortSend) {
                    return;
                }
                
                const channel = openChannels[i % openChannels.length];
                try {
                    // Create header (8 bytes for index, 8 bytes for total, 36 bytes for messageId)
                    const header = Buffer.alloc(52);
                    header.writeBigUInt64BE(BigInt(i), 0);
                    header.writeBigUInt64BE(BigInt(totalChunks), 8);
                    header.write(messageId.replace(/-/g, ''), 16, 'hex');
                    
                    const chunkData = compressed.slice(i * actualChunkSize, (i + 1) * actualChunkSize);
                    const chunkBuffer = Buffer.from(chunkData);
                    const messageBuffer = Buffer.concat([header, chunkBuffer]);
                    
                    if (messageBuffer.length > config.maxMessageSize) {
                        continue;
                    }
                    
                    channel.sendMessageBinary(messageBuffer);
                } catch (sendError) {
                    console.error(formatLog(`❌ Error sending chunk ${i + 1}/${totalChunks} via channel ${channel.getLabel()}: ${sendError}`));
                    this.channelErrors.set(channel.getLabel(), sendError);
                    this.activeChannels.delete(channel.getLabel());
                    
                    if (this.activeChannels.size === 0) {
                        this.abortSend = true;
                        return;
                    }
                }
            }
        } catch (error) {
            console.error(formatLog(`❌ Error in sendMessageImmediate: ${error}`));
        }
    }
    
    // NEW: Queue processor for non-ROS messages
    async processMessageQueue() {
        if (this.isProcessingQueue || this.messageSendQueue.length === 0) {
            return;
        }
        
        this.isProcessingQueue = true;
        
        while (this.messageSendQueue.length > 0 && !this.abortSend) {
            const msg = this.messageSendQueue.shift();
            try {
                await this.sendMessageImmediate(msg);
            } catch (error) {
                console.error(formatLog(`Error processing queued message: ${error}`));
            }
        }
        
        this.isProcessingQueue = false;
    }
    
    // NEW: Add message to queue (for non-ROS messages like ping)
    queueMessage(msg) {
        this.messageSendQueue.push(msg);
        this.processMessageQueue();
    }
    
    // NEW: Update latest message for a topic (for ROS messages)
    updateLatestMessage(topic, msg) {
        if (!messageConfig.enableNonQueuing) {
            // Fallback to old system if disabled
            this.sendCompressedMessage(msg);
            return;
        }
        
        const now = Date.now();
        const isCameraTopic = topic.includes('camera') || topic === '/camera2d';
        if (!isCameraTopic) {
            console.log(formatLog(`📋 updateLatestMessage called for topic: ${topic}`));
        }
        
        // Check if this is a high priority topic
        const isHighPriority = messageConfig.highPriorityTopics.includes(topic);
        
        // Aggressive cleanup: remove old pending messages for this topic
        if (this.pendingMessages.has(topic)) {
            const oldMessage = this.pendingMessages.get(topic);
            if (now - oldMessage.timestamp > 100) { // Remove messages older than 100ms
                this.pendingMessages.delete(topic);
            }
        }
        
        this.pendingMessages.set(topic, {
            message: msg,
            timestamp: now,
            priority: isHighPriority ? 'high' : 'low'
        });
        
        if (!isCameraTopic) {
            console.log(formatLog(`📋 Message queued for topic: ${topic} (${isHighPriority ? 'HIGH PRIORITY' : 'low priority'}), pending messages: ${this.pendingMessages.size}`));
        }
        
        // Log performance metrics for high-frequency topics
        if (messageConfig.performanceLogging && (topic === '/camera2d' || topic === '/odom')) {
            const lastUpdate = this.lastSentTime.get(topic) || 0;
            const interval = now - lastUpdate;
            if (interval > 0) {
                const frequency = Math.round(1000 / interval);
                console.log(formatLog(`Topic ${topic} update frequency: ${frequency} Hz`));
            }
            this.lastSentTime.set(topic, now);
        }
        
        // If not currently sending this topic, send it immediately for high priority, or with delay for low priority
        if (!this.sendingMessages.has(topic)) {
            if (isHighPriority) {
                if (!isCameraTopic) {
                    console.log(formatLog(`📤 Sending HIGH PRIORITY message immediately for topic: ${topic}`));
                }
                this.sendLatestMessage(topic);
            } else {
                // Low priority messages get a small delay to allow high priority messages to be processed first
                const delay = messageConfig.lowPriorityDelay || 10; // 10ms default delay
                console.log(formatLog(`📤 Scheduling low priority message for topic: ${topic} with ${delay}ms delay`));
                setTimeout(() => {
                    if (this.pendingMessages.has(topic) && !this.sendingMessages.has(topic)) {
                        console.log(formatLog(`📤 Sending delayed low priority message for topic: ${topic}`));
                        this.sendLatestMessage(topic);
                    }
                }, delay);
            }
        }
    }
    
    // NEW: Send the latest message for a topic
    async sendLatestMessage(topic) {
        if (!this.pendingMessages.has(topic)) {
            return;
        }
        
        const messageData = this.pendingMessages.get(topic);
        this.sendingMessages.add(topic);
        
        try {
            // Check if data channels are available
            const openChannels = Array.from(this.dataChannels.values())
                .filter(ch => ch.isOpen() && this.activeChannels.has(ch.getLabel()));
            
            if (openChannels.length === 0) {
                this.sendingMessages.delete(topic);
                return;
            }
            
            // Debug logging for image messages
            if (topic === '/camera2d' && messageData.message.data && messageData.message.data.data) {
                const data = messageData.message.data.data;
                if (typeof data === 'string' && data.length > 100) {
                    console.log(formatLog(`📤 Sending base64 image message: ${topic} -> ${data.length} chars`));
                    console.log(formatLog(`📊 Base64 preview: ${data.substring(0, 50)}...`));
                }
            }
            
            // NEW: Debug the actual message structure being sent
            if (topic === '/camera2d' || topic === '/camera/camera/color/image_raw') {
                console.log(formatLog(`📤 Sending message structure for ${topic}:`));
                console.log(formatLog(`   - robotId: ${messageData.message.robotId}`));
                console.log(formatLog(`   - topic: ${messageData.message.topic}`));
                console.log(formatLog(`   - encoding: ${messageData.message.encoding}`));
                console.log(formatLog(`   - data type: ${typeof messageData.message.data}`));
                console.log(formatLog(`   - data length: ${messageData.message.data ? messageData.message.data.length : 'undefined'}`));
                if (messageData.message.data && typeof messageData.message.data === 'string') {
                    console.log(formatLog(`   - data preview: ${messageData.message.data.substring(0, 100)}...`));
                    // Check if it starts with JPEG signature
                    if (messageData.message.data.startsWith('/9j/')) {
                        console.log(formatLog(`✅ Valid JPEG base64 signature confirmed for browser display`));
                    } else {
                        console.log(formatLog(`⚠️ Data does not start with JPEG signature /9j/ - browser may not display correctly`));
                    }
                }
            }
            
            // Send immediately for all messages (no priority delays)
            await this.sendMessageImmediate(messageData.message);
            if (!(topic.includes('camera') || topic === '/camera2d')) {
                console.log(formatLog(`✅ Message sent successfully for topic: ${topic}`));
            }
            this.pendingMessages.delete(topic); // Remove after sending
            
        } catch (error) {
            // Silent error handling to reduce log spam
        } finally {
            this.sendingMessages.delete(topic);
        }
    }

    async sendCompressedMessage(msg) {
        // Check if new system is enabled
        if (messageConfig.enableNonQueuing) {
            if (msg.type === 'ping') {
                this.queueMessage(msg);
            } else {
                // For ROS messages, extract topic and use new system
                const topic = msg.topic || 'unknown';
                this.updateLatestMessage(topic, msg);
            }
            return;
        }
        
        // ORIGINAL IMPLEMENTATION (fallback)
        try {
            const compressed = JSON.stringify(msg);
            const compressedSize = compressed.length;
            const messageId = uuidv4();
            
            // Use 75% of maxMessageSize for actual data to ensure room for header
            const actualChunkSize = Math.floor(config.maxMessageSize * 0.75);
            const totalChunks = Math.ceil(compressedSize / actualChunkSize);

            const openChannels = Array.from(this.dataChannels.values())
                .filter(ch => ch.isOpen() && this.activeChannels.has(ch.getLabel()));

            if (openChannels.length === 0) {
                console.warn(formatLog('No open channels available. Aborting send.'));
                return;
            }

            this.activeSends.add(messageId);

            for (let i = 0; i < totalChunks; i++) {
                if (this.abortSend) {
                    console.warn(formatLog(`Send aborted at chunk ${i + 1} due to disconnect or error.`));
                    this.activeSends.delete(messageId);
                    return;
                }

                const channel = openChannels[i % openChannels.length];
                try {
                    // Create header (8 bytes for index, 8 bytes for total, 36 bytes for messageId)
                    const header = Buffer.alloc(52);
                    header.writeBigUInt64BE(BigInt(i), 0);
                    header.writeBigUInt64BE(BigInt(totalChunks), 8);
                    header.write(messageId.replace(/-/g, ''), 16, 'hex');

                    // Get chunk data
                    const chunkData = compressed.slice(i * actualChunkSize, (i + 1) * actualChunkSize);
                    const chunkBuffer = Buffer.from(chunkData);

                    // Combine header and chunk
                    const messageBuffer = Buffer.concat([header, chunkBuffer]);

                    if (messageBuffer.length > config.maxMessageSize) {
                        console.warn(formatLog(`Chunk ${i + 1} too large (${messageBuffer.length} bytes), skipping`));
                        continue;
                    }

                    channel.sendMessageBinary(messageBuffer);
                } catch (sendError) {
                    console.error(formatLog(`Error sending on channel ${channel.getLabel()}: ${sendError}`));
                    this.channelErrors.set(channel.getLabel(), sendError);
                    this.activeChannels.delete(channel.getLabel());
                    
                    if (this.activeChannels.size === 0) {
                        this.abortSend = true;
                        this.activeSends.delete(messageId);
                        return;
                    }
                }
            }

            this.activeSends.delete(messageId);
        } catch (error) {
            console.error(formatLog(`Send error: ${error}`));
            this.activeSends.clear();
        }
    }

    setupDataChannel(dc) {
        console.log(formatLog(`Setting up data channel: ${dc.getLabel()}`));
        this.currentDataChannel = dc;
        this.dataChannels.set(dc.getLabel(), dc); // Store by label, not always 0

        let openHandled = false;
        const onChannelOpen = () => {
            if (openHandled) return;
            openHandled = true;
            console.log(formatLog(`📡 Data channel opened with label: ${dc.getLabel()}`));
            this.dataChannelOpen = true;
            this.isDataChannelReady = true;
            this.abortSend = false;
            this.rosPaused = false;
            this.channelErrors.delete(dc.getLabel());
            this.activeChannels.add(dc.getLabel());
            
            // Check if this is a browser peer
            const isBrowserPeer = this.peerId.startsWith('browser-');
            console.log(formatLog(`Peer ${this.peerId} is ${isBrowserPeer ? 'browser' : 'non-browser'}`));
            
            // Initialize ROS / browser media once per peer (10 data channels otherwise
            // race cleanupSubscriptions and leave video unbound).
            if (firstRun) {
                console.log(formatLog('First run detected, initializing ROS...'));
                this.initRcl(dc);
            } else if (rosNode && !this._browserMediaReady) {
                this._browserMediaReady = true;
                console.log(formatLog('ROS already initialized — binding browser media once'));
                try {
                    if (isBrowserPeer) {
                        this.setupRosSubscriptions(dc);
                        this.startBrowserVideoBridge();
                    } else {
                        this.setupRosSubscriptions(dc);
                    }
                } catch (setupError) {
                    console.error(formatLog(`Error in setup after channel open: ${setupError}`));
                    this._browserMediaReady = false;
                }
            }
            
            // NEW: Test non-queuing system on first connection
            if (messageConfig.enableNonQueuing && firstRun) {
                setTimeout(() => {
                    this.testNonQueuingSystem();
                }, 2000); // Test after 2 seconds
            }
        };

        try {
            console.log(formatLog(`Initial channel state for ${dc.getLabel()}: ${dc.isOpen() ? 'open' : 'closed'}`));

            dc.onOpen(() => onChannelOpen());

            // Browser-created channels are often already open when onDataChannel
            // fires — if we only listen for onOpen we miss video/cmd setup forever.
            if (dc.isOpen()) {
                onChannelOpen();
            }

            dc.onMessage((msg) => {
                console.log(formatLog(`📥 Received message on ${dc.getLabel()} from peer ${this.peerId}`));
                try {
                    // Text/JSON from the browser may arrive as Buffer; detect and
                    // handle as a string before treating as chunked binary.
                    if (msg instanceof Buffer) {
                        const asText = (() => {
                            try {
                                const head = msg.slice(0, 1).toString('utf8');
                                if (head === '{' || head === 't' || head === 's') {
                                    return msg.toString('utf8');
                                }
                            } catch (_) { /* ignore */ }
                            return null;
                        })();
                        if (asText && (asText.startsWith('{') || asText.startsWith('twist:') || asText.startsWith('speak:'))) {
                            msg = asText;
                        }
                    }

                    if (msg instanceof Buffer) {
                        // Handle binary messages
                        console.log(formatLog(`📥 Received binary message (${msg.length} bytes) from peer ${this.peerId}`));
                        
                        // Ensure we have enough bytes for the header
                        if (msg.length < 52) {
                            console.warn(formatLog(`Message too short (${msg.length} bytes), expected at least 52 bytes from peer ${this.peerId}`));
                            return;
                        }

                        try {
                            // Parse binary message header
                            const index = Number(msg.readBigUInt64BE(0));
                            const total = Number(msg.readBigUInt64BE(8));
                            
                            // Validate array lengths
                            if (isNaN(index) || isNaN(total) || index < 0 || total <= 0 || index >= total) {
                                console.warn(formatLog(`Invalid message header from peer ${this.peerId}: index=${index}, total=${total}`));
                                return;
                            }

                            const messageId = msg.slice(16, 52).toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
                            const chunkData = msg.slice(52).toString();

                            console.log(formatLog(`📥 Processing chunk ${index + 1}/${total} for message ${messageId} from peer ${this.peerId}`));

                            // Reconstruct message if needed
                            if (!this.messages.has(messageId)) {
                                console.log(formatLog(`📥 Starting new message reconstruction for ${messageId} from peer ${this.peerId}`));
                                this.messages.set(messageId, {
                                    chunks: new Array(total).fill(null),
                                    received: 0,
                                    total: total,
                                    timestamp: Date.now()
                                });
                            }

                            const message = this.messages.get(messageId);
                            message.chunks[index] = chunkData;
                            message.received++;

                            // If all chunks received, process complete message
                            if (message.received === message.total) {
                                const completeMessage = message.chunks.join('');
                                console.log(formatLog(`📥 Complete message received from peer ${this.peerId}: ${completeMessage}`));
                                
                                try {
                                    // Try to parse the complete message
                                    let dataObj;
                                    try {
                                        // First parse the outer message
                                        const outerObj = JSON.parse(completeMessage);
                                        console.log(formatLog(`📥 Parsed outer message from peer ${this.peerId}: ${JSON.stringify(outerObj)}`));
                                        
                                        // Then parse the inner message in the data field if it exists
                                        if (outerObj.data) {
                                            try {
                                                dataObj = JSON.parse(outerObj.data);
                                                console.log(formatLog(`📥 Parsed inner message from peer ${this.peerId}: ${JSON.stringify(dataObj)}`));
                                            } catch (e) {
                                                console.log(formatLog(`Failed to parse inner message from peer ${this.peerId}: ${e.message}`));
                                                dataObj = outerObj; // Use outer object if inner parse fails
                                            }
                                        } else {
                                            dataObj = outerObj; // Use outer object if no data field
                                        }
                                        
                                        // Handle twist commands
                                        if (dataObj.topic === "twist") {
                                            console.log(formatLog(`Processing twist command from peer ${this.peerId}: ${JSON.stringify(dataObj.twist)}`));
                                            velocityPub.publish(dataObj.twist);
                                        } else if (dataObj.twist) {
                                            // Direct twist object
                                            console.log(formatLog(`Processing direct twist object from peer ${this.peerId}: ${JSON.stringify(dataObj.twist)}`));
                                            velocityPub.publish(dataObj.twist);
                                        }
                                        
                                        // Handle speak commands
                                        if (dataObj.topic === "speak") {
                                            console.log(formatLog(`Processing speak command from peer ${this.peerId}: ${dataObj.text}`));
                                            speak(dataObj.text);
                                        }
                                    } catch (e) {
                                        console.log(formatLog(`Failed to parse message from peer ${this.peerId}: ${e.message}`));
                                        // If parsing fails, try direct command format
                                        if (completeMessage.startsWith('twist:')) {
                                            try {
                                                const twistData = JSON.parse(completeMessage.slice(6));
                                                console.log(formatLog(`Processing direct twist command from peer ${this.peerId}: ${JSON.stringify(twistData)}`));
                                                velocityPub.publish(twistData);
                                            } catch (e) {
                                                console.error(formatLog(`Failed to parse twist command from peer ${this.peerId}: ${e.message}`));
                                            }
                                        } else if (completeMessage.startsWith('speak:')) {
                                            const speakText = completeMessage.slice(6);
                                            console.log(formatLog(`Processing direct speak command from peer ${this.peerId}: ${speakText}`));
                                            speak(speakText);
                                        }
                                    }
                                } catch (error) {
                                    console.error(formatLog(`Error parsing complete message from peer ${this.peerId}: ${error}`));
                                }
                                this.messages.delete(messageId);
                            } else {
                                console.log(formatLog(`Received chunk ${index + 1}/${total} for message ${messageId} from peer ${this.peerId}`));
                            }
                        } catch (parseError) {
                            console.error(formatLog(`Error parsing binary message from peer ${this.peerId}: ${parseError}`));
                        }
                    } else {
                        // Handle legacy string messages
                        console.log(formatLog(`📥 Received legacy message from peer ${this.peerId} (raw): ${msg}`));
                        console.log(formatLog(`📥 Message type from peer ${this.peerId}: ${typeof msg}`));
                        console.log(formatLog(`📥 Message length from peer ${this.peerId}: ${msg.length}`));
                        
                        try {
                            // Handle the message directly
                            if (typeof msg === 'string') {
                                let dataObj;
                                try {
                                    // First try to parse as JSON
                                    dataObj = JSON.parse(msg);
                                    console.log(formatLog(`📥 Parsed message as JSON from peer ${this.peerId}: ${JSON.stringify(dataObj)}`));
                                    
                                    // Handle twist commands
                                    if (dataObj.topic === "twist") {
                                        console.log(formatLog(`Processing twist command from peer ${this.peerId}: ${JSON.stringify(dataObj.twist)}`));
                                        velocityPub.publish(dataObj.twist);
                                    } else if (dataObj.twist) {
                                        // Direct twist object
                                        console.log(formatLog(`Processing direct twist object from peer ${this.peerId}: ${JSON.stringify(dataObj.twist)}`));
                                        velocityPub.publish(dataObj.twist);
                                    }
                                    
                                    // Handle speak commands
                                    if (dataObj.topic === "speak") {
                                        console.log(formatLog(`Processing speak command from peer ${this.peerId}: ${dataObj.text}`));
                                        speak(dataObj.text);
                                    }
                                } catch (e) {
                                    console.log(formatLog(`Failed to parse as JSON from peer ${this.peerId}: ${e.message}`));
                                    // If parsing fails, try direct command format
                                    if (msg.startsWith('twist:')) {
                                        try {
                                            const twistData = JSON.parse(msg.slice(6));
                                            console.log(formatLog(`Processing direct twist command from peer ${this.peerId}: ${JSON.stringify(twistData)}`));
                                            velocityPub.publish(twistData);
                                        } catch (e) {
                                            console.error(formatLog(`Failed to parse twist command from peer ${this.peerId}: ${e.message}`));
                                        }
                                    } else if (msg.startsWith('speak:')) {
                                        const speakText = msg.slice(6);
                                        console.log(formatLog(`Processing direct speak command from peer ${this.peerId}: ${speakText}`));
                                        speak(speakText);
                                    }
                                }
                            }
                        } catch (error) {
                            console.error(formatLog(`Error processing message from peer ${this.peerId}: ${error.message}`));
                        }
                    }
                } catch (e) {
                    console.error(formatLog(`Message handling error from peer ${this.peerId}: ${e}`));
                }
            });

            // Add message handler for binary messages
            if (typeof dc.onMessageBinary === 'function') {
                dc.onMessageBinary((msg) => {
                    console.log(formatLog(`📥 Received binary message (${msg.length} bytes)`));
                    try {
                        // Ensure we have enough bytes for the header
                        if (msg.length < 52) {
                            console.warn(formatLog(`Message too short (${msg.length} bytes), expected at least 52 bytes`));
                            return;
                        }

                        // Parse binary message header
                        const index = Number(msg.readBigUInt64BE(0));
                        const total = Number(msg.readBigUInt64BE(8));
                        
                        // Validate array lengths
                        if (isNaN(index) || isNaN(total) || index < 0 || total <= 0 || index >= total) {
                            console.warn(formatLog(`Invalid message header: index=${index}, total=${total}`));
                            return;
                        }

                        const messageId = msg.slice(16, 52).toString('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
                        const chunkData = msg.slice(52).toString();

                        // Reconstruct message if needed
                        if (!this.messages.has(messageId)) {
                            this.messages.set(messageId, {
                                chunks: new Array(total).fill(null),
                                received: 0,
                                total: total,
                                timestamp: Date.now()
                            });
                        }

                        const message = this.messages.get(messageId);
                        message.chunks[index] = chunkData;
                        message.received++;

                        // If all chunks received, process complete message
                        if (message.received === message.total) {
                            const completeMessage = message.chunks.join('');
                            console.log(formatLog(`📥 Complete message received: ${completeMessage}`));
                            
                            try {
                                // Try to parse the complete message
                                let dataObj;
                                try {
                                    // First parse the outer message
                                    const outerObj = JSON.parse(completeMessage);
                                    console.log(formatLog(`📥 Parsed outer message: ${JSON.stringify(outerObj)}`));
                                    
                                    // Then parse the inner message in the data field if it exists
                                    if (outerObj.data) {
                                        try {
                                            dataObj = JSON.parse(outerObj.data);
                                            console.log(formatLog(`📥 Parsed inner message: ${JSON.stringify(dataObj)}`));
                                        } catch (e) {
                                            console.log(formatLog(`Failed to parse inner message: ${e.message}`));
                                            dataObj = outerObj; // Use outer object if inner parse fails
                                        }
                                    } else {
                                        dataObj = outerObj; // Use outer object if no data field
                                    }
                                    
                                    // Handle twist commands
                                    if (dataObj.topic === "twist") {
                                        console.log(formatLog(`Processing twist command: ${JSON.stringify(dataObj.twist)}`));
                                        velocityPub.publish(dataObj.twist);
                                    } else if (dataObj.twist) {
                                        // Direct twist object
                                        console.log(formatLog(`Processing direct twist object: ${JSON.stringify(dataObj.twist)}`));
                                        velocityPub.publish(dataObj.twist);
                                    }
                                    
                                    // Handle speak commands
                                    if (dataObj.topic === "speak") {
                                        console.log(formatLog(`Processing speak command: ${dataObj.text}`));
                                        speak(dataObj.text);
                                    }
                                } catch (e) {
                                    console.log(formatLog(`Failed to parse message: ${e.message}`));
                                    // If parsing fails, try direct command format
                                    if (completeMessage.startsWith('twist:')) {
                                        try {
                                            const twistData = JSON.parse(completeMessage.slice(6));
                                            console.log(formatLog(`Processing direct twist command: ${JSON.stringify(twistData)}`));
                                            velocityPub.publish(twistData);
                                        } catch (e) {
                                            console.error(formatLog(`Failed to parse twist command: ${e.message}`));
                                        }
                                    } else if (completeMessage.startsWith('speak:')) {
                                        const speakText = completeMessage.slice(6);
                                        console.log(formatLog(`Processing direct speak command: ${speakText}`));
                                        speak(speakText);
                                    }
                                }
                            } catch (error) {
                                console.error(formatLog(`Error parsing complete message: ${error}`));
                            }
                            this.messages.delete(messageId);
                        } else {
                            console.log(formatLog(`Received chunk ${index + 1}/${total} for message ${messageId}`));
                        }
                    } catch (parseError) {
                        console.error(formatLog(`Error parsing binary message: ${parseError}`));
                    }
                });
            } else {
                console.log(formatLog(`📥 onMessageBinary not available on data channel ${dc.getLabel()}, using regular onMessage only`));
            }

            dc.onError((e) => {
                console.error(formatLog(`Data channel error on ${dc.getLabel()}: ${e}`));
                this.channelErrors.set(dc.getLabel(), e);
                this.activeChannels.delete(dc.getLabel());
                
                // Only abort if all channels have errors
                const allChannelsHaveErrors = Array.from(this.dataChannels.values())
                    .every(ch => this.channelErrors.has(ch.getLabel()));
                
                if (allChannelsHaveErrors) {
                    this.dataChannelOpen = false;
                    this.isDataChannelReady = false;
                    this.abortSend = true;
                    this.cleanupChannel(dc);
                    if (this.activeChannels.size === 0) {
                        this.rosPaused = true;
                        this.cleanupSubscriptions();
                    }
                }
            });

            dc.onClosed(() => {
                console.log(formatLog(`Data channel ${dc.getLabel()} closed`));
                this.channelErrors.delete(dc.getLabel());
                this.activeChannels.delete(dc.getLabel());
                
                // Only abort if all channels are closed
                if (this.activeChannels.size === 0) {
                    this.dataChannelOpen = false;
                    this.isDataChannelReady = false;
                    this.abortSend = true;
                    this.cleanupChannel(dc);
                    this.rosPaused = true;
                    this.cleanupSubscriptions();
                }
            });

        } catch (setupError) {
            console.error(formatLog(`Error setting up data channel ${dc.getLabel()}: ${setupError}`));
        }
    }

    setupRosSubscriptions(dc) {
        if (!rosNode) {
            console.error(formatLog('ROS node not initialized, cannot setup subscriptions'));
            return;
        }

        console.log(formatLog('Cleaning up existing subscriptions...'));
        this.cleanupSubscriptions();

        if (rosTopics.length > 0) {
            console.log(formatLog('Subscribing to ROS topics:'), rosTopics);
            
            // Removed hard-coded topic addition - now only subscribes to topics from Firebase configuration
            
            rosTopics.forEach(({type, topic}) => {
                console.log(formatLog(`Setting up subscription for ${topic} with type ${type}`));
                try {
                    const subscriber = rosNode.createSubscription(type, topic, async (msg) => {
                        if (this.rosPaused) return;
                        if (!(this.dataChannelOpen && dc.isOpen())) return;

                        try {
                            var modTopic = toClientTopic(topic, robotId, rosNamespace);
                            const isBrowserPeer = this.peerId.startsWith('browser-');
                            const isCameraMessage = modTopic === '/camera2d' ||
                                                  topic === '/camera/camera/color/image_raw/compressed' ||
                                                  topic === '/camera/camera/color/image_raw';

                            // Browser teleop only needs color/camera2d
                            if (isBrowserPeer && !isCameraMessage) return;
                            if (!((isBrowserPeer && isCameraMessage) || !isBrowserPeer)) return;

                            // Prefer compressed; skip raw RGB encode (starves remote CLI / twist).
                            if (topic === '/camera/camera/color/image_raw') {
                                return;
                            }
                            if (topic === '/camera/camera/color/image_raw/compressed') {
                                try {
                                    const now = Date.now();
                                    // Don't pile onto an in-flight WebRTC send (starves twist/status).
                                    if (this.sendingMessages.has(modTopic)) return;
                                    if (now - this._lastCameraSendAt < this.cameraSendIntervalMs) {
                                        return;
                                    }

                                    let imageData = msg.data || msg;
                                    if (!imageData) return;

                                    const input = Buffer.isBuffer(imageData)
                                        ? imageData
                                        : Buffer.from(imageData);

                                    // Hard cap: >40KB JPEG will choke datachannels. Downscale for teleop.
                                    const MAX_JPEG_BYTES = 40 * 1024;
                                    let jpegBuf = input;
                                    let outW = msg.width;
                                    let outH = msg.height;
                                    if (input.length > MAX_JPEG_BYTES) {
                                        try {
                                            jpegBuf = await Promise.race([
                                                sharp(input)
                                                    .resize({
                                                        width: 424,
                                                        height: 240,
                                                        fit: 'inside',
                                                        withoutEnlargement: true
                                                    })
                                                    .jpeg({ quality: 50 })
                                                    .toBuffer(),
                                                new Promise((_, reject) =>
                                                    setTimeout(() => reject(new Error('Sharp conversion timeout')), 3000)
                                                ),
                                            ]);
                                            outW = 424;
                                            outH = 240;
                                        } catch (e) {
                                            if (input.length > 120 * 1024) {
                                                // Too large and can't downscale — drop frame
                                                if (now - this._lastCameraLogAt > 5000) {
                                                    this._lastCameraLogAt = now;
                                                    console.warn(formatLog(`📸 Dropping oversized frame (${input.length} bytes): ${e.message || e}`));
                                                }
                                                return;
                                            }
                                            jpegBuf = input;
                                        }
                                    }

                                    const base64Image = jpegBuf.toString('base64');
                                    this._lastCameraSendAt = now;
                                    if (now - this._lastCameraLogAt > 5000) {
                                        this._lastCameraLogAt = now;
                                        console.log(formatLog(
                                            `📸 Teleop frame ${topic}: ${jpegBuf.length} bytes jpeg / ${base64Image.length} chars b64`
                                        ));
                                    }

                                    const messageWithBase64 = {
                                        robotId: robotId,
                                        topic: modTopic,
                                        data: base64Image,
                                        encoding: 'base64',
                                        width: outW,
                                        height: outH,
                                        timestamp: now
                                    };
                                    this.updateLatestMessage(modTopic, messageWithBase64);
                                    globalCameraData.set(modTopic, {
                                        data: base64Image,
                                        timestamp: now
                                    });
                                } catch (error) {
                                    console.error('Error converting image to base64:', error);
                                }
                            } else {
                                this.updateLatestMessage(modTopic, {
                                    robotId: robotId,
                                    topic: modTopic,
                                    data: msg
                                });
                                if (modTopic === '/camera2d' && msg && typeof msg === 'string' && msg.length > 100) {
                                    globalCameraData.set(modTopic, {
                                        data: msg,
                                        timestamp: Date.now()
                                    });
                                }
                            }
                        } catch (error) {
                            console.warn(formatLog(`Failed to send message on topic ${topic}: ${error}`));
                        }
                    });
                    this.subscribers.push(subscriber);
                    console.log(formatLog(`Successfully subscribed to ${topic} with message type ${type}`));
                } catch (err) {
                    console.error(formatLog(`Error setting up subscription for ${topic}: ${err}`));
                }
            });
        } else {
            console.log(formatLog('No ROS topics identified.'));
        }
    }

    initRcl(dc) {
        try {
            firstRun = false;
            console.log(formatLog('Initializing ROS node for P2P connection...'));
            
            // Check if ROS is already initialized by standalone subscriptions
            if (rosNode) {
                console.log(formatLog('ROS node already initialized, setting up P2P-specific subscriptions...'));

                const isBrowserPeer = this.peerId.startsWith('browser-');
                if (isBrowserPeer) {
                    this._browserMediaReady = true;
                    this.setupRosSubscriptions(dc);
                    this.startBrowserVideoBridge();
                } else {
                    this.setupRosSubscriptions(dc);
                }

                // Also setup subscriptions for any other open data channels
                this.dataChannels.forEach((channel, label) => {
                    if (channel.isOpen() && label !== dc.getLabel()) {
                        console.log(formatLog(`Setting up subscriptions for existing channel: ${label}`));
                        // Already bound once for browser; skip re-bind races
                        if (!isBrowserPeer) {
                            this.setupRosSubscriptions(channel);
                        }
                    }
                });
                
                return;
            }
            
            // Initialize ROS if not already done
            rclnodejs.init().then(() => {
                console.log(formatLog('RCL initialized successfully'));
                rosNode = new rclnodejs.Node('robotics_dev_node');
                console.log(formatLog('ROS node created successfully'));
                velocityPub = rosNode.createPublisher('geometry_msgs/msg/Twist', `${cmdVel}`);
                console.log(formatLog('Velocity publisher created successfully'));

                // Setup subscriptions after ROS node is fully initialized
                console.log(formatLog('Setting up ROS subscriptions...'));
                this._browserMediaReady = true;
                this.setupRosSubscriptions(dc);
                if (this.peerId.startsWith('browser-')) {
                    this.startBrowserVideoBridge();
                }

                console.log(formatLog('Starting ROS node spin...'));
                rosNode.spin();
                console.log(formatLog('ROS node is now running'));
            }).catch(error => {
                console.error(formatLog(`RCL initialization failed: ${error}`));
            });
        } catch (error) {
            console.error(formatLog(`RCL error: ${error}`));
        }
    }

    /**
     * Push latest standalone camera frames over WebRTC at ~6 FPS.
     * Survives P2P subscription races after re-peer (standalone already fills globalCameraData).
     */
    startBrowserVideoBridge() {
        this.stopBrowserVideoBridge();
        const topics = [
            '/camera/camera/color/image_raw/compressed',
            '/camera/camera/color/image_raw',
            '/camera2d',
        ];
        console.log(formatLog('Starting browser video bridge from globalCameraData'));
        this._videoBridgeTimer = setInterval(() => {
            if (this.rosPaused || !this.dataChannelOpen) return;
            if (this.connectionState !== 'connected') return;

            let best = null;
            let bestTopic = null;
            for (const topic of topics) {
                const entry = globalCameraData.get(topic);
                if (!entry?.data || typeof entry.data !== 'string' || entry.data.length < 100) continue;
                if (Date.now() - entry.timestamp > 3000) continue;
                best = entry;
                bestTopic = topic;
                break;
            }
            if (!best) return;

            // Prefer the compressed topic name the teleop UI expects
            const sendTopic = bestTopic === '/camera2d'
                ? '/camera/camera/color/image_raw/compressed'
                : bestTopic;

            if (this.sendingMessages.has(sendTopic)) return;
            const now = Date.now();
            if (now - this._lastCameraSendAt < this.cameraSendIntervalMs) return;
            this._lastCameraSendAt = now;

            this.updateLatestMessage(sendTopic, {
                robotId: robotId,
                topic: sendTopic,
                data: best.data,
                encoding: 'base64',
                timestamp: best.timestamp,
            });
        }, this.cameraSendIntervalMs);
    }

    stopBrowserVideoBridge() {
        if (this._videoBridgeTimer) {
            clearInterval(this._videoBridgeTimer);
            this._videoBridgeTimer = null;
        }
    }

    cleanupSubscriptions() {
        if (this.subscribers) {
            this.subscribers.forEach(sub => {
                if (sub) {
                    if (typeof sub.destroy === 'function') {
                        try { sub.destroy(); console.log(formatLog('Called destroy() on subscriber'), sub); } catch (e) { console.warn('destroy() error', e); }
                    } else if (typeof sub.unsubscribe === 'function') {
                        try { sub.unsubscribe(); console.log(formatLog('Called unsubscribe() on subscriber'), sub); } catch (e) { console.warn('unsubscribe() error', e); }
                    } else if (typeof sub.close === 'function') {
                        try { sub.close(); console.log(formatLog('Called close() on subscriber'), sub); } catch (e) { console.warn('close() error', e); }
                    } else {
                        console.warn(formatLog('No destroy/unsubscribe/close method on subscriber'), sub);
                    }
                }
            });
            this.subscribers = [];
        }
    }

    cleanupChannel(dc) {
        try {
            if (dc) {
                const label = dc.getLabel();
                console.log(formatLog(`Cleaning up channel ${label}`));
                if (dc.isOpen()) {
                    dc.close();
                }
                this.dataChannels.delete(label); // Use label as key
                console.log(formatLog(`Channel ${label} removed from dataChannels. Remaining: [${Array.from(this.dataChannels.values()).map(ch => ch.getLabel()).join(', ')}]`));
            }
        } catch (error) {
            console.error(formatLog(`Error cleaning up channel: ${error}`));
        }
    }

    handleReconnect() {
        if (this.isReconnecting) {
            console.log(formatLog(`Already attempting to reconnect to peer ${this.peerId}`));
            return;
        }

        const now = Date.now();
        if (now - this.lastReconnectAttempt < this.reconnectCooldown) {
            console.log(formatLog(`Skipping reconnect attempt for peer ${this.peerId} - cooldown period`));
            return;
        }

        this.reconnectAttempts++;
        this.lastReconnectAttempt = now;
        const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
        
        console.log(formatLog(`Attempting to reconnect to peer ${this.peerId} in ${delay}ms (attempt ${this.reconnectAttempts})`));
        
        this.reconnectTimer = setTimeout(() => {
            if (this.connectionState !== 'connected' && !this.isReconnecting) {
                console.log(formatLog(`Reconnecting to peer ${this.peerId}...`));
                this.reconnect();
            }
        }, delay);
    }

    async reconnect() {
        // Teleop browser is always the offerer. Native node-datachannel PeerConnection
        // has no createOffer(); previous reconnect logic threw and poisoned the PC.
        // Just reset and wait for the next browser offer.
        console.log(formatLog(`Resetting peer ${this.peerId} — waiting for browser re-offer`));
        this.isReconnecting = false;
        this.hasRemoteDescription = false;
        this.candidateQueue = [];
        this.dataChannelOpen = false;
        this.isDataChannelReady = false;
        try {
            this.initializePeerConnection();
        } catch (error) {
            console.error(formatLog(`Error resetting peer connection: ${error}`));
        }
        if (this.socket?.connected) {
            this.socket.emit('peer-status', {
                peerId: this.peerId,
                status: 'disconnected'
            });
        }
    }

    cleanup() {
        this.clearAllTimers();
        this.stopBrowserVideoBridge();
        this._browserMediaReady = false;
        this.cleanupSubscriptions();
        this.dataChannels.forEach((channel, index) => {
            this.cleanupChannel(channel);
        });
        this.dataChannels.clear();
        this.channelErrors.clear();
        this.activeSends.clear();
        this.activeChannels.clear();
        this.messages.clear(); // Clear all pending messages
        
        // NEW: Clean up non-queuing message system
        this.pendingMessages.clear();
        this.sendingMessages.clear();
        this.messageSendQueue.length = 0;
        this.isProcessingQueue = false;
        
        if (this.pc) {
            try {
                this.pc.close();
            } catch (error) {
                console.error(formatLog(`Error closing peer connection: ${error}`));
            }
        }
        this.isReconnecting = false;
        this.dataChannelRetryCount = 0;
        this.isCreatingChannels = false;
        this.latestMessages.clear();
        this.lastSentTime.clear();
    }

    // NEW: Test method to verify non-queuing system
    testNonQueuingSystem() {
        if (!messageConfig.enableNonQueuing) {
            console.log(formatLog('Non-queuing system is disabled'));
            return;
        }
        
        console.log(formatLog('Testing non-queuing message system...'));
        
        // Test rapid message updates
        const testTopic = '/test_topic';
        let messageCount = 0;
        
        const testInterval = setInterval(() => {
            messageCount++;
            this.updateLatestMessage(testTopic, {
                robotId: robotId,
                topic: testTopic,
                data: { count: messageCount, timestamp: Date.now() }
            });
            
            if (messageCount >= 10) {
                clearInterval(testInterval);
                console.log(formatLog(`Non-queuing test completed. Only the latest message should be sent.`));
            }
        }, 10); // Send 10 messages rapidly (every 10ms)
    }
    
    // NEW: Performance monitoring for non-queuing system
    logPerformanceStats() {
        if (!messageConfig.enableNonQueuing) return;
        
        const stats = {
            pendingMessages: this.pendingMessages.size,
            sendingMessages: this.sendingMessages.size,
            activeChannels: this.activeChannels.size,
            dataChannels: this.dataChannels.size,
            channelErrors: this.channelErrors.size,
            messageQueueLength: this.messageSendQueue.length
        };
        
        console.log(formatLog(`Performance Stats: ${JSON.stringify(stats)}`));
    }
}

// Main execution
async function main() {
    const server = new P2PServer();
    
    // Start memory monitoring
    startMemoryMonitoring();

    process.on('SIGINT', () => {
        console.log(formatLog('Shutting down...'));
        stopMemoryMonitoring();
        server.cleanup();
        if (rosNode) {
            try {
                rosNode.destroy();
            } catch (error) {
                console.error(formatLog(`Error destroying ROS node: ${error}`));
            }
        }
        rclnodejs.shutdown();
        // socket.close();
        nodeDataChannel.cleanup();
        process.exit(0);
    });

    await server.start();
}

main().catch(error => {
    console.error(formatLog(`Fatal error: ${error}`));
    process.exit(1);
});