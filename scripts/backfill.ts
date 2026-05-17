/**
 * Backfill script: fetch up to 7 days of real tweets for all active stores.
 *
 * Usage (all stores — full reset):
 *   TWITTER_BEARER_TOKEN=<token> AWS_REGION=ap-northeast-1 \
 *     pnpm --filter @oripa-now/scripts exec tsx backfill.ts
 *
 * Usage (CSV filter — new stores only, no cleanup):
 *   DEPLOY_ENV=prod \
 *     pnpm --filter @oripa-now/scripts exec tsx backfill.ts data/additional-stores.csv
 *
 * Or load token from SSM automatically (requires aws CLI credentials):
 *   AWS_REGION=ap-northeast-1 pnpm --filter @oripa-now/scripts exec tsx backfill.ts
 *
 * What it does (full mode):
 *   1. Deletes dummy tweets (tweetId starting with "tw-")
 *   2. Deletes oripa-posts linked to those dummy tweets
 *   3. Clears lastFetchedTweetId for all stores
 *   4. Fetches tweets from the past 7 days (max 100/store, paginated)
 *   5. Saves as UNPROCESSED — ready for the analyze Lambda
 *
 * What it does (CSV filter mode):
 *   1. Reads twitterUsername list from the CSV
 *   2. Fetches tweets only for those stores (skips cleanup and reset)
 *   3. Saves as UNPROCESSED — ready for the analyze Lambda
 */

import { readFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  DeleteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { TwitterApi, type TweetV2 } from 'twitter-api-v2';
import { TABLE_NAMES, type StoreItem } from '@oripa-now/db';
import { saveTweets, updateLastFetchedTweetId } from '../apps/batch/src/save';

const BACKFILL_DAYS = 7;
const MAX_RESULTS_PER_PAGE = 100;

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

// ─── SSM ─────────────────────────────────────────────────────────────────────

async function getTwitterToken(): Promise<string> {
  if (process.env.TWITTER_BEARER_TOKEN) return process.env.TWITTER_BEARER_TOKEN;

  const deploy = process.env.DEPLOY_ENV ?? 'dev';
  const ssm = new SSMClient({});
  const res = await ssm.send(
    new GetParameterCommand({ Name: `/oripa-now/${deploy}/TWITTER_BEARER_TOKEN` }),
  );
  const token = res.Parameter?.Value;
  if (!token) throw new Error('TWITTER_BEARER_TOKEN not found in SSM');
  return token;
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

async function deleteDummyTweets(): Promise<number> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAMES.tweets,
      FilterExpression: 'begins_with(tweetId, :prefix)',
      ExpressionAttributeValues: { ':prefix': 'tw-' },
    }),
  );
  const items = result.Items ?? [];
  for (const item of items) {
    await docClient.send(
      new DeleteCommand({ TableName: TABLE_NAMES.tweets, Key: { id: item['id'] } }),
    );
  }
  return items.length;
}

async function deleteDummyOripaPostsByTweetIds(tweetIds: string[]): Promise<number> {
  if (tweetIds.length === 0) return 0;
  const result = await docClient.send(new ScanCommand({ TableName: TABLE_NAMES.oripaPosts }));
  const items = (result.Items ?? []).filter((i) => tweetIds.includes(i['tweetId'] as string));
  for (const item of items) {
    await docClient.send(
      new DeleteCommand({ TableName: TABLE_NAMES.oripaPosts, Key: { postId: item['postId'] } }),
    );
  }
  return items.length;
}

async function clearLastFetchedTweetIds(stores: StoreItem[]): Promise<void> {
  for (const store of stores) {
    if (!store.lastFetchedTweetId) continue;
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAMES.stores,
        Key: { storeId: store.storeId },
        UpdateExpression: 'REMOVE lastFetchedTweetId',
      }),
    );
  }
}

// ─── Fetch ───────────────────────────────────────────────────────────────────

const TWEET_KEYWORDS = (
  process.env.TWEET_KEYWORDS ??
  'オリパ,おりぱ,oripa,ORIPA,オリジナルパック,オリパ在庫,ブロックオリパ,mystery pack,mystery box,custom pack,blind pack,gacha pack'
)
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean);

const GAME_KEYWORDS = (
  process.env.GAME_KEYWORDS ?? 'ポケカ,ポケモンカード,ポケモン,Pokemon,Pokémon,PTCG,PKM'
)
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean);

