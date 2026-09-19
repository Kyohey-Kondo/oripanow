import { launchBrowser } from './browser';
import { runProviderScrape, type ScrapeRunResult } from './run';
import { scrapeOrikujiPokemonItems } from './scrape';

export type { ScrapeRunResult };

export const handler = async (): Promise<ScrapeRunResult> =>
  runProviderScrape('orikuji', async () => {
    const browser = await launchBrowser();
    try {
      const page = await browser.newPage();
      return await scrapeOrikujiPokemonItems(page);
    } finally {
      await browser.close();
    }
  });
