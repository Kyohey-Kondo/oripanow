# Tasks: Responsive Layout

**Input**: Design documents from `/specs/009-responsive-layout/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story. Since this is a CSS-only change across 2 files, phases are kept lean and each user story maps to a concrete set of CSS rules + JSX prop changes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Create the CSS Module file and wire the import into the page component.

- [x] T001 Create `apps/web/app/page.module.css` with empty class stubs for `.main`, `.contentLayout`, `.tableColumn`, `.tweetSidebar`, `.tweetList`
- [x] T00X Add `import styles from './page.module.css'` at the top of `apps/web/app/page.tsx`

**Checkpoint**: App still builds and renders identically (classes exist but have no rules yet — inline styles still in place)

---

## Phase 2: User Story 1 — Mobile Users Can Read the Store Table (Priority: P1) 🎯 MVP

**Goal**: Remove the overlap between the tweet sidebar and the store table on narrow viewports by switching the flex layout to a column stack at ≤640px and enabling horizontal scroll on the table.

**Independent Test**: Open `http://localhost:3000` in DevTools at 375px width. Confirm the store table is fully visible with no element overlapping it from the sidebar.

### Implementation

- [x] T00X [US1] In `apps/web/app/page.module.css`, implement `.main` (maxWidth: 1400px, margin: 0 auto, padding: 24px 32px) and `.contentLayout` (display: flex, gap: 24px, align-items: flex-start) with their desktop defaults
- [x] T00X [US1] In `apps/web/app/page.module.css`, add `@media (max-width: 640px)` block: set `.main` padding to 16px and `.contentLayout` flex-direction to column with gap: 16px
- [x] T00X [US1] In `apps/web/app/page.module.css`, implement `.tableColumn` (flex: 1 1 0, min-width: 0, overflow-x: auto)
- [x] T00X [US1] In `apps/web/app/page.tsx`, replace the `<main>` inline `style` prop with `className={styles.main}`
- [x] T00X [US1] In `apps/web/app/page.tsx`, replace the flex wrapper `<div>` inline `style` prop (display/gap/alignItems) with `className={styles.contentLayout}`
- [x] T00X [US1] In `apps/web/app/page.tsx`, replace the table wrapper `<div>` inline `style` prop (flex/minWidth) with `className={styles.tableColumn}`

**Checkpoint**: At 375px viewport, the store table is readable with no sidebar overlap. Horizontal scroll works if the table overflows. At 1280px, the layout is unchanged.

---

## Phase 3: User Story 2 — Tweet Previews Accessible on Mobile (Priority: P2)

**Goal**: On mobile, the tweet sidebar stacks below the table in full width, fitting within the screen without horizontal overflow.

**Independent Test**: Open `http://localhost:3000` in DevTools at 375px width. Scroll past the store table and confirm tweet preview cards are visible and fit within the viewport width.

### Implementation

- [x] T00X [US2] In `apps/web/app/page.module.css`, implement `.tweetSidebar` (width: 285px, flex-shrink: 0) and `.tweetList` (display: flex, flex-direction: column, gap: 8px)
- [x] T01X [US2] In `apps/web/app/page.module.css`, inside the `@media (max-width: 640px)` block, set `.tweetSidebar` width to 100%
- [x] T01X [US2] In `apps/web/app/page.tsx`, replace the `<aside>` inline `style` prop (width/flexShrink) with `className={styles.tweetSidebar}`
- [x] T01X [US2] In `apps/web/app/page.tsx`, replace the inner tweet `<div>` inline `style` prop (display/flexDirection/gap) with `className={styles.tweetList}`

**Checkpoint**: On mobile, tweet cards appear below the table as a full-width column. No horizontal overflow on the tweet cards.

---

## Phase 4: User Story 3 — Desktop Layout Preserved (Priority: P3)

**Goal**: Verify that the existing two-column desktop layout is pixel-identical to the pre-migration appearance. No visual regression.

**Independent Test**: Open `http://localhost:3000` at 1280px viewport width and compare to the current layout visually (or against a baseline screenshot).

### Implementation

- [x] T01X [US3] Review `apps/web/app/page.module.css` to confirm all desktop default values exactly match the original inline styles that were removed from `apps/web/app/page.tsx`
- [x] T01X [US3] Run `pnpm typecheck` and `pnpm lint` from the repo root to confirm no TypeScript or lint errors introduced

**Checkpoint**: Desktop layout visually identical to before. TypeScript and lint clean.

---

## Phase 5: Polish & Verification

**Purpose**: Playwright visual verification (required by project policy before deploy) and build validation.

- [x] T01X Start the dev server (`pnpm --filter @oripa-now/web dev`) and take a Playwright screenshot at 375px viewport width to confirm no sidebar overlap (per project policy)
- [x] T01X [P] Take a Playwright screenshot at 1280px viewport width to confirm the two-column desktop layout is intact
- [x] T01X [P] Take a Playwright screenshot at 375px focusing on the area filter nav to confirm buttons wrap without overflow
- [x] T01X Run `pnpm build` from repo root and confirm the production build succeeds

**Checkpoint**: All Playwright screenshots confirm correct layout. Build passes.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (US1)**: Depends on Phase 1 complete (import must exist before using `styles.*`)
- **Phase 3 (US2)**: Depends on Phase 2 complete (sidebar CSS shares the same media query block)
- **Phase 4 (US3)**: Depends on Phase 3 complete (verifies final state of both files)
- **Phase 5 (Polish)**: Depends on Phase 4 complete

### Within Each Phase

- T003–T005 (CSS rules) can be written before T006–T008 (JSX changes) — different concerns
- T009–T010 (CSS) before T011–T012 (JSX) within US2

### Parallel Opportunities

- T015, T016, T017 (Playwright screenshots) can run in parallel once the dev server is up

---

## Parallel Example: Polish Phase

```
# After dev server is running, launch all screenshot tasks together:
Task: "Screenshot at 375px — no sidebar overlap"
Task: "Screenshot at 1280px — two-column desktop intact"
Task: "Screenshot at 375px — area filter nav wrapping"
```

---

## Implementation Strategy

### MVP (User Stories 1 only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: US1 (T003–T008)
3. **STOP and VALIDATE**: Check 375px viewport — sidebar no longer overlaps table
4. This alone fixes the reported bug

### Full Delivery

1. Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
2. Each phase is an independently verifiable improvement
3. Total estimated file changes: 2 files, ~30 lines of CSS, ~5 JSX attribute changes

---

## Notes

- [P] tasks = different files or independent verification steps
- The entire implementation is CSS + JSX attribute changes — no data layer, no API, no infrastructure
- Inline styles for colors, button styles, table cell padding, and `zoom` remain unchanged
- All Playwright verification is required per project policy before deploying
