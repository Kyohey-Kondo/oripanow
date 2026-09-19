import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { TABLE_NAMES } from '@oripa-now/db';
import { queryActiveOnlineOripaItems } from '@oripa-now/db/queries/online-oripa-items';
import { launchBrowser } from './browser';
import { findMissingItems, isAnomalousDrop } from './diff';
import { scrapeOrikujiPokemonItems } from './scrape';
import { markItemMissed, upsertSeenItem } from './save';

const PROVIDER = 'orikuji';

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export type ScrapeRunResult = {
  runAt: string;
  provider: string;
  scrapedCount: number;
  activeCountBefore: number;
  itemsUpserted: number;
  itemsMissed: number;
  itemsDeactivated: number;
  anomalyDetected: boolean;
};

export const handler = async (): Promise<ScrapeRunResult> => {
  const now = new Date().toISOString();
  const activeItemsBefore = await queryActiveOnlineOripaItems(docClient, TABLE_NAMES.onlineOripaItems);

  const browser = await launchBrowser();
  let scraped;
  try {
    const page = await browser.newPage();
    scraped = await scrapeOrikujiPokemonItems(page);
  } finally {
    await browser.close();
  }

  const anomalyDetected = isAnomalousDrop(activeItemsBefore.length, scraped.length);

  if (anomalyDetected) {
    const result: ScrapeRunResult = {
      runAt: now,
      provider: PROVIDER,
      scrapedCount: scraped.length,
      activeCountBefore: activeItemsBefore.length,
      itemsUpserted: 0,
      itemsMissed: 0,
      itemsDeactivated: 0,
      anomalyDetected: true,
    };
    console.error(
      JSON.stringify({
        level: 'ERROR',
        message: 'anomalous drop in scraped item count — skipping DB update',
        ...result,
      }),
    );
    return result;
  }

  for (const item of scraped) {
    await upsertSeenItem(docClient, PROVIDER, item, now);
  }

  const missing = findMissingItems(activeItemsBefore, scraped);
  let itemsDeactivated = 0;
  for (const item of missing) {
    const deactivated = await markItemMissed(docClient, item, now);
    if (deactivated) itemsDeactivated++;
  }

  const result: ScrapeRunResult = {
    runAt: now,
    provider: PROVIDER,
    scrapedCount: scraped.length,
    activeCountBefore: activeItemsBefore.length,
    itemsUpserted: scraped.length,
    itemsMissed: missing.length,
    itemsDeactivated,
    anomalyDetected: false,
  };
  console.log(JSON.stringify({ level: 'INFO', ...result }));
  return result;
};
