import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import {
  queryRecentOnSalePostsByArea,
  TABLE_NAME,
} from "@oripa-now/db/queries/oripa-posts";
import type { OripaPostItem } from "@oripa-now/db";
import type { OripaPostSummary } from "@oripa-now/types";

const AREAS = ["akihabara", "kawagoe", "omiya", "urawamisono"] as const;
const MAX_RESULTS = 50;

// ─── Pure functions ───────────────────────────────────────────────────────────

/** Sort posts by createdAt descending (newest first). Returns a new array. */
export function sortNewestFirst(posts: OripaPostItem[]): OripaPostItem[] {
  return [...posts].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}


/** Limit the result list to at most `limit` items. */
export function capResults(posts: OripaPostItem[], limit: number): OripaPostItem[] {
  return posts.slice(0, limit);
}

/** Map OripaPostItem[] to OripaPostSummary[] for the UI layer. */
export function mapToSummary(posts: OripaPostItem[]): OripaPostSummary[] {
  return posts.map((p) => ({
    postId: p.postId,
    storeId: p.storeId,
    storeName: p.storeName,
    createdAt: p.createdAt,
    saleAt: p.saleAt,
    tweetId: p.tweetId,
    ...(p.price !== undefined && { price: p.price }),
    ...(p.stockCount !== undefined && { stockCount: p.stockCount }),
  }));
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

/**
 * Top-level function called by the Next.js Server Component.
 * Queries DynamoDB, applies all processing, and returns UI-ready summaries.
 * Returns [] if no stores have available stock in the last 14 days.
 * When `area` is a known area key, only that area is queried.
 */
export async function getTodayOnSalePosts(area?: string): Promise<OripaPostSummary[]> {
  const client = DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: process.env.AWS_REGION ?? "ap-northeast-1" }),
  );

  const areasToQuery = area && AREAS.includes(area as typeof AREAS[number])
    ? [area as typeof AREAS[number]]
    : AREAS;

  try {
    const results = await Promise.all(
      areasToQuery.map((a) =>
        queryRecentOnSalePostsByArea(client, TABLE_NAME, a),
      ),
    );
    const all = results.flat();
    return mapToSummary(capResults(sortNewestFirst(all), MAX_RESULTS));
  } catch (err) {
    console.error("[getTodayOnSalePosts] DynamoDB query failed:", err);
    return [];
  }
}
