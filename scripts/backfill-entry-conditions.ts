/**
 * Backfill entryConditions on existing giveaway-posts records.
 *
 * Scans giveaway-posts for active records that have no entryConditions field,
 * re-analyzes each using Bedrock (rawText stored on the record), and writes
 * the structured entryConditions back via UpdateCommand.
 *
 * Usage:
 *   AWS_REGION=ap-northeast-1 \
 *   DEPLOY_ENV=dev \
 *   GIVEAWAY_POSTS_TABLE_NAME=dev-giveaway-posts \
 *   pnpm --filter @oripa-now/scripts exec tsx backfill-entry-conditions.ts
 *
 * Optional:
 *   DRY_RUN=1   — print what would be updated without writing to DynamoDB
 *   ANTHROPIC_MODEL=jp.anthropic.claude-haiku-4-5-20251001-v1:0
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import type { GiveawayPostItem } from '@oripa-now/db';
import { analyzeGiveawayTweet } from '../apps/batch/src/parse-giveaway';

const DEPLOY_ENV = process.env.DEPLOY_ENV ?? 'dev';
const DRY_RUN = process.env.DRY_RUN === '1';
const TABLE = process.env.GIVEAWAY_POSTS_TABLE_NAME ?? `${DEPLOY_ENV}-giveaway-posts`;

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

async function scanTargets(): Promise<GiveawayPostItem[]> {
  const targets: GiveawayPostItem[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: '#s = :active AND attribute_not_exists(entryConditions)',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':active': 'active' },
        ExclusiveStartKey: lastKey,
      }),
    );
    for (const item of result.Items ?? []) {
      targets.push(item as GiveawayPostItem);
    }
    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  return targets;
}

async function main() {
  console.log(`=== Backfill entryConditions (env: ${DEPLOY_ENV}, table: ${TABLE}) ===`);
  if (DRY_RUN) console.log('DRY RUN — no writes will occur\n');

  const targets = await scanTargets();
  console.log(`Found ${targets.length} active records without entryConditions\n`);

  if (targets.length === 0) {
    console.log('Nothing to backfill.');
    return;
  }

  const todayJST = getTodayJST();
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const post of targets) {
    process.stdout.write(`  ${post.tweetId} (@${post.twitterUsername})... `);

    try {
      const fakeTweet = {
        tweetId: post.tweetId,
        sourceType: post.sourceType,
        storeId: post.storeId,
        twitterUsername: post.twitterUsername,
        content: post.rawText,
        tweetedAt: post.createdAt,
        fetchedAt: post.createdAt,
        isProcessed: true,
      };

      const result = await analyzeGiveawayTweet(bedrockClient, fakeTweet, todayJST);

      const ec = result.entryConditions;
      const hasAny = ec && (ec.follow || ec.repost || ec.reply || ec.other);

      if (!hasAny) {
        console.log('skip (no conditions extracted)');
        skipped++;
        continue;
      }

      if (DRY_RUN) {
        console.log(`would write: ${JSON.stringify(ec)}`);
        updated++;
        continue;
      }

      await docClient.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { postId: post.postId },
          UpdateExpression: 'SET entryConditions = :ec, updatedAt = :now',
          ExpressionAttributeValues: {
            ':ec': ec,
            ':now': new Date().toISOString(),
          },
        }),
      );

      console.log(`✓ ${JSON.stringify(ec)}`);
      updated++;
    } catch (err) {
      console.log(`✗ ERROR: ${(err as Error).message}`);
      failed++;
    }

    // brief pause to avoid Bedrock throttling
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n=== Done ===`);
  console.log(`  Updated : ${updated}`);
  console.log(`  Skipped : ${skipped} (no conditions in tweet)`);
  console.log(`  Failed  : ${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
