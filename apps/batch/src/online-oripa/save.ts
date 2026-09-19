import { createHash } from 'node:crypto';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { TABLE_NAMES, type OnlineOripaItem } from '@oripa-now/db';
import { MAX_MISS_COUNT } from './diff';
import type { ScrapedItem } from './types';

/** Stable item id derived from productUrl, so re-scraping the same product upserts the same row. */
export function deriveItemId(productUrl: string): string {
  return createHash('sha1').update(productUrl).digest('hex');
}

/**
 * Upsert a scraped item as active: creates it on first sighting (firstSeenAt
 * = now) or refreshes an existing one (lastSeenAt = now, missCount reset).
 * Single UpdateCommand — no read-before-write needed.
 */
export async function upsertSeenItem(
  docClient: DynamoDBDocumentClient,
  provider: string,
  scraped: ScrapedItem,
  now: string,
): Promise<void> {
  const itemId = deriveItemId(scraped.productUrl);
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAMES.onlineOripaItems,
      Key: { itemId },
      UpdateExpression:
        'SET provider = :provider, productUrl = :productUrl, imageUrl = :imageUrl, ' +
        '#status = :active, missCount = :zero, lastSeenAt = :now, updatedAt = :now, ' +
        'activeStatus = :activeStatus, firstSeenAt = if_not_exists(firstSeenAt, :now)',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':provider': provider,
        ':productUrl': scraped.productUrl,
        ':imageUrl': scraped.imageUrl,
        ':active': 'active',
        ':zero': 0,
        ':now': now,
        ':activeStatus': 'ACTIVE',
      },
    }),
  );
}

/**
 * Bumps missCount for an item not seen this run. Once missCount reaches
 * MAX_MISS_COUNT, flips status to inactive and removes it from the GSI1
 * sparse index (REMOVE activeStatus). Returns whether it was deactivated.
 */
export async function markItemMissed(
  docClient: DynamoDBDocumentClient,
  item: OnlineOripaItem,
  now: string,
): Promise<boolean> {
  const missCount = item.missCount + 1;
  const deactivate = missCount >= MAX_MISS_COUNT;

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAMES.onlineOripaItems,
      Key: { itemId: item.itemId },
      ...(deactivate
        ? {
            UpdateExpression: 'SET missCount = :missCount, #status = :inactive, updatedAt = :now REMOVE activeStatus',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: { ':missCount': missCount, ':inactive': 'inactive', ':now': now },
          }
        : {
            UpdateExpression: 'SET missCount = :missCount, updatedAt = :now',
            ExpressionAttributeValues: { ':missCount': missCount, ':now': now },
          }),
    }),
  );

  return deactivate;
}
