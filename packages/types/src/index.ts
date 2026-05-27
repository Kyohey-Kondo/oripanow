export interface AdminActions {
  followed?: boolean;
  reposted?: boolean;
  replied?: boolean;
  done?: boolean;
}

export interface EntryConditions {
  follow: boolean;
  repost: boolean;
  reply: boolean;
  other: boolean;
  note?: string;
}

export interface GiveawayPrize {
  type: "box" | "single" | "other";
  name: string;
  count?: number;
}

export interface GiveawayPostSummary {
  postId: string;
  tweetId: string;
  twitterUsername: string;
  sourceType: "store" | "search";
  storeId?: string;
  storeName?: string;
  prizes: GiveawayPrize[];
  entryConditions?: EntryConditions;
  adminActions?: AdminActions;
  deadline?: string;        // YYYY-MM-DD
  daysRemaining?: number;   // Computed from deadline − today
  createdAt: string;
  status: "active" | "ended" | "upcoming";
}

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
  /** Area key (e.g. "akihabara"), if known */
  area?: string;
}

