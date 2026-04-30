# Quickstart: Oripa Card UI Redesign

**Feature**: 017-card-ui-redesign  
**Date**: 2026-04-29

## What changes

| File | Action | Notes |
|---|---|---|
| `apps/web/app/oripa/page.tsx` | **Rewrite** | Replace table layout with dark-themed card grid |
| `apps/web/app/oripa/oripa.module.css` | **Create** | New CSS Module — dark theme, card grid, tabs, pagination |
| `apps/web/app/oripa/components/OripaCard.tsx` | **Create** | Extracted card component |
| `apps/web/app/layout.tsx` | **Edit** | Add Orbitron + Noto Sans JP via `next/font/google`; apply font variables to body |
| `apps/web/app/page.module.css` | **No change** | Still used by shop detail page |

## Local dev workflow

```bash
# Start the dev server (from repo root)
pnpm --filter @oripa-now/web dev
# Open http://localhost:3000/oripa
```

The page uses `force-dynamic` (SSR), so every visit hits DynamoDB. In local dev without AWS credentials, `getTodayOnSalePosts` returns `[]` and the empty state renders.

## Design reference

The authoritative visual reference is:
```
oripa-card-ui.html   (project root)
```

Open it in a browser to compare against the running dev server.

## Key implementation notes

### Price tier helper

Add a small pure function in `OripaCard.tsx` (or a shared util):

```ts
type PriceTier = 'high' | 'mid' | 'low' | 'unknown';

function getPriceTier(price?: number): PriceTier {
  if (price === undefined) return 'unknown';
  if (price >= 10000) return 'high';
  if (price >= 5000) return 'mid';
  return 'low';
}
```

### CSS custom properties scope

Define the dark palette as CSS variables inside the `.page` class in `oripa.module.css`:

```css
.page {
  --bg: #0a0c14;
  --surface: #111520;
  --accent: #f5c842;
  --accent2: #e0516b;
  --accent3: #4fc3f7;
  --text: #e8eaf0;
  --text-muted: #6b7280;
  --border: rgba(255,255,255,0.07);
}
```

Cards can then use `var(--accent)` etc. because they are descendants of `.page`.

### Tier color mapping

Map `PriceTier` to a CSS class or inline style for the colored top bar:

| Tier | Color |
|---|---|
| `high` / `unknown` | `var(--accent)` (#f5c842, gold) |
| `mid` | `var(--accent3)` (#4fc3f7, blue) |
| `low` | `#a3e635` (green) |

### Tweet timestamp

The `tweetIdToDate` helper already exists in both page files. Extract it to a shared utility at `apps/web/lib/tweet-utils.ts` and import from both pages.

## Verification checklist

After implementation, verify with Playwright screenshots at:
- Desktop (1280×900): card grid shows 3 columns, header/live badge visible
- Mobile (375×812): single-column cards, area tabs scroll horizontally
- With awards data: ラスト + あたり badge rows appear
- Without awards data: "当たり・ラストワン情報なし" placeholder appears
- Area tab click → correct filter applied (check URL + visible area tags)
