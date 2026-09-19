import { scrapeDopaPokemonItems } from './dopa';
import { runProviderScrape, type ScrapeRunResult } from './run';

export type { ScrapeRunResult };

export const handler = async (): Promise<ScrapeRunResult> =>
  runProviderScrape('dopa', scrapeDopaPokemonItems);
