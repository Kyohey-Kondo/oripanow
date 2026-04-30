# Research: Oripa Card UI Redesign

**Feature**: 017-card-ui-redesign  
**Date**: 2026-04-29

---

## Decision 1: Font Loading Strategy

**Decision**: Use `next/font/google` to load Orbitron (for prices/logo) and Noto Sans JP (for body text) at build time.

**Rationale**: `next/font/google` fetches and self-hosts fonts at build time, eliminating render-blocking requests and layout shift. The current layout uses a generic `sans-serif` stack; upgrading to Noto Sans JP is a drop-in improvement. Orbitron is used only for the price and logo elements (matching the mockup).

**Alternatives considered**:
- Direct Google Fonts `<link>` tag in `<head>` — rejected because it makes a runtime request to Google's CDN (GDPR concern, extra round-trip, layout shift on first load).
- Zen Kaku Gothic New (used in the mockup HTML) — available via `next/font/google`, but Noto Sans JP is already the de facto standard for Japanese body text and avoids the wider bold weights that Zen Kaku Gothic New is notable for. Either works; Noto Sans JP chosen for broader character coverage.

---

## Decision 2: Styling Approach

**Decision**: CSS Modules (`.module.css`) — the approach already used in the project.

**Rationale**: The existing codebase uses `page.module.css` and inline styles. Introducing CSS Modules for the new card layout maintains consistency with no additional tooling changes. Global CSS variables (defined in a new `:root` block inside the module or via a shared global CSS) will carry the dark-theme color palette.

**Alternatives considered**:
- Tailwind CSS — not installed; adding it is out of scope.
- Inline styles — already used heavily in the current page; migrating away is the goal.
- CSS-in-JS (styled-components, Emotion) — not in the project; unnecessary dependency.

---

## Decision 3: Price Tier Classification

**Decision**: Three tiers based on price value in JPY:
- `high`: price ≥ 10,000 → gold top bar (`#f5c842`)
- `mid`: price ≥ 5,000 && price < 10,000 → blue top bar (`#4fc3f7`)
- `low`: price < 5,000 → green top bar (`#a3e635`)
- `unknown`: no price data → default to gold

**Rationale**: These thresholds match the mockup's sample data (¥10k+→gold, ¥15k→blue, ¥3k–5k→green) and reflect practical oripa pricing conventions in the Japanese trading card market.

**Alternatives considered**:
- Relative thresholds (quartiles of current data) — rejected as thresholds would change daily, causing inconsistent color coding.
- Two tiers (expensive / cheap) — less informative; three-tier matches the mockup.

---

## Decision 4: Component Structure

**Decision**: Extract a standalone `OripaCard` React Server Component in `apps/web/app/oripa/components/OripaCard.tsx`. The page itself remains a Server Component and renders the card grid directly.

**Rationale**: A single card component keeps the page readable and makes each card independently testable. No state or interactivity is needed on the card itself (links are plain `<a>` tags), so a Server Component is appropriate.

**Alternatives considered**:
- Inline all card markup in `page.tsx` — readable for 1–2 cards but unwieldy at 10+ cards.
- Client Component for cards — not needed; no browser-only APIs or event handlers required.

---

## Decision 5: Dark Theme Scope

**Decision**: Apply the dark theme only within `apps/web/app/oripa/page.tsx` using a full-width wrapper `<div>` with an explicit dark background. Do **not** add a route-level `layout.tsx` under `/oripa` at this stage.

**Rationale**: The shop detail page (`/oripa/shops/[storeId]`) is not in scope for this redesign. Adding a route layout would force the dark background onto the shop detail page's white table, creating a broken look. A page-level wrapper avoids polluting the shared layout.

**Alternatives considered**:
- Route-level `layout.tsx` at `/oripa/` — cleaner architecture but requires simultaneously redesigning the shop detail page, which is out of scope.
- Global `layout.tsx` change — would affect all pages including home page and privacy policy.

---

## Decision 6: Tweet Sidebar Placement

**Decision**: Retain the tweet oEmbed sidebar. On desktop (≥ 768px) it appears to the right of the card grid (same as today). On mobile it moves above the grid as a horizontally scrollable strip (same behavior as current CSS).

**Rationale**: The sidebar is valuable supplementary content and is already handled by the existing CSS module. The new `oripa.module.css` will replicate the `.tweetSidebar` / `.tweetList` behavior from `page.module.css`, adapted for the dark theme.

---

## Decision 7: CSS Custom Properties

**Decision**: Define color palette as CSS custom properties (`--bg`, `--surface`, `--accent`, etc.) inside the `.page` wrapper selector in `oripa.module.css`, scoped to avoid leaking into the global stylesheet.

**Rationale**: Using CSS variables allows the card component to reference `var(--accent)` etc. without needing to import the palette from a separate file. Since all variables are scoped to the `.page` wrapper, they cannot conflict with any other component.