function buildQuery(username: string): string {
  const oripaClause = TWEET_KEYWORDS.map((k) => `"${k}"`).join(' OR ');
  const gameClause = GAME_KEYWORDS.map((k) => `"${k}"`).join(' OR ');
  return `from:${username} (${oripaClause}) (${gameClause}) -is:retweet`;
}

async function fetchAllTweetsForStore(
  client: TwitterApi,
  store: StoreItem,
): Promise<TweetV2[]> {
  const query = buildQuery(store.twitterUsername);
  const startTime = new Date(Date.now() - BACKFILL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const paginator = await client.v2.search(query, {
    max_results: MAX_RESULTS_PER_PAGE,
    'tweet.fields': ['created_at', 'author_id', 'id'],
    start_time: startTime,
  });

  const tweets: TweetV2[] = [];
  for await (const tweet of paginator) {
    tweets.push(tweet);
  }
  return tweets;
}

// ─── CSV filter ───────────────────────────────────────────────────────────────

function readUsernamesFromCsv(csvPath: string): Set<string> {
  const content = readFileSync(csvPath, 'utf-8');
  const rows = parse(content, { columns: true, skip_empty_lines: true, trim: true }) as Array<{
    twitterUsername: string;
  }>;
  return new Set(rows.map((r) => r.twitterUsername));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const csvPath = process.argv[2];
  const filterMode = !!csvPath;

  console.log(`=== Backfill start (${filterMode ? `CSV filter: ${csvPath}` : 'all stores'}) ===`);

  // 1. Get active stores
  const storesResult = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAMES.stores,
      FilterExpression: 'isActive = :true',
      ExpressionAttributeValues: { ':true': true },
    }),
  );
  let stores = (storesResult.Items ?? []) as StoreItem[];

  if (filterMode) {
    const usernames = readUsernamesFromCsv(csvPath);
    stores = stores.filter((s) => usernames.has(s.twitterUsername));
    console.log(`Filtered to ${stores.length} store(s) from CSV`);
  }

  console.log(`Stores: ${stores.map((s) => s.twitterUsername).join(', ')}`);

  if (!filterMode) {
    // 2. Delete dummy data
    const dummyTweets = await docClient.send(
      new ScanCommand({
        TableName: TABLE_NAMES.tweets,
        FilterExpression: 'begins_with(tweetId, :prefix)',
        ExpressionAttributeValues: { ':prefix': 'tw-' },
        ProjectionExpression: 'id, tweetId',
      }),
    );
    const dummyTweetIds = (dummyTweets.Items ?? []).map((i) => i['tweetId'] as string);

    const deletedTweets = await deleteDummyTweets();
    const deletedPosts = await deleteDummyOripaPostsByTweetIds(dummyTweetIds);
    console.log(`Deleted: ${deletedTweets} dummy tweets, ${deletedPosts} dummy oripa-posts`);

    // 3. Clear lastFetchedTweetId
    await clearLastFetchedTweetIds(stores);
    console.log('Cleared lastFetchedTweetId for all stores');
  }

  // 4. Fetch & save
  const token = await getTwitterToken();
  const twitterClient = new TwitterApi(token);

  const deployEnv = process.env.DEPLOY_ENV ?? 'dev';
  let totalWritten = 0;
  const errors: Array<{ username: string; error: string }> = [];

  for (const store of stores) {
    try {
      process.stdout.write(`Fetching ${store.twitterUsername}... `);
      const tweets = await fetchAllTweetsForStore(twitterClient, store);
      if (tweets.length > 0) {
        const written = await saveTweets(docClient, tweets, store);
        const highest = tweets
          .map((t) => t.id)
          .reduce((max, id) => (BigInt(id) > BigInt(max) ? id : max));
        await updateLastFetchedTweetId(docClient, store.storeId, highest);
        totalWritten += written;
        console.log(`${written} tweets saved`);
      } else {
        console.log('0 tweets (no match in last 7 days)');
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      errors.push({ username: store.twitterUsername, error });
      console.log(`ERROR: ${error}`);
    }
  }

  console.log(`\n=== Backfill complete ===`);
  console.log(`Total tweets saved: ${totalWritten}`);
  if (errors.length > 0) {
    console.log(`Errors (${errors.length}):`);
    for (const e of errors) console.log(`  ${e.username}: ${e.error}`);
  }
  console.log(`\nNext: invoke the analyze Lambda to process these tweets:`);
  console.log(`  aws lambda invoke --function-name ${deployEnv}-oripa-now-analyze --payload '{}' /tmp/analyze-out.json && cat /tmp/analyze-out.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
