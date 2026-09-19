import { chromium as playwrightChromium, type Browser } from 'playwright-core';
import sparticuzChromium from '@sparticuz/chromium';

/**
 * Launches headless Chromium. Inside Lambda, uses the @sparticuz/chromium
 * binary bundled with the function. Locally, relies on a browser installed
 * via `npx playwright install chromium` (playwright-core shares that cache).
 */
export async function launchBrowser(): Promise<Browser> {
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return playwrightChromium.launch({
      args: sparticuzChromium.args,
      executablePath: await sparticuzChromium.executablePath(),
      headless: true,
    });
  }
  return playwrightChromium.launch({ headless: true });
}
