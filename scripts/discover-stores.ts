/**
 * Discover potential store accounts by searching Twitter and output as CSV.
 *
 * Usage (from repo root):
 *   TWITTER_BEARER_TOKEN=<token> \
 *     pnpm --filter @oripa-now/scripts exec tsx discover-stores.ts
 *
 * Or load token from SSM:
 *   AWS_REGION=ap-northeast-1 DEPLOY_ENV=prod \
 *     pnpm --filter @oripa-now/scripts exec tsx discover-stores.ts
 *
 * Options (env vars):
 *   QUERY        — search query (default: "秋葉原 カードショップ -is:retweet")
 *   MAX_RESULTS  — max tweets to search (default: 100)
 *   OUTPUT       — output CSV path (default: data/store-akihabara.csv)
 *   AREA         — area value to fill in CSV (default: tokyo)
 */

import { writeFileSync } from 'node:fs';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { TwitterApi } from 'twitter-api-v2';

const QUERY = process.env.QUERY ?? '秋葉原 カードショップ -is:retweet';
const MAX_RESULTS = Math.min(Number(process.env.MAX_RESULTS ?? 100), 100);
const OUTPUT = process.env.OUTPUT ?? 'data/store-akihabara.csv';
const AREA = process.env.AREA ?? 'akihabara';

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

async function main() {
  console.log(`=== Discover Stores ===`);
  console.log(`Query:   ${QUERY}`);
  console.log(`Max:     ${MAX_RESULTS} tweets`);
  console.log(`Output:  ${OUTPUT}\n`);

  const token = await getTwitterToken();
  const client = new TwitterApi(token);

  const result = await client.v2.search(QUERY, {
    max_results: MAX_RESULTS,
    'tweet.fields': ['author_id'],
    expansions: ['author_id'],
    'user.fields': ['name', 'username', 'description'],
  });

  const users = result.includes?.users ?? [];
  if (users.length === 0) {
    console.log('No results found.');
    return;
  }

  // Deduplicate by username
  const seen = new Set<string>();
  const unique = users.filter((u) => {
    if (seen.has(u.username)) return false;
    seen.add(u.username);
    return true;
  });

  console.log(`Found ${unique.length} unique account(s):\n`);
  for (const u of unique) {
    console.log(`  @${u.username.padEnd(30)} ${u.name}`);
  }

  // Write CSV
  const header = 'name,twitterUsername,area,address';
  const rows = unique.map((u) => {
    const name = u.name.replace(/,/g, '');
    return `${name},${u.username},${AREA},`;
  });
  const csv = [header, ...rows].join('\n') + '\n';
  writeFileSync(OUTPUT, csv, 'utf-8');

  console.log(`\nWrote ${unique.length} entries to ${OUTPUT}`);
  console.log('Review the CSV, then register with:');
  console.log(`  DEPLOY_ENV=prod pnpm --filter @oripa-now/scripts exec tsx add-store.ts ${OUTPUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
