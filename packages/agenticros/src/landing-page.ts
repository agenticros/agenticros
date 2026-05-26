/**
 * Returns the AgenticROS landing page HTML (links to Config and Teleop).
 *
 * `basePath` is the mount prefix where this plugin is served (e.g. `/plugins/agenticros`,
 * `/agenticros`, or `/api/agenticros`). Hrefs are built absolutely from it so the
 * buttons work whether the user opens the landing URL with or without a trailing slash.
 */
export function getLandingPageHtml(basePath = "/agenticros"): string {
  const base = basePath.replace(/\/+$/, "");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AgenticROS</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; margin: 12px; background: #1a1a1a; color: #e0e0e0; }
    h1 { font-size: 1.5rem; margin: 0 0 8px 0; }
    p { margin: 0 0 20px 0; color: #aaa; font-size: 0.95rem; }
    nav { display: flex; flex-wrap: wrap; gap: 12px; }
    a { display: inline-block; padding: 12px 20px; border-radius: 8px; background: #333; color: #e0e0e0; text-decoration: none; border: 1px solid #555; }
    a:hover { background: #444; color: #fff; }
    a.back { background: transparent; border-color: #444; color: #aaa; font-size: 0.9rem; padding: 6px 12px; margin-bottom: 12px; }
    a.back:hover { background: #2a2a2a; color: #e0e0e0; }
  </style>
</head>
<body>
  <a class="back" href="/">← Back to chat</a>
  <h1>AgenticROS</h1>
  <p>ROS2 + OpenClaw — natural language control of robots.</p>
  <nav>
    <a href="${base}/config">Config</a>
    <a href="${base}/teleop/">Teleop</a>
  </nav>
</body>
</html>`;
}
