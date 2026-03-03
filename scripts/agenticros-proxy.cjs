#!/usr/bin/env node
/**
 * Local proxy so you can open AgenticROS pages in a browser when the gateway
 * uses token auth. The gateway requires "Authorization: Bearer <token>" and
 * browsers can't send that for normal URLs; this proxy adds the header.
 *
 * Usage:
 *   node scripts/agenticros-proxy.cjs [port]
 *   Then open: http://127.0.0.1:<port>/plugins/agenticros/
 *
 * Reads gateway URL and token from ~/.openclaw/openclaw.json (gateway.auth.token).
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const port = parseInt(process.argv[2] || '18790', 10);
const configPath = process.env.OPENCLAW_CONFIG || path.join(process.env.HOME || '', '.openclaw', 'openclaw.json');

let gatewayOrigin = 'http://127.0.0.1:18789';
let token = '';

try {
  const raw = fs.readFileSync(configPath, 'utf8');
  const config = JSON.parse(raw);
  const auth = config.gateway?.auth;
  if (auth?.token) {
    token = auth.token;
  }
  if (config.gateway?.url) {
    gatewayOrigin = config.gateway.url.replace(/\/$/, '');
  }
} catch (e) {
  console.error('Could not read OpenClaw config:', configPath, e.message);
  process.exit(1);
}

if (!token) {
  console.error('No gateway.auth.token in', configPath);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  if (req.url === '/favicon.ico' || req.url === '/favicon.ico/') {
    res.writeHead(204, { 'Content-Length': '0' });
    res.end();
    return;
  }
  const isAgenticros = req.url?.startsWith('/api/agenticros') || req.url?.startsWith('/plugins/agenticros');
  if (!isAgenticros) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found. Open http://127.0.0.1:' + port + '/plugins/agenticros/');
    return;
  }

  const url = new URL(gatewayOrigin);
  const pathWithQuery = req.url || '/';
  const headers = { ...req.headers, host: url.host, authorization: 'Bearer ' + token };
  const qIdx = pathWithQuery.indexOf('?');
  if (qIdx !== -1) {
    headers['X-AgenticROS-Query'] = pathWithQuery.slice(qIdx + 1);
  }
  const opts = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: pathWithQuery,
    method: req.method,
    headers,
  };

  const proxy = http.request(opts, (upstream) => {
    const code = upstream.statusCode || 200;
    if (code === 401 || code === 403) {
      console.warn('Gateway returned ' + code + '. Check gateway.auth.token in', configPath);
    }
    res.writeHead(code, upstream.headers);
    upstream.pipe(res);
  });
  proxy.on('error', (e) => {
    console.error('Proxy error:', e.message);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Bad gateway: ' + e.message);
  });
  req.pipe(proxy);
});

server.listen(port, '127.0.0.1', () => {
  const gwUrl = new URL(gatewayOrigin);
  const gwPort = gwUrl.port || (gwUrl.protocol === 'https:' ? '443' : '80');
  console.log('');
  console.log('  Open this URL in your browser (this proxy adds the auth token):');
  console.log('  http://127.0.0.1:' + port + '/plugins/agenticros/');
  console.log('');
  console.log('  Gateway is at ' + gatewayOrigin + '  (port ' + gwPort + ' from ' + configPath + ')');
  console.log('  If you see Unauthorized on another port, use the URL above.');
  console.log('  If you get 503 (camera) or 502 (twist), run the gateway with a single worker (see docs/teleop.md).');
  console.log('');
});
