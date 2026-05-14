# Tasks: Region Filter Tabs

**Input**: Design documents from `/specs/020-region-filter-tabs/`  
**Branch**: `020-region-filter-tabs`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- No test tasks — Playwright verification in final phase per project guidelines

---

## Phase 1: Foundational (Blocking Prerequisite)

**Purpose**: Region config that ALL user stories depend on. Must be complete before any page changes.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T001 Create `apps/web/lib/regions.ts` with `REGIONS` array (key, label, areas[]), `getRegionForArea()`, and `getAreasForRegion()` helpers

**Checkpoint**: `regions.ts` exported and type-checked → user story phases can begin

---

## Phase 2: User Story 1 — Filter by Region (Priority: P1) 🎯 MVP

**Goal**: Clicking 関東 or 関西 in tier-1 narrows the tier-2 area tabs and queries only that region's posts.

**Independent Test**: Navigate to `/oripa?region=kanto` → only 秋葉原・池袋・新宿・川越・大宮 tabs visible; card list shows Kanto posts only. Navigate to `/oripa?region=kansai` → only なんば・梅田 tabs visible.

- [ ] T002 [P] [US1] Extend `getTodayOnSalePosts` in `apps/web/lib/posts.ts` to accept optional `regionAreas?: string[]` second param; when set and no `area`, query only those areas
- [ ] T003 [P] [US1] Add `.regionTabs` CSS class to `apps/web/app/oripa/oripa.module.css` (visually distinct from `.areaTabs` — e.g., bolder font or different background, same horizontal scroll behavior)
- [ ] T004 [US1] Add `region` to `searchParams` type in `apps/web/app/oripa/page.tsx`; resolve visible area tab set via `getAreasForRegion(region)` and filter `AREA_LABELS_MAP` to that set
- [ ] T005 [US1] Render tier-1 region `<nav className={styles.regionTabs}>` above existing area tabs in `apps/web/app/oripa/page.tsx` — links: `/oripa` (全国), `/oripa?region=kanto` (関東), `/oripa?region=kansai` (関西); active state when region param matches
- [ ] T006 [US1] Pass `regionAreas` to `getTodayOnSalePosts` in `apps/web/app/oripa/page.tsx` when region is set but no area is selected

**Checkpoint**: US1 fully testable — region tabs visible, tier-2 filtered, cards scoped to region

---

## Phase 3: User Story 2 — View All Regions / 全国 (Priority: P2)

**Goal**: 全国 tab shows all 7 area tabs and all cards — preserves existing default behavior.

**Independent Test**: Navigate to `/oripa` (no params) → all 7 area tabs visible, full card list. Click 全国 tab when on a region page → same result.

- [ ] T007 [US2] Verify and enforce that the 全国 tab link (`/oripa`) clears both `region` and `area` params in `apps/web/app/oripa/page.tsx`; ensure `getAreasForRegion(undefined)` returns all AREAS and `getTodayOnSalePosts` called with no params in this state

**Checkpoint**: US1 + US2 both work; 全国 is default; existing `?area=` links untouched

---

## Phase 4: User Story 3 — Deep-link to Region + Area (Priority: P3)

**Goal**: URLs containing `?region=kanto&area=akihabara` restore full UI state on load.

**Independent Test**: Open `/oripa?region=kanto&area=akihabara` → 関東 active in tier-1, 秋葉原 active in tier-2, Akihabara cards shown.

- [ ] T008 [US3] Update `pageUrl()` helper in `apps/web/app/oripa/page.tsx` to include `region` param in pagination and sort/filter links so region context is preserved across page navigation
- [ ] T009 [US3] Update `generateMetadata` in `apps/web/app/oripa/page.tsx` to handle `?region=` param — set canonical URL including region, update `<title>` (e.g., "関東のオリパ情報") when region set but no area

**Checkpoint**: All 3 user stories functional; URLs fully shareable and bookmarkable

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T010 [P] Playwright verification — screenshot at 390px and 1280px for: `/oripa`, `/oripa?region=kanto`, `/oripa?region=kansai`, `/oripa?region=kanto&area=akihabara`; confirm no layout overflow and correct active tab states
- [ ] T011 Update `CLAUDE.md` Area Rules section to document region groupings (関東: akihabara/ikebukuro/shinjuku/kawagoe/omiya, 関西: namba/umeda) and that `regions.ts` must be updated when new areas are added

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately
- **US1 (Phase 2)**: Depends on T001 — then T002, T003 can run in parallel; T004 after T001; T005, T006 after T004
- **US2 (Phase 3)**: Depends on US1 completion (T007 is a verification/enforcement task)
- **US3 (Phase 4)**: Depends on US1 completion; T008 and T009 independent of each other [P]
- **Polish (Phase 5)**: Depends on all desired stories complete

### Parallel Opportunities

```bash
# After T001 completes, these can run together:
Task T002: "Extend getTodayOnSalePosts in apps/web/lib/posts.ts"
Task T003: "Add .regionTabs CSS in apps/web/app/oripa/oripa.module.css"

# After US1 completes, these can run together:
Task T008: "Update pageUrl() in page.tsx"
Task T009: "Update generateMetadata in page.tsx"
```

---

## Implementation Strategy

### MVP (User Story 1 only — 5 tasks)

1. T001 — Create `regions.ts`
2. T002 + T003 in parallel — extend posts.ts, add CSS
3. T004 → T005 → T006 — wire up page.tsx
4. **Validate**: manual browser check at `/oripa?region=kanto` and `/oripa?region=kansai`
5. Deploy if validated ✅

### Full Delivery (all stories — 11 tasks)

Complete MVP → T007 (US2 verification) → T008 + T009 in parallel (US3) → T010 + T011 (polish)

---

## Notes

- No new DynamoDB queries, Lambda changes, or CDK changes required
- `regions.ts` is the single source of truth for region→area mapping — update it when new areas/regions are added
- Existing `?area=` URLs must keep working without redirect (backward-compat)
- Run `pnpm typecheck` after each phase
