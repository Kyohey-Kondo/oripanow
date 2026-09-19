import { readdirSync, readFileSync, readlinkSync } from 'node:fs';
import { chromium as playwrightChromium, type Browser } from 'playwright-core';

/**
 * Kills any chromium-family process left over from a prior invocation on a
 * reused (warm) Lambda execution environment — /tmp and processes persist
 * across warm invocations there. No `pkill` binary on Lambda's minimal
 * Amazon Linux runtime, so this walks /proc directly instead.
 */
function killLeftoverChromiumProcesses(): void {
  let pids: string[];
  try {
    pids = readdirSync('/proc').filter((name) => /^\d+$/.test(name));
  } catch {
    return; // no /proc — nothing we can do, not fatal
  }

  for (const pid of pids) {
    if (Number(pid) === process.pid) continue;
    try {
      const exe = readlinkSync(`/proc/${pid}/exe`);
      const cmdline = readFileSync(`/proc/${pid}/cmdline`, 'utf8');
      if (/chromium|headless_shell/i.test(exe) || /chromium|headless_shell/i.test(cmdline)) {
        process.kill(Number(pid), 'SIGKILL');
      }
    } catch {
      // process gone, or unreadable (not ours, permission) — skip it
    }
  }
}

/**
 * Launches headless Chromium. Inside Lambda, uses the @sparticuz/chromium
 * binary bundled with the function. Locally, relies on a browser installed
 * via `npx playwright install chromium` (playwright-core shares that cache).
 *
 * @sparticuz/chromium ships as an ESM-only package ("type": "module"), while
 * this function is bundled as CommonJS like the rest of apps/batch — a static
 * import gets transpiled to require() and fails at runtime with ERR_REQUIRE_ESM.
 * A dynamic import() avoids that, since CJS can load ESM that way natively.
 */
export async function launchBrowser(): Promise<Browser> {
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    killLeftoverChromiumProcesses();

    const { default: sparticuzChromium } = await import('@sparticuz/chromium');
    return playwrightChromium.launch({
      args: sparticuzChromium.args,
      executablePath: await sparticuzChromium.executablePath(),
      headless: true,
    });
  }
  return playwrightChromium.launch({ headless: true });
}
