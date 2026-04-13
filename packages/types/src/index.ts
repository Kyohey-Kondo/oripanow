export interface OripaPostSummary {
  postId: string;
  storeId: string;
  storeName: string;
  /** ISO timestamp of when this post was created (for display and sort ordering) */
  createdAt: string;
  /** Price in JPY, if known */
  price?: number;
  /** Stock count, if known */
  stockCount?: number;
}

