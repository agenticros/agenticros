export function robotPrefix(robotId) {
  return `/robot${robotId.replace(/-/g, '')}`;
}

export function resolveTopic(baseName, robotId, rosNamespace) {
  const name = baseName.startsWith('/') ? baseName.slice(1) : baseName;
  return rosNamespace ? `${robotPrefix(robotId)}/${name}` : `/${name}`;
}

export function toClientTopic(rosTopic, robotId, rosNamespace) {
  if (!rosNamespace) {
    return rosTopic;
  }
  const prefix = robotPrefix(robotId);
  if (rosTopic.startsWith(`${prefix}/`)) {
    return rosTopic.slice(prefix.length);
  }
  return rosTopic;
}

export async function fetchRobotConfig(robotId, apiToken, server = 'https://cloud.agenticros.com') {
  const defaults = {
    rosNamespace: false,
    cmdVel: '',
    rosTopics: [],
  };

  if (!robotId || !apiToken) {
    return defaults;
  }

  try {
    const baseUrl = server.replace(/^wss:\/\//, 'https://').replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/robot/${robotId}`, {
      headers: {
        'Content-Type': 'application/json',
        'api_token': apiToken,
      },
    });

    if (!response.ok) {
      return defaults;
    }

    const data = await response.json();
    return {
      rosNamespace: data.rosNamespace === true,
      cmdVel: data.cmdVel || '',
      rosTopics: data.rosTopics || [],
      camera: data.camera || '',
      compute: data.compute || '',
      wheelCount: data.wheelCount,
      wheelBetween: data.wheelBetween,
      wheelDiameter: data.wheelDiameter,
      ticksPerRevolution: data.ticksPerRevolution,
    };
  } catch (error) {
    console.error('Error fetching robot config:', error);
    return defaults;
  }
}

export function getCmdVelTopic(robotId, config) {
  if (config.cmdVel && config.cmdVel !== '') {
    return config.cmdVel;
  }
  return resolveTopic('cmd_vel', robotId, config.rosNamespace);
}

/**
 * node-datachannel only accepts ICE server *strings*
 * (e.g. "stun:host:port" or "turn:user:pass@host:port").
 * Browser-style {urls, username, credential} objects throw:
 * "IceServer config error (hostname OR/AND port is not suitable)"
 * and PeerConnection never starts — teleop gets no answer.
 */
function formatIceServerForNode(entry) {
  if (typeof entry === 'string') return entry;
  if (!entry || typeof entry !== 'object') return null;

  const url = Array.isArray(entry.urls) ? entry.urls[0] : entry.urls;
  if (!url || typeof url !== 'string') return null;

  // Already a full turn:user:pass@host form
  if (/^turns?:[^:@]+:[^@]+@/i.test(url)) return url;

  if (entry.username && entry.credential) {
    // turn:host:port → turn:user:pass@host:port (preserve ?transport=)
    const m = url.match(/^(turns?:)([^?]+)(\?.*)?$/i);
    if (m) {
      return `${m[1]}${entry.username}:${entry.credential}@${m[2]}${m[3] || ''}`;
    }
  }

  return url;
}

export async function fetchIceServers(apiToken, server = 'https://cloud.agenticros.com') {
  const defaultServers = [
    'stun:stun1.l.google.com:19302',
    'stun:stun2.l.google.com:19302',
  ];

  if (!apiToken) {
    return defaultServers;
  }

  try {
    const baseUrl = server.replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://').replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/webrtc/ice-servers`, {
      headers: { 'api_token': apiToken },
    });

    if (!response.ok) {
      return defaultServers;
    }

    const data = await response.json();
    if (data.iceServers && data.iceServers.length > 0) {
      const formatted = data.iceServers
        .map(formatIceServerForNode)
        .filter(Boolean);
      if (formatted.length > 0) return formatted;
    }
  } catch (error) {
    console.error('Error fetching ICE servers:', error);
  }

  return defaultServers;
}
