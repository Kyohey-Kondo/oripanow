# Research: Top Page Pagination

## Decision 1: Pagination mechanism — URL query parameter vs client-side state

**Decision**: URL query parameter `?page=N` (server-side, existing `searchParams` prop pattern)
**Rationale**: The top page is already a Next.js Server Component that reads `searchParams` (`?area=`). Adding `page` follows the same pattern — no new state management, works with direct links and browser back/forward, and is consistent with FR-003.
**Alternatives considered**: Client-side state (useState) — would lose page on refresh; cursor-based pagination — overkill for 3 pages of static data.

## Decision 2: Data fetching strategy — fetch 60 then slice vs fetch per page

**Decision**: Fetch up to 60 items server-side (extend `MAX_RESULTS` from 50 → 60), then slice the array for the requested page in `apps/web/app/page.tsx`.
**Rationale**: The current `getTodayOnSalePosts` already fetches and deduplicates all results. Extending to 60 items and slicing `[(page-1)*20 : page*20]` in the page component is the minimal change. No new DynamoDB queries needed.
**Alternatives considered**: Fetch only the 20 items per page from DynamoDB — requires cursor/offset logic in DynamoDB (not natively supported with GSI queries), complex for minimal gain at this scale.

## Decision 3: Page validation — invalid `?page` values

**Decision**: Clamp to range 1–3. Non-numeric, < 1, or > 3 → treat as 1.
**Rationale**: FR-007 specifies graceful fallback. Clamping avoids empty pages and errors.

## Decision 4: Area filter + page interaction

**Decision**: Navigation links preserve `?area=` when building `?page=N` URLs. Changing area filter resets page to 1 (area links already link to `/?area=X` without a page param).
**Rationale**: FR-008/FR-009. Area nav links in `page.tsx` already omit `page`, so changing area naturally resets to page 1.

## Decision 5: oEmbed sidebar — per-page or full set

**Decision**: oEmbed top-3 derives from the full 60-item set (before page slicing), not just the current page's 20 items.
**Rationale**: Spec assumption: "tweet preview sidebar continues to show top 3 tweets from the full result set". Avoids sidebar jumping on page navigation.
