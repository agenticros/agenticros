/**
 * Logging primitives for the CLI: coloured headers, status lines, spinners.
 *
 * Wraps picocolors + ora behind a thin interface so the rest of the CLI imports
 * a single module. Honours `--no-color` (picocolors respects FORCE_COLOR / NO_COLOR
 * automatically) and degrades gracefully when stdout is not a TTY.
 */

import oraImport, { type Ora } from "ora";
import pc from "picocolors";

/** Whether stdout is a TTY (used to suppress spinners in pipes / CI). */
export const isTty: boolean = Boolean(process.stdout.isTTY);

export const colors = pc;

export function header(title: string): void {
  const line = "─".repeat(Math.min(title.length + 4, 60));
  process.stdout.write(`\n${pc.bold(pc.cyan(`╔${line}╗`))}\n`);
  process.stdout.write(`${pc.bold(pc.cyan(`║  ${title}  ║`))}\n`);
  process.stdout.write(`${pc.bold(pc.cyan(`╚${line}╝`))}\n\n`);
}

export function info(message: string): void {
  process.stdout.write(`${pc.cyan("›")} ${message}\n`);
}

export function ok(message: string): void {
  process.stdout.write(`${pc.green("✓")} ${message}\n`);
}

export function warn(message: string): void {
  process.stdout.write(`${pc.yellow("!")} ${pc.yellow(message)}\n`);
}

export function err(message: string): void {
  process.stderr.write(`${pc.red("✗")} ${pc.red(message)}\n`);
}

export function dim(message: string): void {
  process.stdout.write(`  ${pc.dim(message)}\n`);
}

/**
 * Spinner for a short async operation. Falls back to a plain "› message …" line
 * when stdout is not a TTY.
 */
export async function withSpinner<T>(
  message: string,
  task: () => Promise<T>,
): Promise<T> {
  if (!isTty) {
    process.stdout.write(`${pc.cyan("›")} ${message} ...\n`);
    try {
      const value = await task();
      process.stdout.write(`${pc.green("✓")} ${message}\n`);
      return value;
    } catch (e) {
      process.stdout.write(`${pc.red("✗")} ${message}\n`);
      throw e;
    }
  }
  const spinner: Ora = oraImport({ text: message, spinner: "dots" }).start();
  try {
    const value = await task();
    spinner.succeed(message);
    return value;
  } catch (e) {
    spinner.fail(message);
    throw e;
  }
}
