/**
 * Seed script: 3つのDynamoDBテーブルにサンプルデータを投入する
 *
 * 使い方:
 *   DEPLOY_ENV=dev npx tsx packages/db/scripts/seed.ts
 *
 * 環境変数:
 *   DEPLOY_ENV   - デプロイ環境（デフォルト: dev）→ テーブル名プレフィックス
 *   AWS_REGION   - リージョン（デフォルト: ap-northeast-1）
 *
 * 投入データの意図:
 *   - Store × 4（tokyo × 2, omiya × 2）
 *   - OripaPost × 9
 *     - 当日 on_sale  × 4  → トップページに表示される（4店舗、最新順）
 *     - 同一店舗の追加投稿 × 1ペア → 重複排除で最新のみ表示
 *     - 当日 sold_out × 2  → areaStatusDate フィルタで除外
 *     - 昨日 on_sale  × 2  → areaStatusDate フィルタで除外
 *   - Tweet × 5（Store に紐づく生ツイート）
 *     - 未処理 × 3 → processStatus="UNPROCESSED" (GSI2に存在)
 *     - 処理済 × 2 → processStatus なし (sparse)
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";
import type { OripaPostItem, StoreItem, TweetItem } from "../schema/index";

const DEPLOY_ENV = process.env.DEPLOY_ENV ?? "dev";
const STORES_TABLE = `${DEPLOY_ENV}-stores`;
const ORIPA_POSTS_TABLE = `${DEPLOY_ENV}-oripa-posts`;
const TWEETS_TABLE = `${DEPLOY_ENV}-tweets`;

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION ?? "ap-northeast-1" }),
);

function getTodayJST(): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replace(/\//g, "-");
}

function getYesterdayJST(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(d)
    .replace(/\//g, "-");
}

const today = getTodayJST();
const yesterday = getYesterdayJST();

// ─── Store IDs (ULID) ─────────────────────────────────────────────────────────
const storeIds = {
  akihabara: ulid(),
  ikebukuro: ulid(),
  omiya1:    ulid(),
  omiya2:    ulid(),
};

// ─── Stores ───────────────────────────────────────────────────────────────────

const stores: StoreItem[] = [
  {
    storeId: storeIds.akihabara,
    name: "カードショップ秋葉原",
    twitterUsername: "akihabara_card",
    area: "tokyo",
    address: "東京都千代田区外神田1-1-1",
    isActive: true,
    createdAt: `${today}T00:00:00.000Z`,
    updatedAt: `${today}T00:00:00.000Z`,
  },
  {
    storeId: storeIds.ikebukuro,
    name: "トレカ天国池袋",
    twitterUsername: "toreca_ikebukuro",
    area: "tokyo",
    address: "東京都豊島区西池袋1-2-3",
    isActive: true,
    createdAt: `${today}T00:00:00.000Z`,
    updatedAt: `${today}T00:00:00.000Z`,
  },
  {
    storeId: storeIds.omiya1,
    name: "ポケカ大宮店",
    twitterUsername: "pokeka_omiya",
    area: "omiya",
    address: "埼玉県さいたま市大宮区宮町1-1",
    isActive: true,
    createdAt: `${today}T00:00:00.000Z`,
    updatedAt: `${today}T00:00:00.000Z`,
  },
  {
    storeId: storeIds.omiya2,
    name: "カードパラダイス大宮",
    twitterUsername: "card_paradise_omiya",
    area: "omiya",
    address: "埼玉県さいたま市大宮区桜木町2-3",
    isActive: true,
    createdAt: `${today}T00:00:00.000Z`,
    updatedAt: `${today}T00:00:00.000Z`,
  },
];

// ─── OripaPost IDs (ULID) ─────────────────────────────────────────────────────
const postIds = {
  akihabara_am:  ulid(),   // 当日 on_sale 09:00 (重複排除で除外される古い方)
  ikebukuro:     ulid(),   // 当日 on_sale 10:30
  omiya1:        ulid(),   // 当日 on_sale 08:00
  omiya2:        ulid(),   // 当日 on_sale 11:00
  akihabara_pm:  ulid(),   // 当日 on_sale 13:00 (akihabaraの新しい投稿)
  ikebukuro_out: ulid(),   // 当日 sold_out
  omiya1_out:    ulid(),   // 当日 sold_out
  akihabara_yd:  ulid(),   // 昨日 on_sale
  omiya2_yd:     ulid(),   // 昨日 on_sale
};

// ─── OripaPost ────────────────────────────────────────────────────────────────

const posts: OripaPostItem[] = [
  // ① 当日 on_sale（トップページに表示される）
  {
    postId: postIds.akihabara_am,
    storeId: storeIds.akihabara,
    tweetId: "tw-akihabara-am",
    status: "on_sale",
    price: 3000,
    stockCount: 50,
    saleAt: today,
    rawText: `本日${today}オリパ販売中！3000円`,
    createdAt: `${today}T09:00:00.000Z`,
    updatedAt: `${today}T09:00:00.000Z`,
    areaStatusDate: `tokyo#on_sale#${today}`,
    storeName: "カードショップ秋葉原",
    storeAddress: "東京都千代田区外神田1-1-1",
  },
  {
    postId: postIds.ikebukuro,
    storeId: storeIds.ikebukuro,
    tweetId: "tw-ikebukuro",
    status: "on_sale",
    price: 5000,
    stockCount: 20,
    saleAt: today,
    rawText: `${today} 限定オリパ！5000円で挑戦`,
    createdAt: `${today}T10:30:00.000Z`,
    updatedAt: `${today}T10:30:00.000Z`,
    areaStatusDate: `tokyo#on_sale#${today}`,
    storeName: "トレカ天国池袋",
    storeAddress: "東京都豊島区西池袋1-2-3",
  },
  {
    postId: postIds.omiya1,
    storeId: storeIds.omiya1,
    tweetId: "tw-omiya1",
    status: "on_sale",
    price: 2000,
    stockCount: 100,
    saleAt: today,
    rawText: `大宮店 本日のオリパ 2000円〜`,
    createdAt: `${today}T08:00:00.000Z`,
    updatedAt: `${today}T08:00:00.000Z`,
    areaStatusDate: `omiya#on_sale#${today}`,
    storeName: "ポケカ大宮店",
    storeAddress: "埼玉県さいたま市大宮区宮町1-1",
  },
  {
    postId: postIds.omiya2,
    storeId: storeIds.omiya2,
    tweetId: "tw-omiya2",
    status: "on_sale",
    price: 1000,
    stockCount: 200,
    saleAt: today,
    rawText: `カードパラダイス本日オープン！1000円オリパやります`,
    createdAt: `${today}T11:00:00.000Z`,
    updatedAt: `${today}T11:00:00.000Z`,
    areaStatusDate: `omiya#on_sale#${today}`,
    storeName: "カードパラダイス大宮",
    storeAddress: "埼玉県さいたま市大宮区桜木町2-3",
  },

  // ② 同一店舗の追加投稿（akihabara の午後分 → deduplicateByStore でこちらが残る）
  {
    postId: postIds.akihabara_pm,
    storeId: storeIds.akihabara,
    tweetId: "tw-akihabara-pm",
    status: "on_sale",
    price: 3000,
    stockCount: 30,
    saleAt: today,
    rawText: `追加入荷！夕方からも販売します`,
    createdAt: `${today}T13:00:00.000Z`,
    updatedAt: `${today}T13:00:00.000Z`,
    areaStatusDate: `tokyo#on_sale#${today}`,
    storeName: "カードショップ秋葉原",
    storeAddress: "東京都千代田区外神田1-1-1",
  },

  // ③ 当日 sold_out（areaStatusDate が "tokyo#sold_out#..." → on_sale クエリに非該当）
  {
    postId: postIds.ikebukuro_out,
    storeId: storeIds.ikebukuro,
    tweetId: "tw-ikebukuro-out",
    status: "sold_out",
    price: 5000,
    stockCount: 0,
    saleAt: today,
    rawText: `完売しました！ありがとうございました`,
    createdAt: `${today}T12:00:00.000Z`,
    updatedAt: `${today}T12:00:00.000Z`,
    areaStatusDate: `tokyo#sold_out#${today}`,
    storeName: "トレカ天国池袋",
    storeAddress: "東京都豊島区西池袋1-2-3",
  },
  {
    postId: postIds.omiya1_out,
    storeId: storeIds.omiya1,
    tweetId: "tw-omiya1-out",
    status: "sold_out",
    price: 2000,
    stockCount: 0,
    saleAt: today,
    rawText: `本日分完売。次回は未定`,
    createdAt: `${today}T14:00:00.000Z`,
    updatedAt: `${today}T14:00:00.000Z`,
    areaStatusDate: `omiya#sold_out#${today}`,
    storeName: "ポケカ大宮店",
    storeAddress: "埼玉県さいたま市大宮区宮町1-1",
  },

  // ④ 昨日の on_sale（areaStatusDate に yesterday が含まれる → today クエリに非該当）
  {
    postId: postIds.akihabara_yd,
    storeId: storeIds.akihabara,
    tweetId: "tw-akihabara-yd",
    status: "on_sale",
    price: 3000,
    stockCount: 40,
    saleAt: yesterday,
    rawText: `昨日分のオリパ`,
    createdAt: `${yesterday}T09:00:00.000Z`,
    updatedAt: `${yesterday}T09:00:00.000Z`,
    areaStatusDate: `tokyo#on_sale#${yesterday}`,
    storeName: "カードショップ秋葉原",
    storeAddress: "東京都千代田区外神田1-1-1",
  },
  {
    postId: postIds.omiya2_yd,
    storeId: storeIds.omiya2,
    tweetId: "tw-omiya2-yd",
    status: "on_sale",
    price: 1000,
    stockCount: 50,
    saleAt: yesterday,
    rawText: `昨日のカードパラダイスオリパ`,
    createdAt: `${yesterday}T10:00:00.000Z`,
    updatedAt: `${yesterday}T10:00:00.000Z`,
    areaStatusDate: `omiya#on_sale#${yesterday}`,
    storeName: "カードパラダイス大宮",
    storeAddress: "埼玉県さいたま市大宮区桜木町2-3",
  },
];

// ─── Tweet IDs (ULID) ─────────────────────────────────────────────────────────
// ─── Tweets ───────────────────────────────────────────────────────────────────

const tweets: TweetItem[] = [
  // 未処理 × 3 → processStatus="UNPROCESSED" (GSI2 に存在)
  {
    tweetId: "tw-001",
    storeId: storeIds.akihabara,
    content: "本日もオリパやります！3000円〜 #ポケカ #オリパ",
    tweetedAt: `${today}T07:00:00.000Z`,
    isProcessed: false,
    fetchedAt: `${today}T07:30:00.000Z`,
    processStatus: "UNPROCESSED",
  },
  {
    tweetId: "tw-002",
    storeId: storeIds.ikebukuro,
    content: "限定オリパ入荷！5000円チャレンジ！",
    tweetedAt: `${today}T08:00:00.000Z`,
    isProcessed: false,
    fetchedAt: `${today}T08:15:00.000Z`,
    processStatus: "UNPROCESSED",
  },
  {
    tweetId: "tw-003",
    storeId: storeIds.omiya1,
    content: "大宮店です。本日2000円オリパ100パック用意しました",
    tweetedAt: `${today}T06:00:00.000Z`,
    isProcessed: false,
    fetchedAt: `${today}T06:30:00.000Z`,
    processStatus: "UNPROCESSED",
  },
  // 処理済 × 2 → processStatus なし (sparse — GSI2 から見えない)
  {
    tweetId: "tw-004",
    storeId: storeIds.akihabara,
    content: "昨日のオリパ情報です",
    tweetedAt: `${yesterday}T09:00:00.000Z`,
    isProcessed: true,
    fetchedAt: `${yesterday}T09:15:00.000Z`,
    // processStatus は付与しない
  },
  {
    tweetId: "tw-005",
    storeId: storeIds.omiya2,
    content: "カードパラダイス昨日分",
    tweetedAt: `${yesterday}T10:00:00.000Z`,
    isProcessed: true,
    fetchedAt: `${yesterday}T10:10:00.000Z`,
    // processStatus は付与しない
  },
];

// ─── 実行 ─────────────────────────────────────────────────────────────────────

async function seed(): Promise<void> {
  console.log(`📦  DEPLOY_ENV: ${DEPLOY_ENV}`);
  console.log(`    stores       → ${STORES_TABLE}`);
  console.log(`    oripa-posts  → ${ORIPA_POSTS_TABLE}`);
  console.log(`    tweets       → ${TWEETS_TABLE}`);
  console.log(`📅  今日 (JST): ${today}  /  昨日: ${yesterday}\n`);

  console.log("── Stores ──────────────────────────────");
  for (const item of stores) {
    await client.send(new PutCommand({ TableName: STORES_TABLE, Item: item }));
    console.log(`  ✓ ${item.name.padEnd(20)} storeId=${item.storeId}  [${item.area}]`);
  }

  console.log("\n── OripaPost ───────────────────────────");
  for (const item of posts) {
    await client.send(new PutCommand({ TableName: ORIPA_POSTS_TABLE, Item: item }));
    const note =
      item.postId === postIds.akihabara_pm
        ? " ← 同店舗2件目（重複排除でこちらが最新）"
        : item.status === "sold_out"
          ? " ← sold_out（トップページに出ない）"
          : item.saleAt === yesterday
            ? " ← 昨日分（areaStatusDate フィルタで除外）"
            : "";
    console.log(`  ✓ [${item.areaStatusDate.padEnd(25)}] ¥${item.price?.toLocaleString().padStart(5)}  createdAt=${item.createdAt.substring(11, 16)}${note}`);
  }

  console.log("\n── Tweets ──────────────────────────────");
  for (const item of tweets) {
    await client.send(new PutCommand({ TableName: TWEETS_TABLE, Item: item }));
    const processed = item.isProcessed ? "処理済（GSI2なし）" : "未処理（GSI2あり）";
    console.log(`  ✓ tweetId=${item.tweetId.padEnd(8)}  ${processed}`);
  }

  console.log(`
✅  シード完了！

【トップページに表示されるべき投稿（当日 on_sale, 最新順）】
  akihabara_pm  カードショップ秋葉原 13:00（最新、重複排除でこちらが残る）
  omiya2        カードパラダイス大宮 11:00
  ikebukuro     トレカ天国池袋      10:30
  omiya1        ポケカ大宮店        08:00

【表示されないはずの投稿】
  akihabara_am  → akihabara_pm より古い（deduplicateByStore で除外）
  ikebukuro_out, omiya1_out → sold_out（areaStatusDate フィルタ）
  akihabara_yd, omiya2_yd   → 昨日の投稿（areaStatusDate フィルタ）

【tweets GSI2（未処理キュー）】
  未処理: tw1, tw2, tw3  → processStatus="UNPROCESSED"
  処理済: tw4, tw5       → processStatus なし（sparse）
`);
}

seed().catch((err) => {
  console.error("❌  シード失敗:", err);
  process.exit(1);
});
