export const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME ?? "oripa-now";

// ─── Key prefixes ─────────────────────────────────────────────────────────────
export const Keys = {
  store: (id: string) => ({ PK: `STORE#${id}`, SK: `STORE#${id}` }),
  post: (id: string) => ({ PK: `POST#${id}`, SK: `POST#${id}` }),
  tweet: (storeId: string, tweetedAt: string, tweetId: string) => ({
    PK: `STORE#${storeId}`,
    SK: `TWEET#${tweetedAt}#${tweetId}`,
  }),
} as const;

// ─── GSI names ────────────────────────────────────────────────────────────────
export const GSI = {
  /** GSI1: area+status → oripa posts（トップ・エリア別ページ） */
  byAreaStatus: "GSI1",
  /** GSI2: store_id → oripa posts（店舗詳細ページ） */
  byStore: "GSI2",
  /** GSI3: sparse index for unprocessed tweets（バッチ用） */
  unprocessed: "GSI3",
} as const;

// ─── GSI key helpers ─────────────────────────────────────────────────────────
export const GsiKeys = {
  /** GSI1: エリア別・ステータス別クエリ用 */
  post: (area: string, status: string, saleAtDate: string, createdAt: string) => ({
    GSI1PK: `${area}#${status}`,
    GSI1SK: `${saleAtDate}#${createdAt}`,
  }),
  /** GSI2: 店舗別クエリ用 */
  postByStore: (storeId: string, createdAt: string) => ({
    GSI2PK: `STORE#${storeId}`,
    GSI2SK: `CREATED#${createdAt}`,
  }),
  /** GSI3: 未処理ツイート用（sparse — 未処理時のみ付与） */
  unprocessedTweet: (fetchedAt: string) => ({
    GSI3PK: "UNPROCESSED",
    GSI3SK: `FETCHED#${fetchedAt}`,
  }),
} as const;

// ─── Item types ───────────────────────────────────────────────────────────────
export type StoreItem = {
  PK: string;
  SK: string;
  type: "STORE";
  id: string;
  twitterUsername: string;
  name: string;
  area: "tokyo" | "omiya";
  address?: string;
  lat?: number;
  lng?: number;
  isActive: boolean;
};

export type OripaPostItem = {
  PK: string;
  SK: string;
  type: "POST";
  id: string;
  storeId: string;
  tweetId: string;
  status: "on_sale" | "sold_out" | "upcoming";
  price?: number;
  stockCount?: number;
  saleAt?: string;
  rawText: string;
  createdAt: string;
  updatedAt: string;
  // GSI1
  GSI1PK: string;
  GSI1SK: string;
  // GSI2
  GSI2PK: string;
  GSI2SK: string;
  // 非正規化（JOIN レス）
  storeName: string;
  storeAddress?: string;
  storeLat?: number;
  storeLng?: number;
};

export type TweetItem = {
  PK: string;
  SK: string;
  type: "TWEET";
  tweetId: string;
  storeId: string;
  content: string;
  tweetedAt: string;
  isProcessed: boolean;
  fetchedAt: string;
  // GSI3（sparse: 未処理時のみ存在）
  GSI3PK?: string;
  GSI3SK?: string;
};
