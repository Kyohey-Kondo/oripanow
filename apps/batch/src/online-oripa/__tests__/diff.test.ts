import { describe, expect, it } from 'vitest';
import type { OnlineOripaItem } from '@oripa-now/db';
import { findMissingItems, isAnomalousDrop, MAX_MISS_COUNT } from '../diff';
import type { ScrapedItem } from '../types';

function makeItem(overrides: Partial<OnlineOripaItem> = {}): OnlineOripaItem {
  return {
    itemId: 'item-1',
    provider: 'orikuji',
    productUrl: 'https://orikuji.com/gacha/pokemon/ga0011',
    imageUrl: 'https://media.orikuji.com/gacha/ga0011_thumb.webp',
    status: 'active',
    missCount: 0,
    firstSeenAt: '2026-09-01T00:00:00.000Z',
    lastSeenAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    activeStatus: 'ACTIVE',
    ...overrides,
  };
}

describe('isAnomalousDrop', () => {
  it('is false when there was nothing active before (first run)', () => {
    expect(isAnomalousDrop(0, 0)).toBe(false);
  });

  it('is false for a normal fluctuation', () => {
    expect(isAnomalousDrop(100, 90)).toBe(false);
  });

  it('is true when the scraped count drops below half the previous active count', () => {
    expect(isAnomalousDrop(100, 49)).toBe(true);
  });

  it('is false exactly at the 50% boundary', () => {
    expect(isAnomalousDrop(100, 50)).toBe(false);
  });

  it('is true when everything disappears', () => {
    expect(isAnomalousDrop(100, 0)).toBe(true);
  });
});

describe('findMissingItems', () => {
  it('returns active items whose productUrl was not scraped this run', () => {
    const active = [makeItem({ itemId: 'a', productUrl: 'https://orikuji.com/gacha/pokemon/a' }), makeItem({ itemId: 'b', productUrl: 'https://orikuji.com/gacha/pokemon/b' })];
    const scraped: ScrapedItem[] = [{ productUrl: 'https://orikuji.com/gacha/pokemon/a', imageUrl: 'https://media.orikuji.com/a.webp' }];

    const missing = findMissingItems(active, scraped);

    expect(missing.map((i) => i.itemId)).toEqual(['b']);
  });

  it('returns nothing when every active item was scraped again', () => {
    const active = [makeItem({ productUrl: 'https://orikuji.com/gacha/pokemon/a' })];
    const scraped: ScrapedItem[] = [{ productUrl: 'https://orikuji.com/gacha/pokemon/a', imageUrl: 'https://media.orikuji.com/a.webp' }];

    expect(findMissingItems(active, scraped)).toEqual([]);
  });
});

describe('MAX_MISS_COUNT', () => {
  it('is 3, per the ended-listing requirement (3 consecutive misses)', () => {
    expect(MAX_MISS_COUNT).toBe(3);
  });
});
