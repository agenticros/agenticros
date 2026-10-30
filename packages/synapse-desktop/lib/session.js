/**
 * The desktop agent has to run inside the Hyprland session. `synapse connect`
 * is often headless and does not have these variables.
 *
 * @param {NodeJS.ProcessEnv} [env]
 */
export function waylandSessionError(env = process.env) {
  const session = env.XDG_SESSION_TYPE || "";
  const display = env.WAYLAND_DISPLAY || "";
  if (session === "wayland" && display) return null;
  return (
    "synapse desktop must run inside a Wayland session " +
    `(XDG_SESSION_TYPE=${session || "(unset)"}, WAYLAND_DISPLAY=${display || "(unset)"}). ` +
    "Start it from the Hyprland session, or as a systemd --user service after the compositor has imported those variables."
  );
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 */
export function waylandSocketPath(env = process.env) {
  const runtime = env.XDG_RUNTIME_DIR;
  const display = env.WAYLAND_DISPLAY;
  if (!runtime || !display) return null;
  return `${runtime.replace(/\/$/, "")}/${display}`;
}
