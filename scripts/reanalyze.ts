/**
 * Full reset & re-run script:
 *   1. Delete all oripa-posts
 *   2. Delete all tweets
 *   3. Clear lastFetchedTweetId on all stores
 *   4. Invoke the fetch Lambda  (re-fetches tweets from Twitter)
 *   5. Invoke the analyze Lambda (re-processes tweets with current AI schema)
 *
 * Usage (from repo root):
 *   AWS_REGION=ap-northeast-1 pnpm --filter @oripa-now/scripts exec tsx reanalyze.ts
 *
 * Options (env vars):
 *   DEPLOY_ENV=dev (default)  — target environment
 *   SKIP_FETCH=1              — skip step 4 (re-use tweets already in DB after reset)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  DeleteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { TABLE_NAMES } from '@oripa-now/db';

const DEPLOY_ENV = process.env.DEPLOY_ENV ?? 'dev';
const SKIP_FETCH = process.env.SKIP_FETCH === '1';
const FETCH_FUNCTION = `${DEPLOY_ENV}-oripa-now-batch`;
const ANALYZE_FUNCTION = `${DEPLOY_ENV}-oripa-now-analyze`;

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const lambdaClient = new LambdaClient({});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Scan all items from a table and call handler for each page. */
async function scanAll(
  tableName: string,
  projection: string,
  handler: (items: Record<string, unknown>[]) => Promise<void>,
): Promise<number> {
  let total = 0;
  let lastKey: Record<string, unknown> | undefined;
  do {
    const result = await docClient.send(
      new ScanCommand({
        TableName: tableName,
        ProjectionExpression: projection,
        ExclusiveStartKey: lastKey,
      }),
    );
    const items = (result.Items ?? []) as Record<string, unknown>[];
    if (items.length > 0) await handler(items);
    total += items.length;
    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);
  return total;
}

async function invokeLambda(functionName: string): Promise<unknown> {
  const response = await lambdaClient.send(
    new InvokeCommand({
      FunctionName: functionName,
      Payload: Buffer.from('{}'),
    }),
  );
  const payload = response.Payload
    ? Buffer.from(response.Payload).toString('utf-8')
    : 'null';
  if (response.FunctionError) {
    throw new Error(`Lambda error (${response.FunctionError}): ${payload}`);
  }
  return JSON.parse(payload);
}

// ─── Steps ────────────────────────────────────────────────────────────────────

async function deleteAllOriPosts(): Promise<number> {
  return scanAll(TABLE_NAMES.oripaPosts, 'postId', async (items) => {
    for (const item of items) {
      await docClient.send(
        new DeleteCommand({
          TableName: TABLE_NAMES.oripaPosts,
          Key: { postId: item['postId'] },
        }),
      );
    }
  });
}

async function deleteAllTweets(): Promise<number> {
  return scanAll(TABLE_NAMES.tweets, 'tweetId', async (items) => {
    for (const item of items) {
      await docClient.send(
        new DeleteCommand({
          TableName: TABLE_NAMES.tweets,
          Key: { tweetId: item['tweetId'] },
        }),
      );
    }
  });
}

async function clearLastFetchedTweetIds(): Promise<number> {
  return scanAll(TABLE_NAMES.stores, 'storeId, lastFetchedTweetId', async (items) => {
    for (const item of items) {
      if (!item['lastFetchedTweetId']) continue;
      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAMES.stores,
          Key: { storeId: item['storeId'] },
          UpdateExpression: 'REMOVE lastFetchedTweetId',
        }),
      );
    }
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`=== Full reset & re-run (env: ${DEPLOY_ENV}) ===\n`);

  process.stdout.write('Step 1: Deleting all oripa-posts... ');
  const deletedPosts = await deleteAllOriPosts();
  console.log(`${deletedPosts} records deleted`);

  process.stdout.write('Step 2: Deleting all tweets... ');
  const deletedTweets = await deleteAllTweets();
  console.log(`${deletedTweets} records deleted`);

  process.stdout.write('Step 3: Clearing lastFetchedTweetId on all stores... ');
  await clearLastFetchedTweetIds();
  console.log('done');

  if (!SKIP_FETCH) {
    console.log(`\nStep 4: Invoking ${FETCH_FUNCTION} (fetches latest tweets from Twitter)...`);
    const fetchResult = await invokeLambda(FETCH_FUNCTION);
    console.log('Fetch result:', JSON.stringify(fetchResult, null, 2));
  } else {
    console.log('\nStep 4: Skipped (SKIP_FETCH=1)');
  }

  console.log(`\nStep 5: Invoking ${ANALYZE_FUNCTION} (AI analysis)...`);
  const analyzeResult = await invokeLambda(ANALYZE_FUNCTION);
  console.log('Analyze result:', JSON.stringify(analyzeResult, null, 2));

  console.log('\n=== Done ===');
  console.log('Tip: If tweetsProcessed < total tweets, run step 5 again:');
  console.log(`  SKIP_FETCH=1 AWS_REGION=ap-northeast-1 pnpm tsx scripts/reanalyze.ts`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
