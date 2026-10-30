export interface SynapseBannerOptions {
  color?: boolean;
  tagline?: boolean;
}

const ANSI_GREEN = "\x1b[92m";
const ANSI_YELLOW = "\x1b[93m";
const ANSI_DIM = "\x1b[2m";
const ANSI_RESET = "\x1b[0m";

const LOGO = String.raw`
    _                     _   _       ____   ___  ____
   / \   __ _  ___ _ __ | |_(_) ___ |  _ \ / _ \/ ___|
  / _ \ / _` + "`" + String.raw` |/ _ \ '_ \| __| |/ __|| |_) | | | \___ \
 / ___ \ (_| |  __/ | | | |_| | (__ |  _ <| |_| |___) |
/_/   \_\__, |\___|_| |_|\__|_|\___||_| \_\___/|____/
        |___/`;

export function renderSynapseBanner(options: SynapseBannerOptions = {}): string {
  const tagline = options.tagline ?? true;
  if (!options.color) {
    return tagline ? `${LOGO}\n  Corebrum Synapse - agentic AI for ROS-powered robots` : LOGO;
  }
  const coloredLogo = `${ANSI_GREEN}${LOGO}${ANSI_RESET}`;
  return tagline
    ? `${coloredLogo}\n${ANSI_YELLOW}  Corebrum Synapse${ANSI_RESET} ${ANSI_DIM}- agentic AI for ROS-powered robots${ANSI_RESET}`
    : coloredLogo;
}

export function synapseBannerLines(options: SynapseBannerOptions = {}): string[] {
  return renderSynapseBanner(options).split("\n");
}
