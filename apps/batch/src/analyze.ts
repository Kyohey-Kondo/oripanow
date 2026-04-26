import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { TABLE_NAMES, GSI, type StoreItem, type TweetItem } from '@oripa-now/db';
import { analyzeTweet } from './parse';
import { saveOripaPost, markTweetProcessed } from './save';

export type AnalyzeRunResult = {
  runAt: string;
  tweetsProcessed: number;
  postsCreated: number;
  skipped: number;
  errors: Array<{ tweetId: string; error: string }>;
};

const ANALYZE_BATCH_SIZE = Number(process.env.ANALYZE_BATCH_SIZE ?? '50');

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const bedrockClient = new BedrockRuntimeClient({});
const cloudfrontClient = new CloudFrontClient({});

function getTodayJST(): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(new Date())
    .replace(/\//g, '-');
}

async function getStore(
  storeId: string,
  cache: Map<string, StoreItem>,
): Promise<StoreItem | undefined> {
  if (cache.has(storeId)) return cache.get(storeId);

  const result = await docClient.send(
    new GetCommand({ TableName: TABLE_NAMES.stores, Key: { storeId } }),
  );

  const store = result.Item as StoreItem | undefined;
  if (store) cache.set(storeId, store);
  return store;
}

async function getUnprocessedTweets(): Promise<TweetItem[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAMES.tweets,
      IndexName: GSI.unprocessedTweets,
      KeyConditionExpression: 'processStatus = :status',
      ExpressionAttributeValues: { ':status': 'UNPROCESSED' },
      ScanIndexForward: false,
      Limit: ANALYZE_BATCH_SIZE,
    }),
  );
  return (result.Items ?? []) as TweetItem[];
}

export const handler = async (_event: unknown): Promise<AnalyzeRunResult> => {
  const runAt = new Date().toISOString();
  const todayJST = getTodayJST();
  const storeCache = new Map<string, StoreItem>();
  const errors: AnalyzeRunResult['errors'] = [];
  let tweetsProcessed = 0;
  let postsCreated = 0;
  let skipped = 0;

  const tweets = await getUnprocessedTweets();

  for (const tweet of tweets) {
    tweetsProcessed++;
    try {
      const store = await getStore(tweet.storeId, storeCache);
      if (!store) {
        throw new Error(`Store not found: ${tweet.storeId}`);
      }

      const result = await analyzeTweet(bedrockClient, tweet, todayJST);

      if (result.status === 'not_oripa') {
        skipped++;
        await markTweetProcessed(docClient, tweet.tweetId);
      } else {
        postsCreated += await saveOripaPost(docClient, result, tweet, store);
        await markTweetProcessed(docClient, tweet.tweetId);
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      errors.push({ tweetId: tweet.tweetId, error });
      console.error(JSON.stringify({ level: 'ERROR', tweetId: tweet.tweetId, error }));
    }
  }

  const result: AnalyzeRunResult = { runAt, tweetsProcessed, postsCreated, skipped, errors };
  console.log(JSON.stringify({ level: 'INFO', ...result }));

  // Invalidate CloudFront cache so visitors see fresh data after the batch
  const distributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID;
  if (distributionId) {
    try {
      await cloudfrontClient.send(
        new CreateInvalidationCommand({
          DistributionId: distributionId,
          InvalidationBatch: {
            CallerReference: runAt,
            Paths: { Quantity: 1, Items: ['/oripa*'] },
          },
        }),
      );
      console.log(JSON.stringify({ level: 'INFO', message: 'CloudFront invalidation created', distributionId }));
    } catch (err) {
      console.warn(JSON.stringify({ level: 'WARN', message: 'CloudFront invalidation failed (non-fatal)', error: String(err) }));
    }
  }

  return result;
};
