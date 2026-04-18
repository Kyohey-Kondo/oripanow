# Research: Responsive Layout

**Feature**: 009-responsive-layout
**Date**: 2026-04-18

## Decision 1: Styling Mechanism

**Decision**: CSS Modules (`page.module.css` + `layout.module.css` as needed)

**Rationale**:
- The project currently uses only inline styles — no Tailwind, no CSS preprocessor, no global CSS
- Inline styles cannot express `@media` queries, which are required for responsive breakpoints
- CSS Modules are built into Next.js 15 with zero additional dependencies or configuration
- They are the idiomatic styling approach for Next.js App Router
- Scoped class names prevent unintended style leakage

**Alternatives considered**:
- **Tailwind CSS**: Would require installing tailwindcss + postcss + autoprefixer and adding `tailwind.config.ts`. Disproportionate setup cost for a single layout feature.
- **`globals.css` + global class names**: Simpler setup than Tailwind but pollutes global scope. Fine for small projects; CSS Modules preferred for scalability.
- **Styled JSX** (`<style jsx>`): Available in Next.js but less common, harder to extract and maintain.
- **`<style>` tag in `<head>`**: Anti-pattern in React, bypasses Next.js optimization pipeline.

## Decision 2: Breakpoint

**Decision**: 640px as the mobile/desktop breakpoint

**Rationale**:
- At 375px (iPhone SE) and 390px (iPhone 14) the current sidebar at 285px leaves only ~75-105px for the table — unusable
- At 640px and below, a single-column layout gives the table full width
- 641px+ (tablet, desktop) keeps the two-column layout — at 768px (iPad mini portrait) the sidebar+table fits comfortably
- This aligns with the Tailwind `sm` breakpoint — a widely understood standard

**Alternatives considered**:
- **768px breakpoint**: Would treat iPad portrait as mobile. The current sidebar width (285px) is manageable on a 768px canvas, so 640px is the more conservative and correct choice.
- **Per-component breakpoints**: Unnecessary complexity for this feature.

## Decision 3: Mobile Table Handling

**Decision**: Horizontal scroll on the table wrapper (`overflow-x: auto`)

**Rationale**:
- The table has 6 columns (Store, Date, TweetedAt, Price, Stock, Tweet link). Hiding columns risks losing information.
- `overflow-x: auto` on the wrapping `<div>` gives users access to all data via scroll — a standard mobile pattern for data tables.
- Zero JS required, minimal CSS change.

**Alternatives considered**:
- **Hide non-critical columns on mobile** (e.g., hide TweetedAt, show only Store, Date, Price): Reduces information. Could be a follow-up enhancement (out of scope for this feature).
- **Card layout on mobile**: Replace table rows with cards. Significant markup change, out of scope.

## Decision 4: Tweet Sidebar Mobile Behavior

**Decision**: Stack below table vertically, full-width, single column

**Rationale**:
- Keeps all existing content visible — no information loss
- No JS required — pure CSS flex-direction change
- Tweet oEmbed cards are already self-contained and render well at full width (the current `zoom: 0.75` can be removed or adjusted on mobile)

**Alternatives considered**:
- **Hide tweets on mobile**: Simpler CSS but loses content. Rejected per spec (P2 story).
- **Accordion / collapsible**: Requires JS event handling. Out of scope.

## Decision 5: Scope of Style Migration

**Decision**: Migrate only layout-affecting styles to CSS Module. Keep non-layout inline styles (colors, padding, typography, button styles) as inline styles.

**Rationale**:
- Minimizes diff size and review surface
- Non-layout styles don't need `@media` queries so inline styles work fine
- Avoids rewriting working, tested code unnecessarily

**What moves to CSS Module**:
- `<main>` container (maxWidth, margin, padding — to add responsive padding)
- The flex wrapper `<div>` (display, gap, alignItems — to add media query for column switch)
- The table wrapper `<div>` (flex, minWidth — to add overflow-x: auto on mobile)
- The `<aside>` (width, flexShrink — to reset width to 100% on mobile)

**What stays inline**:
- Button styles (activeBtn, inactiveBtn) — already have `flexWrap: 'wrap'` via nav style
- Table cell padding
- Table header styles
- Colors, typography
