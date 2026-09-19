import type { OnlineOripaItem } from '@oripa-now/db';
import type { ScrapedItem } from './types';

export const MAX_MISS_COUNT = 3;
export const ANOMALY_DROP_RATIO = 0.5;

/**
 * True when the scraped count drops sharply versus the currently active
 * count in DB — treated as a scraping failure, not a real sell-out, so the
 * caller should skip writing and keep the existing listing as-is.
 */
export function isAnomalousDrop(previousActiveCount: number, scrapedCount: number): boolean {
  if (previousActiveCount === 0) return false;
  return scrapedCount < previousActiveCount * ANOMALY_DROP_RATIO;
}

/**
 * Active DB items whose productUrl was not present in this run's scrape —
 * candidates for a missCount bump (and eventual deactivation).
 */
export function findMissingItems(
  activeItems: OnlineOripaItem[],
  scraped: ScrapedItem[],
): OnlineOripaItem[] {
  const scrapedUrls = new Set(scraped.map((s) => s.productUrl));
  return activeItems.filter((item) => !scrapedUrls.has(item.productUrl));
}
