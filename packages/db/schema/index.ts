// ─── Table name helpers ───────────────────────────────────────────────────────
const DEPLOY_ENV = process.env.DEPLOY_ENV ?? "dev";

export const TABLE_NAMES = {
  stores: process.env.STORES_TABLE_NAME ?? `${DEPLOY_ENV}-stores`,
  oripaPosts: process.env.ORIPA_POSTS_TABLE_NAME ?? `${DEPLOY_ENV}-oripa-posts`,
  tweets: process.env.TWEETS_TABLE_NAME ?? `${DEPLOY_ENV}-tweets`,
} as const;

// ─── GSI names ────────────────────────────────────────────────────────────────
export const GSI = {
  /** GSI1 on oripa-posts: areaStatusDate → createdAt (top page, area page) */
  oripaPostsByAreaStatusDate: "GSI1",
  /** GSI2 on oripa-posts: storeId → createdAt (store detail page) */
  oripaPostsByStore: "GSI2",
  /** GSI1 on tweets: storeId → tweetedAt */
  tweetsByStore: "GSI1",
  /** GSI2 on tweets: processStatus → fetchedAt (sparse, batch queue) */
  unprocessedTweets: "GSI2",
} as const;

// ─── Item types ───────────────────────────────────────────────────────────────

export type StoreItem = {
  storeId: string;          // ULID — PK of ${env}-stores
  name: string;
  twitterUsername: string;
  area: "tokyo" | "omiya";
  address?: string;
  lat?: number;
  lng?: number;
  isActive: boolean;
  createdAt: string;        // ISO 8601
  updatedAt: string;        // ISO 8601
  lastFetchedTweetId?: string; // Highest tweet ID seen on last successful fetch; used as since_id
};

export type OripaPostItem = {
  postId: string;           // ULID — PK of ${env}-oripa-posts
  storeId: string;          // ULID — FK to stores
  tweetId: string;          // Twitter tweet ID (external)
  status: "on_sale" | "sold_out" | "upcoming";
  price?: number;
  stockCount?: number;
  saleAt: string;           // YYYY-MM-DD
  rawText: string;
  createdAt: string;        // ISO 8601
  updatedAt: string;        // ISO 8601
  // GSI1 attribute: "${area}#${status}#${saleAt}" e.g. "tokyo#on_sale#2026-04-13"
  areaStatusDate: string;
  // Denormalized from stores (avoids JOIN on read path)
  storeName: string;
  storeAddress?: string;
};

export type TweetItem = {
  id: string;               // ULID — PK of ${env}-tweets (internal ID)
  tweetId: string;          // Twitter's tweet ID (external)
  storeId: string;          // ULID — FK to stores
  content: string;
  tweetedAt: string;        // ISO 8601
  isProcessed: boolean;
  fetchedAt: string;        // ISO 8601
  // GSI2 sparse attribute — present only when not yet processed
  processStatus?: "UNPROCESSED";
};
