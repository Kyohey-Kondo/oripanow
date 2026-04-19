/**
 * One-time migration: backfill lastOnePrizeName on existing oripa-posts.
 *
 * - Scans the tweets table (up to LIMIT tweets)
 * - Re-analyzes each tweet with the current AI schema via Bedrock
 * - For each tier where lastOnePrizeName is detected, updates the
 *   corresponding oripa-post record with UpdateItem (non-destructive)
 * - Tweets and oripa-posts are never deleted
 *
 * Usage:
 *   AWS_REGION=ap-northeast-1 DEPLOY_ENV=dev \
 *     pnpm --filter @oripa-now/scripts exec tsx backfill-last-one-prize.ts
 *
 * Options (env vars):
 *   LIMIT      — max number of tweets to process (default: 20)
 *   DEPLOY_ENV — table prefix (default: dev)
 *   AWS_REGION — (default: ap-northeast-1)
 */

import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { TABLE_NAMES, type TweetItem } from '@oripa-now/db';
import { analyzeTweet } from '../apps/batch/src/parse';

const LIMIT = Number(process.env.LIMIT ?? '20');
const DEPLOY_ENV = process.env.DEPLOY_ENV ?? 'dev';

const docClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION ?? 'ap-northeast-1' }),
);
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION ?? 'ap-northeast-1',
});

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

async function scanTweets(limit: number): Promise<TweetItem[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAMES.tweets,
      Limit: limit,
    }),
  );
  return (result.Items ?? []) as TweetItem[];
}

async function updateLastOnePrizeName(postId: string, name: string): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAMES.oripaPosts,
      Key: { postId },
      UpdateExpression: 'SET lastOnePrizeName = :name, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':name': name,
        ':updatedAt': new Date().toISOString(),
      },
    }),
  );
}

async function main() {
  console.log(`=== Backfill lastOnePrizeName ===`);
  console.log(`DEPLOY_ENV: ${DEPLOY_ENV}`);
  console.log(`LIMIT: ${LIMIT} tweets\n`);

  const tweets = await scanTweets(LIMIT);
  console.log(`${tweets.length} tweet(s) fetched.\n`);

  const todayJST = getTodayJST();
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const tweet of tweets) {
    try {
      const result = await analyzeTweet(bedrockClient, tweet, todayJST);

      if (result.status === 'not_oripa' || result.items.length === 0) {
        skipped++;
        continue;
      }

      let prizeFound = false;
      for (let i = 0; i < result.items.length; i++) {
        const tier = result.items[i];
        if (!tier.lastOnePrizeName) continue;

        const postId = i === 0 ? tweet.tweetId : `${tweet.tweetId}-${i}`;
        await updateLastOnePrizeName(postId, tier.lastOnePrizeName);
        console.log(`✓ ${postId} → "${tier.lastOnePrizeName}"`);
        updated++;
        prizeFound = true;
      }

      if (!prizeFound) skipped++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`✗ ${tweet.tweetId}: ${msg}`);
      errors.push(tweet.tweetId);
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Updated: ${updated} post(s)`);
  console.log(`Skipped (no prize): ${skipped}`);
  if (errors.length > 0) console.log(`Errors: ${errors.join(', ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
