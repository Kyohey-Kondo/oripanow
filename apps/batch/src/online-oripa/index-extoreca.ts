import { scrapeExtorecaPokemonItems } from './extoreca';
import { runProviderScrape, type ScrapeRunResult } from './run';

export type { ScrapeRunResult };

export const handler = async (): Promise<ScrapeRunResult> =>
  runProviderScrape('extoreca', scrapeExtorecaPokemonItems);
