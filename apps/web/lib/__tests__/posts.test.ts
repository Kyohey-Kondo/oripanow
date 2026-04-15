import { describe, expect, it } from "vitest";
import type { OripaPostItem } from "@oripa-now/db";
import {
  capResults,
  deduplicateByPriceAndStock,
  mapToSummary,
  sortNewestFirst,
} from "../posts";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makePost(overrides: Partial<OripaPostItem> = {}): OripaPostItem {
  return {
    postId: "post-default",
    storeId: "store-default",
    tweetId: "tweet-default",
    status: "on_sale",
    saleAt: "2026-04-13",
    rawText: "test",
    createdAt: "2026-04-13T09:00:00.000Z",
    updatedAt: "2026-04-13T09:00:00.000Z",
    storeName: "Test Store",
    areaStatusDate: "tokyo#on_sale#2026-04-13",
    ...overrides,
  };
}

// ─── sortNewestFirst ──────────────────────────────────────────────────────────

describe("sortNewestFirst", () => {
  it("T-01: newer post appears at index 0", () => {
    const older = makePost({ postId: "post-older", tweetId: "1000000000000000000" });
    const newer = makePost({ postId: "post-newer", tweetId: "2000000000000000000" });
    const result = sortNewestFirst([older, newer]);
    expect(result[0].postId).toBe("post-newer");
    expect(result[1].postId).toBe("post-older");
  });

  it("T-02: single post returns a one-element array", () => {
    const post = makePost({ postId: "post-single" });
    const result = sortNewestFirst([post]);
    expect(result).toHaveLength(1);
    expect(result[0].postId).toBe("post-single");
  });

  it("T-03: empty input returns []", () => {
    expect(sortNewestFirst([])).toEqual([]);
  });
});


// ─── deduplicateByPriceAndStock ───────────────────────────────────────────────

describe("deduplicateByPriceAndStock", () => {
  it("T-04: same store, same price+stock — keeps newest only", () => {
    const newer = makePost({ postId: "post-new", storeId: "store-a", price: 3000, stockCount: 10, createdAt: "2026-04-13T10:00:00.000Z" });
    const older = makePost({ postId: "post-old", storeId: "store-a", price: 3000, stockCount: 10, createdAt: "2026-04-13T09:00:00.000Z" });
    const result = deduplicateByPriceAndStock([newer, older]);
    expect(result).toHaveLength(1);
    expect(result[0].postId).toBe("post-new");
  });

  it("T-05: same store, different price — keeps both", () => {
    const a = makePost({ postId: "post-a", storeId: "store-a", price: 1000, stockCount: 10 });
    const b = makePost({ postId: "post-b", storeId: "store-a", price: 3000, stockCount: 10 });
    expect(deduplicateByPriceAndStock([a, b])).toHaveLength(2);
  });

  it("T-06: different stores, same price+stock — keeps both", () => {
    const a = makePost({ postId: "post-a", storeId: "store-a", price: 3000, stockCount: 10 });
    const b = makePost({ postId: "post-b", storeId: "store-b", price: 3000, stockCount: 10 });
    expect(deduplicateByPriceAndStock([a, b])).toHaveLength(2);
  });
});

// ─── capResults ───────────────────────────────────────────────────────────────

describe("capResults", () => {
  it("T-07: array of 5, limit 3 — returns first 3 elements", () => {
    const posts = [1, 2, 3, 4, 5].map((n) =>
      makePost({ postId: `post-${n}`, storeId: `store-${n}` }),
    );
    const result = capResults(posts, 3);
    expect(result).toHaveLength(3);
    expect(result[0].postId).toBe("post-1");
    expect(result[2].postId).toBe("post-3");
  });

  it("T-08: array of 2, limit 50 — returns all 2", () => {
    const posts = [1, 2].map((n) =>
      makePost({ postId: `post-${n}`, storeId: `store-${n}` }),
    );
    const result = capResults(posts, 50);
    expect(result).toHaveLength(2);
  });
});

// ─── mapToSummary ─────────────────────────────────────────────────────────────

describe("mapToSummary", () => {
  it("T-09: correctly maps all fields from OripaPostItem", () => {
    const post = makePost({
      postId: "post-map",
      storeId: "store-map",
      storeName: "Map Store",
      createdAt: "2026-04-13T09:30:00.000Z",
      price: 3000,
      stockCount: 10,
    });
    const [summary] = mapToSummary([post]);
    expect(summary.postId).toBe("post-map");
    expect(summary.storeId).toBe("store-map");
    expect(summary.storeName).toBe("Map Store");
    expect(summary.createdAt).toBe("2026-04-13T09:30:00.000Z");
    expect(summary.saleAt).toBe("2026-04-13");
    expect(summary.price).toBe(3000);
    expect(summary.stockCount).toBe(10);
  });
});

// ─── Pipeline (empty-state) ───────────────────────────────────────────────────

describe("pipeline (empty-state)", () => {
  it("T-10: all functions composed with empty input returns []", () => {
    const result = mapToSummary(capResults(sortNewestFirst([]), 50));
    expect(result).toEqual([]);
  });
});
