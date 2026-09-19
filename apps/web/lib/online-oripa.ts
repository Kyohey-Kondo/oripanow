import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { queryActiveOnlineOripaItems, TABLE_NAME } from '@oripa-now/db/queries/online-oripa-items';

const PROVIDER_LABELS: Record<string, string> = {
  orikuji: 'オリくじ',
  dopa: 'DOPA',
};

export type OnlineOripaCardData = {
  itemId: string;
  productUrl: string;
  imageUrl: string;
  providerLabel: string;
};

export type OnlineOripaListing = {
  items: OnlineOripaCardData[];
  /** Most recent lastSeenAt across all active items, or null if there are none. */
  lastUpdatedAt: string | null;
};

/**
 * Active online-oripa items for the /oripa/online grid, newest-seen first.
 * Returns an empty listing on a DynamoDB failure so the page degrades to an
 * empty state instead of crashing (matches the scraper's own fail-safe
 * design — a bad read here doesn't clear anything, it just shows nothing
 * this request).
 */
export async function getActiveOnlineOripaItems(): Promise<OnlineOripaListing> {
  const client = DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: process.env.AWS_REGION ?? 'ap-northeast-1' }),
  );

  try {
    const items = await queryActiveOnlineOripaItems(client, TABLE_NAME);
    const lastUpdatedAt = items.reduce<string | null>(
      (latest, item) => (latest === null || item.lastSeenAt > latest ? item.lastSeenAt : latest),
      null,
    );
    return {
      items: items.map((item) => ({
        itemId: item.itemId,
        productUrl: item.productUrl,
        imageUrl: item.imageUrl,
        providerLabel: PROVIDER_LABELS[item.provider] ?? item.provider,
      })),
      lastUpdatedAt,
    };
  } catch (err) {
    console.error('[getActiveOnlineOripaItems] DynamoDB query failed:', err);
    return { items: [], lastUpdatedAt: null };
  }
}
