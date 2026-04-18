# Quickstart: Responsive Layout

**Feature**: 009-responsive-layout

## What This Changes

Two files only:
1. `apps/web/app/page.tsx` — swap layout-affecting inline styles to CSS Module class names
2. `apps/web/app/page.module.css` (new) — CSS with `@media` breakpoint at 640px

## Files Changed

```text
apps/web/app/
├── page.tsx          (modified — className replaces layout inline styles)
└── page.module.css   (new — responsive layout CSS)
```

## Local Dev

```bash
pnpm --filter @oripa-now/web dev
# Open http://localhost:3000
# Use browser DevTools → Toggle Device Toolbar → select iPhone (375px) to verify
```

## Verify Before Deploy

Per project policy, verify with Playwright before deploying:
- Take screenshot at 375px viewport — confirm no sidebar overlap
- Take screenshot at 1280px viewport — confirm two-column layout intact
- Confirm area filter buttons wrap on narrow viewport

## Build Check

```bash
pnpm build
pnpm typecheck
pnpm lint
```
