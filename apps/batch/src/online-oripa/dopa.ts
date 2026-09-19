import * as cheerio from 'cheerio';
import type { ScrapedItem } from './types';

const BASE_URL = 'https://dopa-game.jp';
const CATEGORY_PATH = '/pokemon';

/**
 * Scrapes the DOPA ポケモンカード category page. Unlike オリくじ, DOPA's
 * catalog is server-rendered — the product links and thumbnails are already
 * present in the initial HTML, so a plain fetch is enough; no headless
 * browser needed.
 */
export async function scrapeDopaPokemonItems(): Promise<ScrapedItem[]> {
  const res = await fetch(`${BASE_URL}${CATEGORY_PATH}`);
  if (!res.ok) {
    throw new Error(`DOPA category page fetch failed: ${res.status}`);
  }
  const html = await res.text();
  const $ = cheerio.load(html);

  const seen = new Set<string>();
  const results: ScrapedItem[] = [];

  $(`a[href^="${CATEGORY_PATH}/gacha/"]`).each((_, el) => {
    const href = $(el).attr('href');
    const src = $(el).find('img').first().attr('src');
    if (!href || !src || seen.has(href)) return;
    seen.add(href);
    results.push({
      productUrl: new URL(href, BASE_URL).toString(),
      imageUrl: new URL(src, BASE_URL).toString(),
    });
  });

  return results;
}
