/**
 * One-time migration: backfill lastTweetAt / lastOripaPostAt on existing stores.
 *
 * These two fields were added to StoreItem alongside the on-demand admin
 * "check now" feature. The daily/on-demand batch only ever *writes* them when
 * a run finds a new matching tweet — it never had a chance to populate them
 * from tweets/oripa-posts that were already stored before the fields existed.
 * Without this backfill, stores with a long history of real oripa posts show
 * as "no record" until they happen to post again.
 *
 * - Scans the stores table
 * - For each store, finds the most recent tweet (tweets GSI1: storeId → tweetedAt)
 *   and the most recent confirmed oripa post (oripa-posts GSI2: storeId → createdAt)
 * - Updates lastTweetAt / lastOripaPostAt accordingly (only fields with data found)
 * - Never deletes or overwrites with older values; safe to re-run
 *
 * Usage:
 *   AWS_REGION=ap-northeast-1 DEPLOY_ENV=dev \
 *     pnpm --filter @oripa-now/scripts exec tsx backfill-store-activity.ts
 *
 * Options (env vars):
 *   DEPLOY_ENV — table prefix (default: dev)
 *   AWS_REGION — (default: ap-northeast-1)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { TABLE_NAMES, GSI, type StoreItem } from '@oripa-now/db';

const DEPLOY_ENV = process.env.DEPLOY_ENV ?? 'dev';

const docClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION ?? 'ap-northeast-1' }),
);

async function scanStores(): Promise<StoreItem[]> {
  const result = await docClient.send(new ScanCommand({ TableName: TABLE_NAMES.stores }));
  const items = (result.Items ?? []) as StoreItem[];
  // The stores table also holds non-store bookkeeping rows (e.g. a leftover
  // GIVEAWAY_SEARCH_CURSOR item from the removed giveaway feature).
  return items.filter((item) => typeof item.area === 'string' && typeof item.name === 'string');
}

async function latestTweetedAt(storeId: string): Promise<string | undefined> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAMES.tweets,
      IndexName: GSI.tweetsByStore,
      KeyConditionExpression: 'storeId = :storeId',
      ExpressionAttributeValues: { ':storeId': storeId },
      ScanIndexForward: false,
      Limit: 1,
    }),
  );
  return result.Items?.[0]?.tweetedAt as string | undefined;
}

async function latestOripaPostCreatedAt(storeId: string): Promise<string | undefined> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAMES.oripaPosts,
      IndexName: GSI.oripaPostsByStore,
      KeyConditionExpression: 'storeId = :storeId',
      ExpressionAttributeValues: { ':storeId': storeId },
      ScanIndexForward: false,
      Limit: 1,
    }),
  );
  return result.Items?.[0]?.createdAt as string | undefined;
}

async function updateStoreActivity(
  storeId: string,
  lastTweetAt?: string,
  lastOripaPostAt?: string,
): Promise<void> {
  const sets: string[] = ['updatedAt = :updatedAt'];
  const values: Record<string, string> = { ':updatedAt': new Date().toISOString() };

  if (lastTweetAt) {
    sets.push('lastTweetAt = :lastTweetAt');
    values[':lastTweetAt'] = lastTweetAt;
  }
  if (lastOripaPostAt) {
    sets.push('lastOripaPostAt = :lastOripaPostAt');
    values[':lastOripaPostAt'] = lastOripaPostAt;
  }

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAMES.stores,
      Key: { storeId },
      UpdateExpression: `SET ${sets.join(', ')}`,
      ExpressionAttributeValues: values,
    }),
  );
}

async function main() {
  console.log(`=== Backfill lastTweetAt / lastOripaPostAt ===`);
  console.log(`DEPLOY_ENV: ${DEPLOY_ENV}\n`);

  const stores = await scanStores();
  console.log(`${stores.length} store(s) found.\n`);

  let updated = 0;
  let noHistory = 0;
  const errors: string[] = [];

  for (const store of stores) {
    try {
      const [lastTweetAt, lastOripaPostAt] = await Promise.all([
        latestTweetedAt(store.storeId),
        latestOripaPostCreatedAt(store.storeId),
      ]);

      if (!lastTweetAt && !lastOripaPostAt) {
        noHistory++;
        continue;
      }

      await updateStoreActivity(store.storeId, lastTweetAt, lastOripaPostAt);
      console.log(
        `✓ ${store.name}: lastTweetAt=${lastTweetAt ?? '-'} lastOripaPostAt=${lastOripaPostAt ?? '-'}`,
      );
      updated++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`✗ ${store.name}: ${msg}`);
      errors.push(store.name);
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Updated: ${updated} store(s)`);
  console.log(`No history found: ${noHistory} store(s)`);
  if (errors.length > 0) console.log(`Errors: ${errors.join(', ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
