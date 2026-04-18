# Implementation Plan: Responsive Layout

**Branch**: `009-responsive-layout` | **Date**: 2026-04-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-responsive-layout/spec.md`

## Summary

Add responsive CSS to the top page so that the tweet sidebar no longer overlaps the store data table on mobile viewports. At ≤640px the layout switches to a single-column stack (table above, tweets below); at 641px+ the existing two-column layout is preserved. Implementation uses CSS Modules — zero new dependencies, built into Next.js 15.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 22 LTS
**Primary Dependencies**: Next.js 15 (App Router) — CSS Modules built-in, no new packages needed
**Storage**: N/A (no data layer changes)
**Testing**: Playwright (visual verification per project policy); `pnpm typecheck`, `pnpm lint`
**Target Platform**: Web (mobile-first responsive)
**Project Type**: Web application (Next.js 15 SSR)
**Performance Goals**: No performance impact — CSS-only change
**Constraints**: No new npm dependencies; desktop layout must not regress
**Scale/Scope**: 2 files changed (page.tsx + new page.module.css)

## Constitution Check

Constitution template is not yet filled in for this project. No violations detected — this is a minimal, scoped CSS-only change with no architectural implications.

## Project Structure

### Documentation (this feature)

```text
specs/009-responsive-layout/
├── plan.md           # This file
├── research.md       # Phase 0 — styling approach, breakpoint, decisions
├── data-model.md     # Phase 1 — no data changes; layout structure documented
├── quickstart.md     # Phase 1 — local dev & verify steps
└── tasks.md          # Phase 2 output (created by /speckit.tasks)
```

### Source Code

```text
apps/web/app/
├── page.tsx          (modified — layout inline styles → className)
└── page.module.css   (new — responsive layout rules with @media breakpoint)
```

No other files are changed.

## Implementation Design

### CSS Module: `apps/web/app/page.module.css`

```css
/* Main page container */
.main {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px 32px;
}

/* Two-column flex layout */
.contentLayout {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

/* Table column — allows horizontal scroll on narrow viewports */
.tableColumn {
  flex: 1 1 0;
  min-width: 0;
  overflow-x: auto;
}

/* Tweet sidebar */
.tweetSidebar {
  width: 285px;
  flex-shrink: 0;
}

.tweetList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Mobile: single-column stacked layout */
@media (max-width: 640px) {
  .main {
    padding: 16px;
  }

  .contentLayout {
    flex-direction: column;
    gap: 16px;
  }

  .tweetSidebar {
    width: 100%;
  }
}
```

### `apps/web/app/page.tsx` changes

Replace layout-affecting inline styles with `styles.*` class names from the CSS module. Non-layout inline styles (colors, button styles, table cell padding, `zoom`) are unchanged.

| Element | Before (inline) | After (className) |
|---|---|---|
| `<main>` | `style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 32px' }}` | `className={styles.main}` |
| Flex wrapper `<div>` | `style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}` | `className={styles.contentLayout}` |
| Table wrapper `<div>` | `style={{ flex: '1 1 0', minWidth: 0 }}` | `className={styles.tableColumn}` |
| `<aside>` | `style={{ width: '285px', flexShrink: 0 }}` | `className={styles.tweetSidebar}` |
| Inner `<div>` in aside | `style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}` | `className={styles.tweetList}` |

**Import to add at top of page.tsx**:
```ts
import styles from './page.module.css';
```

## Complexity Tracking

No constitution violations. No complexity justification needed.
