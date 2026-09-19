import type { Page } from 'playwright-core';

export type ScrapedItem = {
  productUrl: string;
  imageUrl: string;
};

const BASE_URL = 'https://orikuji.com';
const CATEGORY_PATH = '/gacha/pokemon';
const MAX_LOAD_MORE_CLICKS = 20;

/**
 * Scrapes the オリくじ ポケモンカード category page. Items are added behind a
 * "もっと見る" (load more) button rather than being paginated by URL, so we
 * click it repeatedly until it disappears before reading the full item list.
 */
export async function scrapeOrikujiPokemonItems(page: Page): Promise<ScrapedItem[]> {
  const categoryUrl = `${BASE_URL}${CATEGORY_PATH}`;
  await page.goto(categoryUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector(`a[href^="${CATEGORY_PATH}/"]`, { timeout: 15_000 });

  const loadMoreButton = page.getByText('もっと見る', { exact: false }).first();
  for (let i = 0; i < MAX_LOAD_MORE_CLICKS; i++) {
    const isVisible = await loadMoreButton.isVisible().catch(() => false);
    if (!isVisible) break;
    await loadMoreButton.click();
    await page.waitForTimeout(800);
  }

  return page.$$eval(
    `a[href^="${CATEGORY_PATH}/"]`,
    (anchors, base) => {
      const seen = new Set<string>();
      const results: { productUrl: string; imageUrl: string }[] = [];
      for (const a of anchors) {
        const href = a.getAttribute('href');
        const src = a.querySelector('img')?.getAttribute('src');
        if (!href || !src || seen.has(href)) continue;
        seen.add(href);
        results.push({ productUrl: new URL(href, base).toString(), imageUrl: src });
      }
      return results;
    },
    BASE_URL,
  );
}
