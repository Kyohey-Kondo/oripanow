import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { queryActiveGiveawaysForDateRange, TABLE_NAME } from "@oripa-now/db/queries/giveaway-posts";
import type { GiveawayPostItem } from "@oripa-now/db";
import type { GiveawayPostSummary } from "@oripa-now/types";

// ─── Sort / Filter types ──────────────────────────────────────────────────────

export type GiveawaySortOption = "deadline_asc" | "newest";
export type GiveawayFilterOption = "box" | "single";

export const VALID_GIVEAWAY_SORTS: GiveawaySortOption[] = ["deadline_asc", "newest"];
export const VALID_GIVEAWAY_FILTERS: GiveawayFilterOption[] = ["box", "single"];

// ─── Pure helpers ─────────────────────────────────────────────────────────────

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

function computeDaysRemaining(deadline: string | undefined): number | undefined {
  if (!deadline || deadline === "9999-12-31") return undefined;
  const today = new Date(getTodayJST());
  const end = new Date(deadline);
  const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

/** Map GiveawayPostItem[] to GiveawayPostSummary[] for the UI layer. */
export function mapToGiveawaySummary(items: GiveawayPostItem[]): GiveawayPostSummary[] {
  return items.map((item) => ({
    postId: item.postId,
    tweetId: item.tweetId,
    twitterUsername: item.twitterUsername,
    sourceType: item.sourceType,
    ...(item.storeId ? { storeId: item.storeId } : {}),
    ...(item.storeName ? { storeName: item.storeName } : {}),
    prizes: item.prizes,
    ...(item.conditions ? { conditions: item.conditions } : {}),
    ...(item.deadline ? { deadline: item.deadline } : {}),
    daysRemaining: computeDaysRemaining(item.deadline),
    createdAt: item.createdAt,
    status: item.status,
  }));
}

/**
 * Sort GiveawayPostSummary[] by the given sort option.
 * deadline_asc: soonest first, unknown deadlines at end.
 * newest: most recently posted first.
 */
export function sortGiveaways(
  items: GiveawayPostSummary[],
  sort: GiveawaySortOption,
): GiveawayPostSummary[] {
  if (sort === "newest") {
    return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  // deadline_asc: sort by deadline string; "9999-12-31" sentinel sorts to end naturally
  return [...items].sort((a, b) => {
    const aDeadline = a.deadline ?? "9999-12-31";
    const bDeadline = b.deadline ?? "9999-12-31";
    return aDeadline.localeCompare(bDeadline);
  });
}

/**
 * Filter GiveawayPostSummary[] by prize type.
 * undefined: no filtering.
 * "box": only giveaways that have at least one BOX prize.
 * "single": only giveaways that have at least one single card prize.
 */
export function filterGiveaways(
  items: GiveawayPostSummary[],
  filter: GiveawayFilterOption | undefined,
): GiveawayPostSummary[] {
  if (!filter) return items;
  return items.filter((item) => item.prizes.some((p) => p.type === filter));
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

/**
 * Top-level function called by the /giveaway Server Component.
 * Queries DynamoDB for active giveaway campaigns, applies sort/filter, and returns UI-ready summaries.
 */
export async function getActiveGiveaways(
  filter?: GiveawayFilterOption,
  sort: GiveawaySortOption = "deadline_asc",
): Promise<GiveawayPostSummary[]> {
  const client = DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: process.env.AWS_REGION ?? "ap-northeast-1" }),
  );

  try {
    const items = await queryActiveGiveawaysForDateRange(client, TABLE_NAME);
    const summaries = mapToGiveawaySummary(items);
    const filtered = filterGiveaways(summaries, filter);
    return sortGiveaways(filtered, sort);
  } catch (err) {
    console.error("[getActiveGiveaways] DynamoDB query failed:", err);
    return [];
  }
}
