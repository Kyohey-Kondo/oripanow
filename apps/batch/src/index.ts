import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { TwitterApi } from 'twitter-api-v2';
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

function maxTweetId(ids: string[]): string | undefined {
  if (ids.length === 0) return undefined;
  // Twitter IDs are numeric strings; compare as BigInt to avoid precision loss
  return ids.reduce((max, id) => (BigInt(id) > BigInt(max) ? id : max));
}

export const handler = async (_event: unknown): Promise<FetchRunResult> => {
  const runAt = new Date().toISOString();
  const twitterClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN ?? '');
  const errors: FetchRunResult['errors'] = [];
  let storesProcessed = 0;
  let tweetsWritten = 0;

  const stores = await getActiveStores();

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

        const highest = maxTweetId(tweets.map((t) => t.id));
        if (highest) {
          await updateLastFetchedTweetId(docClient, store.storeId, highest);
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
