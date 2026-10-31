export interface SynapseBannerOptions {
  color?: boolean;
  tagline?: boolean;
}

const ANSI_GREEN = "\x1b[92m";
const ANSI_YELLOW = "\x1b[93m";
const ANSI_DIM = "\x1b[2m";
const ANSI_RESET = "\x1b[0m";

const LOGO = String.raw`
  ____                                   
 / ___| _   _ _ __   __ _ _ __  ___  ___ 
 \___ \| | | | '_ \ / _` + "`" + String.raw` | '_ \/ __|/ _ \
  ___) | |_| | | | | (_| | |_) \__ \  __/
 |____/ \__, |_| |_|\__,_| .__/|___/\___|
        |___/            |_|             `;

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
