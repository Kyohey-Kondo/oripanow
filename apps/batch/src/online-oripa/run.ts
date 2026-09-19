import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { TABLE_NAMES } from '@oripa-now/db';
import { queryActiveOnlineOripaItems } from '@oripa-now/db/queries/online-oripa-items';
import { findMissingItems, isAnomalousDrop } from './diff';
import { markItemMissed, upsertSeenItem } from './save';
import type { ScrapedItem } from './types';

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

/**
 * Shared scrape → diff → save orchestration for one provider. The DynamoDB
 * table holds items from every provider, so "active items before this run"
 * must be scoped to this provider only — otherwise another provider's items
 * look like they went missing every time this one runs.
 */
export async function runProviderScrape(
  provider: string,
  scrape: () => Promise<ScrapedItem[]>,
): Promise<ScrapeRunResult> {
  const now = new Date().toISOString();
  const allActiveItems = await queryActiveOnlineOripaItems(docClient, TABLE_NAMES.onlineOripaItems);
  const activeItemsBefore = allActiveItems.filter((item) => item.provider === provider);

  const scraped = await scrape();

  const anomalyDetected = isAnomalousDrop(activeItemsBefore.length, scraped.length);

  if (anomalyDetected) {
    const result: ScrapeRunResult = {
      runAt: now,
      provider,
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
    await upsertSeenItem(docClient, provider, item, now);
  }

  const missing = findMissingItems(activeItemsBefore, scraped);
  let itemsDeactivated = 0;
  for (const item of missing) {
    const deactivated = await markItemMissed(docClient, item, now);
    if (deactivated) itemsDeactivated++;
  }

  const result: ScrapeRunResult = {
    runAt: now,
    provider,
    scrapedCount: scraped.length,
    activeCountBefore: activeItemsBefore.length,
    itemsUpserted: scraped.length,
    itemsMissed: missing.length,
    itemsDeactivated,
    anomalyDetected: false,
  };
  console.log(JSON.stringify({ level: 'INFO', ...result }));
  return result;
}
