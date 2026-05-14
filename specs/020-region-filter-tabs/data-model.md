# Data Model: Region Filter Tabs

## No DynamoDB changes

This feature is purely a UI/routing concern. Existing `oripa-posts` GSI1 queries remain unchanged.

---

## New: Region configuration (`apps/web/lib/regions.ts`)

```ts
export type RegionKey = 'kanto' | 'kansai';

export type Region = {
  key: RegionKey;
  label: string;       // Display label (日本語)
  areas: string[];     // Ordered list of area keys belonging to this region
};

export const REGIONS: Region[] = [
  { key: 'kanto',  label: '関東', areas: ['akihabara', 'ikebukuro', 'shinjuku', 'kawagoe', 'omiya'] },
  { key: 'kansai', label: '関西', areas: ['namba', 'umeda'] },
];

// Helper: resolve area key → parent region
export function getRegionForArea(area: string): RegionKey | null

// Helper: resolve region key → ordered area keys (returns all areas if null)
export function getAreasForRegion(region: string | null | undefined): string[]
```

## Modified: `getTodayOnSalePosts` signature (`apps/web/lib/posts.ts`)

```ts
// Before
getTodayOnSalePosts(area?: string): Promise<OripaPostSummary[]>

// After
getTodayOnSalePosts(area?: string, regionAreas?: string[]): Promise<OripaPostSummary[]>
```

- `area` set, `regionAreas` ignored → query single area (existing)
- `area` unset, `regionAreas` set → query only those areas
- Both unset → query all AREAS (existing default)

## URL parameter additions

| Parameter | Values | Semantics |
|-----------|--------|-----------|
| `region` | `kanto` \| `kansai` | Filters tier-2 area tabs; absent = 全国 |
| `area` | existing values | Unchanged; filters card listing to single area |

Existing `?area=`, `?sort=`, `?filter=`, `?page=` params are fully preserved.
