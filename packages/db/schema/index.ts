// ─── Table name helpers ───────────────────────────────────────────────────────
const DEPLOY_ENV = process.env.DEPLOY_ENV ?? "dev";

export const TABLE_NAMES = {
  stores: process.env.STORES_TABLE_NAME ?? `${DEPLOY_ENV}-stores`,
  oripaPosts: process.env.ORIPA_POSTS_TABLE_NAME ?? `${DEPLOY_ENV}-oripa-posts`,
  tweets: process.env.TWEETS_TABLE_NAME ?? `${DEPLOY_ENV}-tweets`,
  giveawayTweets: process.env.GIVEAWAY_TWEETS_TABLE_NAME ?? `${DEPLOY_ENV}-giveaway-tweets`,
  giveawayPosts: process.env.GIVEAWAY_POSTS_TABLE_NAME ?? `${DEPLOY_ENV}-giveaway-posts`,
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
  /** GSI1 on giveaway-posts: statusDeadline → createdAt */
  giveawayPostsByStatusDeadline: "GSI1",
  /** GSI2 on giveaway-tweets: processStatus → fetchedAt (sparse, batch queue) */
  unprocessedGiveawayTweets: "GSI2",
} as const;

// ─── Item types ───────────────────────────────────────────────────────────────

export type StoreItem = {
  storeId: string;          // ULID — PK of ${env}-stores
  name: string;
  twitterUsername: string;
  area: "tokyo" | "omiya" | "akihabara" | "ikebukuro" | "shinjuku" | "namba" | "umeda" | "kawagoe";
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
  lastOnePrizeName?: string; // Product name of the last-one prize (ラストワン賞), if present
  atariCards?: string[];    // List of hit card names (あたりカード), if present
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
  tweetId: string;          // Twitter's tweet ID — PK of ${env}-tweets
  storeId: string;          // ULID — FK to stores
  content: string;
  tweetedAt: string;        // ISO 8601
  isProcessed: boolean;
  fetchedAt: string;        // ISO 8601
  // GSI2 sparse attribute — present only when not yet processed
  processStatus?: "UNPROCESSED";
};

// ─── Giveaway types ───────────────────────────────────────────────────────────

export type GiveawayPrize = {
  type: "box" | "single" | "other";
  name: string;
  count?: number;           // Number of winners, if stated
};

export type GiveawayTweetItem = {
  tweetId: string;          // Twitter's tweet ID — PK of ${env}-giveaway-tweets
  sourceType: "store" | "search";
  storeId?: string;         // ULID — set when sourceType="store"
  twitterUsername: string;
  content: string;
  tweetedAt: string;        // ISO 8601
  fetchedAt: string;        // ISO 8601
  isProcessed: boolean;
  // GSI2 sparse attribute — present only when not yet processed
  processStatus?: "UNPROCESSED";
};

export type GiveawayPostItem = {
  postId: string;           // Twitter tweet ID — PK of ${env}-giveaway-posts
  tweetId: string;
  sourceType: "store" | "search";
  storeId?: string;
  storeName?: string;       // Denormalized from stores
  twitterUsername: string;
  status: "active" | "ended" | "upcoming";
  prizes: GiveawayPrize[];
  conditions?: string;      // e.g. "フォロー＋RT"
  deadline?: string;        // YYYY-MM-DD; absent if not parseable from tweet
  rawText: string;
  createdAt: string;        // ISO 8601
  updatedAt: string;        // ISO 8601
  // GSI1 attribute: "{status}#{deadline}" e.g. "active#2026-06-01"
  // Unknown deadline uses sentinel "active#9999-12-31"
  statusDeadline: string;
};
