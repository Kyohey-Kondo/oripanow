import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchGetCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import {
  queryRecentOnSalePostsByArea,
  queryRecentPostsByStore,
  TABLE_NAME,
} from "@oripa-now/db/queries/oripa-posts";
import type { OripaPostItem, StoreItem } from "@oripa-now/db";
import { TABLE_NAMES } from "@oripa-now/db";
import type { OripaPostSummary } from "@oripa-now/types";

const AREAS = ["akihabara", "kawagoe", "omiya", "urawamisono"] as const;
const MAX_RESULTS = 60;

// ─── Pure functions ───────────────────────────────────────────────────────────

/** Sort posts by tweetId descending (newest tweet first). Returns a new array. */
export function sortNewestFirst(posts: OripaPostItem[]): OripaPostItem[] {
  return [...posts].sort((a, b) => (BigInt(a.tweetId) < BigInt(b.tweetId) ? 1 : BigInt(a.tweetId) > BigInt(b.tweetId) ? -1 : 0));
}


/**
 * Deduplicate posts with the same storeId + price + stockCount.
 * Assumes posts are already sorted newest-first — keeps the first occurrence.
 */
export function deduplicateByPriceAndStock(posts: OripaPostItem[]): OripaPostItem[] {
  const seen = new Set<string>();
  return posts.filter((p) => {
    const key = `${p.storeId}#${p.price ?? ""}#${p.stockCount ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Limit the result list to at most `limit` items. */
export function capResults(posts: OripaPostItem[], limit: number): OripaPostItem[] {
  return posts.slice(0, limit);
}

/** Map OripaPostItem[] to OripaPostSummary[] for the UI layer. */
export function mapToSummary(
  posts: OripaPostItem[],
  storeMap: Map<string, string> = new Map(),
): OripaPostSummary[] {
  return posts.map((p) => ({
    postId: p.postId,
    storeId: p.storeId,
    storeName: p.storeName,
    twitterUsername: storeMap.get(p.storeId) ?? '',
    createdAt: p.createdAt,
    saleAt: p.saleAt,
    tweetId: p.tweetId,
    ...(p.price !== undefined && { price: p.price }),
    ...(p.stockCount !== undefined && { stockCount: p.stockCount }),
    ...(p.lastOnePrizeName !== undefined && { lastOnePrizeName: p.lastOnePrizeName }),
  }));
}

// ─── Orchestrators ───────────────────────────────────────────────────────────

/**
 * Shop detail page: fetch all posts for a single store in the last 14 days.
 * Returns summaries plus the store's name and twitterUsername for the heading and oEmbed.
 */
export async function getShopPosts(storeId: string): Promise<{
  summaries: OripaPostSummary[];
  storeName: string;
  twitterUsername: string;
}> {
  const client = DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: process.env.AWS_REGION ?? "ap-northeast-1" }),
  );

  try {
    const [posts, storeResult] = await Promise.all([
      queryRecentPostsByStore(client, TABLE_NAME, storeId),
      client.send(new GetCommand({
        TableName: TABLE_NAMES.stores,
        Key: { storeId },
        ProjectionExpression: "storeId, #n, twitterUsername",
        ExpressionAttributeNames: { "#n": "name" },
      })),
    ]);

    const store = storeResult.Item as StoreItem | undefined;
    const storeName = store?.name ?? "";
    const twitterUsername = store?.twitterUsername ?? "";

    const storeMap = new Map([[storeId, twitterUsername]]);
    const processed = capResults(deduplicateByPriceAndStock(sortNewestFirst(posts)), MAX_RESULTS);
    return { summaries: mapToSummary(processed, storeMap), storeName, twitterUsername };
  } catch (err) {
    console.error("[getShopPosts] DynamoDB query failed:", err);
    return { summaries: [], storeName: "", twitterUsername: "" };
  }
}

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
    const processed = capResults(deduplicateByPriceAndStock(sortNewestFirst(all)), MAX_RESULTS);

    // Fetch twitterUsername for unique storeIds via BatchGet
    const storeIds = [...new Set(processed.map((p) => p.storeId))];
    const storeMap = new Map<string, string>();
    if (storeIds.length > 0) {
      const batchResult = await client.send(new BatchGetCommand({
        RequestItems: {
          [TABLE_NAMES.stores]: {
            Keys: storeIds.map((id) => ({ storeId: id })),
            ProjectionExpression: 'storeId, twitterUsername',
          },
        },
      }));
      const stores = (batchResult.Responses?.[TABLE_NAMES.stores] ?? []) as StoreItem[];
      for (const s of stores) storeMap.set(s.storeId, s.twitterUsername);
    }

    return mapToSummary(processed, storeMap);
  } catch (err) {
    console.error("[getTodayOnSalePosts] DynamoDB query failed:", err);
    return [];
  }
}
