#!/usr/bin/env node
/**
 * Set OpenClaw gateway to no-auth mode for local development so that:
 * - Web chat (Control UI) loads without a token
 * - AgenticROS plugin routes (config, teleop) are accepted and load at /plugins/agenticros/
 *
 * In OpenClaw 2026.3.2, when gateway.auth is token-based, the gateway rejects plugin
 * HTTP route registration ("missing or invalid auth"), so plugin pages return 404.
 * Setting gateway.auth.mode to "none" fixes this for loopback-only use.
 *
 * Usage:
 *   node scripts/setup-openclaw-local.cjs
 *   # Restart the gateway: openclaw gateway
 *   # Then open: http://127.0.0.1:18789/ (web chat) and http://127.0.0.1:18789/plugins/agenticros/
 *
 * WARNING: Only use on a gateway bound to 127.0.0.1. Do not use on a LAN/internet-facing gateway.
 */

const fs = require('fs');
const path = require('path');

const configPath = process.env.OPENCLAW_CONFIG || path.join(process.env.HOME || '', '.openclaw', 'openclaw.json');

let config;
try {
  const raw = fs.readFileSync(configPath, 'utf8');
  config = JSON.parse(raw);
} catch (e) {
  console.error('Could not read OpenClaw config:', configPath, e.message);
  process.exit(1);
}

if (!config.gateway) {
  config.gateway = {};
}
if (!config.gateway.auth) {
  config.gateway.auth = {};
}

const prev = config.gateway.auth.mode;
config.gateway.auth.mode = 'none';
// Remove token so the gateway does not re-enable token auth; with mode "none" it is ignored anyway
if (config.gateway.auth.token) {
  delete config.gateway.auth.token;
}

if (prev === 'none' && !config.gateway.auth.token) {
  console.log('OpenClaw is already set to auth.mode "none" at', configPath);
  process.exit(0);
}

// Backup
const backupPath = configPath + '.bak.' + Date.now();
try {
  fs.copyFileSync(configPath, backupPath);
  console.log('Backed up config to', backupPath);
} catch (e) {
  console.warn('Could not create backup:', e.message);
}

try {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
} catch (e) {
  console.error('Could not write config:', e.message);
  process.exit(1);
}

console.log('');
console.log('  Set gateway.auth.mode to "none" in', configPath);
console.log('  Restart the gateway (openclaw gateway), then open:');
console.log('    - Web chat:  http://127.0.0.1:18789/');
console.log('    - AgenticROS config & teleop:  http://127.0.0.1:18789/plugins/agenticros/');
console.log('');
console.log('  For local use only (127.0.0.1). To restore token auth later, set gateway.auth.mode to "token" and add gateway.auth.token.');
console.log('');
