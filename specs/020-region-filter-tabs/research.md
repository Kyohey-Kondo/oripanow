# Research: Region Filter Tabs

## Existing Code Analysis

### Current area tab implementation (`apps/web/app/oripa/page.tsx`)
- `AREA_LABELS_MAP` defines 7 areas in display order: akihabara, ikebukuro, shinjuku, namba, umeda, kawagoe, omiya
- Area tabs rendered as `<nav>` with `<a>` links using `?area=<key>` query param
- `getTodayOnSalePosts(area?)` in `apps/web/lib/posts.ts`:
  - If `area` provided → queries that single area
  - If no `area` → queries all `AREAS` in parallel via GSI1

### Query parameter state
- Current: `?area=`, `?page=`, `?sort=`, `?filter=`
- New: add `?region=` (e.g., `kanto`, `kansai`)

### `getTodayOnSalePosts` extension point
```ts
const areasToQuery = area && AREAS.includes(area)
  ? [area]
  : AREAS;  // ← extend to accept a filtered subset for region
```
Adding an optional `regionAreas` parameter allows querying only a region's areas without changing the existing API.

---

## Decisions

### D-001: Region data location
- **Decision**: New file `apps/web/lib/regions.ts` exports `REGIONS` constant and helper `getRegionForArea()`
- **Rationale**: Keeps region logic isolated and reusable across page.tsx and future pages. Avoids bloating page.tsx further.
- **Alternatives considered**: Inline in page.tsx — rejected because the same mapping is needed in `posts.ts` for query filtering

### D-002: URL parameter for region
- **Decision**: `?region=kanto` | `?region=kansai` | absent = 全国
- **Rationale**: Matches pattern of existing `?area=` param; shareable, bookmarkable. No new router primitives needed.
- **Alternatives considered**: Client-side-only state (useState) — rejected per FR-004 (URL must reflect state)

### D-003: `getTodayOnSalePosts` extension
- **Decision**: Add optional second param `regionAreas?: string[]`. When provided and no `area`, queries only those areas.
- **Rationale**: Minimal diff to existing function; no breaking change. Existing callers unaffected.
- **Alternatives considered**: Separate function — unnecessary duplication.

### D-004: Two-tier tab UI structure
- **Decision**: Tier-1 (region) rendered first, Tier-2 (area) below it, both as `<nav>` elements in `page.tsx`. No new Client Component needed — region is a Server Component concern (from searchParams).
- **Rationale**: Keeps SSR intact; no hydration overhead. Region determines which area tabs to show — pure render-time decision.
- **Alternatives considered**: Client Component with useState — rejected; SSR sufficient and simpler.

### D-005: "全国" behavior
- **Decision**: When region is absent (全国), tier-2 shows all area tabs and queries all areas — identical to current behavior.
- **Rationale**: Zero regression risk; 全国 is the default landing state.

### D-006: Region + area URL combination
- **Decision**: `?region=kanto&area=akihabara` — both params coexist. If `area` is set, it takes precedence for the DynamoDB query. Region param controls which tier-2 tabs are visible.
- **Rationale**: Backward compatible. Existing `?area=` links keep working.
