/**
 * Add store(s) to DynamoDB.
 *
 * --- Single store (env vars) ---
 *   STORE_NAME="カードショップ秋葉原" TWITTER_USERNAME="akihabara_card" \
 *     AREA="tokyo" ADDRESS="東京都千代田区外神田1-1-1" \
 *     AWS_REGION=ap-northeast-1 DEPLOY_ENV=prod \
 *     pnpm --filter @oripa-now/scripts exec tsx add-store.ts
 *
 * --- Bulk from CSV ---
 *   AWS_REGION=ap-northeast-1 DEPLOY_ENV=prod \
 *     pnpm --filter @oripa-now/scripts exec tsx add-store.ts stores.csv
 *
 *   CSV format (header required):
 *     name,twitterUsername,area,address
 *     カードショップ秋葉原,akihabara_card,tokyo,東京都千代田区外神田1-1-1
 *     ポケカ大宮店,pokeka_omiya,omiya,
 *
 * Optional env vars:
 *   DEPLOY_ENV  — table prefix (default: dev)
 *   AWS_REGION  — (default: ap-northeast-1)
 */

import { readFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { ulid } from 'ulid';
import { TABLE_NAMES, type StoreItem } from '@oripa-now/db';

const DEPLOY_ENV = process.env.DEPLOY_ENV ?? 'dev';

const docClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION ?? 'ap-northeast-1' }),
);

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Error: ${name} is required`);
    process.exit(1);
  }
  return v;
}

function validateArea(area: string): asserts area is StoreItem['area'] {
  if (area !== 'tokyo' && area !== 'omiya' && area !== 'akihabara' && area !== 'ikebukuro') {
    console.error(`Error: AREA must be "tokyo", "omiya", "akihabara" or "ikebukuro", got "${area}"`);
    process.exit(1);
  }
}

function buildStore(fields: {
  name: string;
  twitterUsername: string;
  area: string;
  address?: string;
}): StoreItem {
  validateArea(fields.area);
  const now = new Date().toISOString();
  return {
    storeId: ulid(),
    name: fields.name,
    twitterUsername: fields.twitterUsername,
    area: fields.area,
    ...(fields.address ? { address: fields.address } : {}),
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

function printStore(store: StoreItem) {
  console.log(`  storeId:         ${store.storeId}`);
  console.log(`  name:            ${store.name}`);
  console.log(`  twitterUsername: ${store.twitterUsername}`);
  console.log(`  area:            ${store.area}`);
  if (store.address) console.log(`  address:         ${store.address}`);
}

async function addStore(store: StoreItem) {
  await docClient.send(new PutCommand({ TableName: TABLE_NAMES.stores, Item: store }));
}

async function runSingle() {
  const store = buildStore({
    name: required('STORE_NAME'),
    twitterUsername: required('TWITTER_USERNAME'),
    area: required('AREA'),
    address: process.env.ADDRESS,
  });

  console.log(`Store to register:`);
  printStore(store);
  console.log();

  await addStore(store);
  console.log(`✓ Registered: ${store.name}`);
}

async function runCsv(csvPath: string) {
  const content = readFileSync(csvPath, 'utf-8');
  const rows = parse(content, { columns: true, skip_empty_lines: true, trim: true }) as Array<{
    name: string;
    twitterUsername: string;
    area: string;
    address?: string;
  }>;

  console.log(`${rows.length} store(s) found in CSV.\n`);

  let ok = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const store = buildStore(row);
      await addStore(store);
      console.log(`✓ ${store.name} (${store.storeId})`);
      ok++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`✗ ${row.name}: ${msg}`);
      errors.push(row.name);
    }
  }

  console.log(`\n${ok}/${rows.length} registered.`);
  if (errors.length > 0) {
    console.log(`Failed: ${errors.join(', ')}`);
    process.exit(1);
  }
}

async function main() {
  const csvPath = process.argv[2];

  console.log(`=== Add Store ===`);
  console.log(`DEPLOY_ENV: ${DEPLOY_ENV}`);
  console.log(`Table: ${TABLE_NAMES.stores}\n`);

  if (csvPath) {
    await runCsv(csvPath);
  } else {
    await runSingle();
  }

  console.log();
  console.log(`Run backfill to fetch tweets:`);
  console.log(`  AWS_REGION=ap-northeast-1 pnpm --filter @oripa-now/scripts exec tsx backfill.ts`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
