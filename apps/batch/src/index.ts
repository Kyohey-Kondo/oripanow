import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { TwitterApi, type TweetV2 } from 'twitter-api-v2';
import { TABLE_NAMES, type StoreItem } from '@oripa-now/db';
import { fetchTweetsForStore } from './fetch';
import { saveTweets, updateLastFetchedTweetId } from './save';

export type FetchRunResult = {
  runAt: string;
  storesProcessed: number;
  tweetsWritten: number;
  errors: Array<{
    storeId: string;
    twitterUsername: string;
    error: string;
  }>;
};

/**
 * Optional scope for on-demand admin-triggered runs (bypasses isActive when
 * targeting a single store, so a dormant store can be rechecked before
 * reactivating). Absent for the daily EventBridge schedule, which fetches
 * all active stores as before.
 */
export type FetchRunEvent = {
  storeId?: string;
  area?: StoreItem['area'];
};

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

async function getActiveStores(): Promise<StoreItem[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAMES.stores,
      FilterExpression: 'isActive = :true',
      ExpressionAttributeValues: { ':true': true },
    }),
  );
  return (result.Items ?? []) as StoreItem[];
}

async function getStoreById(storeId: string): Promise<StoreItem | undefined> {
  const result = await docClient.send(
    new GetCommand({ TableName: TABLE_NAMES.stores, Key: { storeId } }),
  );
  return result.Item as StoreItem | undefined;
}

function maxTweetId(ids: string[]): string | undefined {
  if (ids.length === 0) return undefined;
  // Twitter IDs are numeric strings; compare as BigInt to avoid precision loss
  return ids.reduce((max, id) => (BigInt(id) > BigInt(max) ? id : max));
}

function maxTweetedAt(tweets: TweetV2[]): string | undefined {
  const dates = tweets.map((t) => t.created_at).filter((d): d is string => Boolean(d));
  if (dates.length === 0) return undefined;
  // ISO 8601 strings sort lexicographically
  return dates.reduce((max, d) => (d > max ? d : max));
}

async function resolveStores(event: FetchRunEvent): Promise<StoreItem[]> {
  if (event.storeId) {
    const store = await getStoreById(event.storeId);
    return store ? [store] : [];
  }

  const activeStores = await getActiveStores();
  return event.area ? activeStores.filter((s) => s.area === event.area) : activeStores;
}

export const handler = async (event: unknown): Promise<FetchRunResult> => {
  const runAt = new Date().toISOString();
  const twitterClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN ?? '');
  const errors: FetchRunResult['errors'] = [];
  let storesProcessed = 0;
  let tweetsWritten = 0;

  const stores = await resolveStores((event ?? {}) as FetchRunEvent);

  for (const store of stores) {
    try {
      const tweets = await fetchTweetsForStore(
        twitterClient,
        store,
        store.lastFetchedTweetId,
      );

      if (tweets.length > 0) {
        const written = await saveTweets(docClient, tweets, store);
        tweetsWritten += written;

        const highestId = maxTweetId(tweets.map((t) => t.id));
        const latestTweetedAt = maxTweetedAt(tweets);
        if (highestId && latestTweetedAt) {
          await updateLastFetchedTweetId(docClient, store.storeId, highestId, latestTweetedAt);
        }
      }

      storesProcessed++;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      errors.push({ storeId: store.storeId, twitterUsername: store.twitterUsername, error });
      console.error(
        JSON.stringify({ level: 'ERROR', storeId: store.storeId, twitterUsername: store.twitterUsername, error }),
      );
    }
  }

  const result: FetchRunResult = { runAt, storesProcessed, tweetsWritten, errors };
  console.log(JSON.stringify({ level: 'INFO', ...result }));
  return result;
};
