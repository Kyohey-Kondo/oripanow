export interface OripaPostSummary {
  postId: string;
  storeId: string;
  storeName: string;
  /** ISO timestamp of when this post was created (for display and sort ordering) */
  createdAt: string;
  /** Advertised sale date in JST (YYYY-MM-DD) */
  saleAt: string;
  /** Twitter tweet ID — used to construct the tweet URL */
  tweetId: string;
  /** Twitter username of the store — used to construct oEmbed URL */
  twitterUsername: string;
  /** Price in JPY, if known */
  price?: number;
  /** Stock count, if known */
  stockCount?: number;
  /** Product name of the last-one prize (ラストワン賞), if present */
  lastOnePrizeName?: string;
  /** List of hit card names (あたりカード), if present */
  atariCards?: string[];
}

