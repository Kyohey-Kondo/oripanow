import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { TABLE_NAMES, GSI, type StoreItem, type GiveawayTweetItem } from '@oripa-now/db';
import { BedrockRuntimeClient, analyzeGiveawayTweet } from './parse-giveaway';
import { saveGiveawayPost, markGiveawayTweetProcessed } from './save-giveaway';

export type AnalyzeGiveawayRunResult = {
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

async function getUnprocessedGiveawayTweets(): Promise<GiveawayTweetItem[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAMES.giveawayTweets,
      IndexName: GSI.unprocessedGiveawayTweets,
      KeyConditionExpression: 'processStatus = :status',
      ExpressionAttributeValues: { ':status': 'UNPROCESSED' },
      ScanIndexForward: false,
      Limit: ANALYZE_BATCH_SIZE,
    }),
  );
  return (result.Items ?? []) as GiveawayTweetItem[];
}

export const handler = async (_event: unknown): Promise<AnalyzeGiveawayRunResult> => {
  const runAt = new Date().toISOString();
  const todayJST = getTodayJST();
  const storeCache = new Map<string, StoreItem>();
  const errors: AnalyzeGiveawayRunResult['errors'] = [];
  let tweetsProcessed = 0;
  let postsCreated = 0;
  let skipped = 0;

  const tweets = await getUnprocessedGiveawayTweets();

  for (const tweet of tweets) {
    tweetsProcessed++;
    try {
      const store = tweet.storeId ? await getStore(tweet.storeId, storeCache) : undefined;

      const result = await analyzeGiveawayTweet(bedrockClient, tweet, todayJST);

      if (result.status === 'not_giveaway') {
        skipped++;
        await markGiveawayTweetProcessed(docClient, tweet.tweetId);
      } else {
        const written = await saveGiveawayPost(docClient, result, tweet, store);
        if (written) postsCreated++;
        await markGiveawayTweetProcessed(docClient, tweet.tweetId);
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      errors.push({ tweetId: tweet.tweetId, error });
      console.error(JSON.stringify({ level: 'ERROR', tweetId: tweet.tweetId, error }));
    }
  }

  const result: AnalyzeGiveawayRunResult = { runAt, tweetsProcessed, postsCreated, skipped, errors };
  console.log(JSON.stringify({ level: 'INFO', ...result }));

  const distributionId = process.env.CLOUDFRONT_DISTRIBUTION_ID;
  if (distributionId) {
    try {
      await cloudfrontClient.send(
        new CreateInvalidationCommand({
          DistributionId: distributionId,
          InvalidationBatch: {
            CallerReference: runAt,
            Paths: { Quantity: 1, Items: ['/giveaway*'] },
          },
        }),
      );
      console.log(JSON.stringify({ level: 'INFO', message: 'CloudFront invalidation created for /giveaway*', distributionId }));
    } catch (err) {
      console.warn(JSON.stringify({ level: 'WARN', message: 'CloudFront invalidation failed (non-fatal)', error: String(err) }));
    }
  }

  return result;
};
