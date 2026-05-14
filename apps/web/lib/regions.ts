export type RegionKey = 'kanto' | 'kansai';

export type Region = {
  key: RegionKey;
  label: string;
  areas: string[];
};

export const REGIONS: Region[] = [
  { key: 'kanto',  label: '関東', areas: ['akihabara', 'ikebukuro', 'shinjuku', 'kawagoe', 'omiya'] },
  { key: 'kansai', label: '関西', areas: ['namba', 'umeda'] },
];

/** エリアキーからリージョンキーを返す。該当なしは null */
export function getRegionForArea(area: string): RegionKey | null {
  return REGIONS.find((r) => r.areas.includes(area))?.key ?? null;
}

/** リージョンキーに属するエリアキー一覧を返す。null/未知の場合は全エリアを返す */
export function getAreasForRegion(region: string | null | undefined): string[] {
  if (!region) return REGIONS.flatMap((r) => r.areas);
  return REGIONS.find((r) => r.key === region)?.areas ?? REGIONS.flatMap((r) => r.areas);
}
