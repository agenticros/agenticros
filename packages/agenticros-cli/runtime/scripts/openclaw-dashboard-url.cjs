#!/usr/bin/env node
/**
 * Ensure OpenClaw config has a gateway auth token and print the dashboard URL
 * so the web chat can connect (required in 2026.2.26 when using a token for WS auth).
 *
 * Usage: node scripts/openclaw-dashboard-url.cjs
 * Then open the printed URL in your browser.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const configPath = process.env.OPENCLAW_CONFIG || path.join(process.env.HOME || '', '.openclaw', 'openclaw.json');

let config;
try {
  const raw = fs.readFileSync(configPath, 'utf8');
  config = JSON.parse(raw);
} catch (e) {
  console.error('Could not read OpenClaw config:', configPath, e.message);
  process.exit(1);
}

if (!config.gateway) config.gateway = {};
if (!config.gateway.auth) config.gateway.auth = {};
const auth = config.gateway.auth;

let token = auth.token;
if (!token || typeof token !== 'string' || token.length === 0) {
  token = crypto.randomBytes(24).toString('base64url');
  auth.token = token;
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
    console.log('Added gateway.auth.token to', configPath);
  } catch (e) {
    console.error('Could not write config:', e.message);
    process.exit(1);
  }
}

const baseUrl = (config.gateway.url || 'http://127.0.0.1:18789').replace(/\/$/, '');
const dashboardUrl = baseUrl + '/#token=' + encodeURIComponent(token);
console.log('');
console.log('  Open this URL in your browser for the web chat:');
console.log('  ' + dashboardUrl);
console.log('');
console.log('  (Restart the gateway if it was already running when the token was added.)');
console.log('');
