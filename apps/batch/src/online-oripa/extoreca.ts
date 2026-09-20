import type { ScrapedItem } from './types';

const API_URL = 'https://oripa-api.ex-toreca.com/1/original-packs/pokemon?isNativeApp=false&platform=web';
const PACK_URL_BASE = 'https://oripa.ex-toreca.com/pack';

type OriginalPack = {
  id: number;
  topThumbnail: string;
};

type OriginalPacksResponse = {
  status: string;
  data: {
    originalPacks: OriginalPack[];
  };
};

/**
 * Scrapes エクストレカ's ポケモン original-pack list. The site's own frontend
 * (a statically-exported Next.js SPA) fetches this same unauthenticated JSON
 * API to render the pack grid — no HTML parsing or headless browser needed.
 */
export async function scrapeExtorecaPokemonItems(): Promise<ScrapedItem[]> {
  const res = await fetch(API_URL);
  if (!res.ok) {
    throw new Error(`エクストレカ original-packs API fetch failed: ${res.status}`);
  }
  const body = (await res.json()) as OriginalPacksResponse;
  if (body.status !== 'success') {
    throw new Error(`エクストレカ original-packs API returned status: ${body.status}`);
  }

  return body.data.originalPacks
    .filter((pack) => pack.topThumbnail)
    .map((pack) => ({
      productUrl: `${PACK_URL_BASE}/${pack.id}`,
      imageUrl: pack.topThumbnail,
    }));
}
