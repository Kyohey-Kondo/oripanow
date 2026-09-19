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
  // Generous margin: a reused Lambda execution environment can be noticeably
  // slower to render this SPA than a fresh one (observed 15s as too tight).
  await page.waitForSelector(`a[href^="${CATEGORY_PATH}/"]`, { timeout: 30_000 });

  const loadMoreButton = page.getByText('もっと見る', { exact: false }).first();
  for (let i = 0; i < MAX_LOAD_MORE_CLICKS; i++) {
    const isVisible = await loadMoreButton.isVisible().catch(() => false);
    if (!isVisible) break;
    // A native DOM click (not Playwright's pointer-simulated click) — the
    // feed's item cards can visually overlap the button as they lazy-load,
    // which makes Playwright's actionability check time out.
    await loadMoreButton.evaluate((el) => (el as HTMLElement).click());
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
        // Some items (e.g. a "user limit reached" placeholder) use a relative
        // image src instead of the usual absolute media.orikuji.com URL.
        results.push({ productUrl: new URL(href, base).toString(), imageUrl: new URL(src, base).toString() });
      }
      return results;
    },
    BASE_URL,
  );
}
