# Contract: Oripa List Page URL Interface

**Route**: `/oripa`  
**Type**: Next.js Server-Rendered Page  
**Last updated**: 2026-04-29

## Search Parameters (unchanged)

| Parameter | Type | Values | Default | Effect |
|---|---|---|---|---|
| `area` | `string` | `akihabara`, `kawagoe`, `omiya`, `urawamisono` | (none — all areas) | Filters cards to the specified area |
| `page` | `string` (numeric) | `1`–`3` | `1` | Selects the current pagination page (20 items per page, max 3 pages) |

## Preserved Behaviors

- Removing `area` from the URL shows all areas (すべて tab active)
- Invalid `page` values are clamped to `[1, MAX_PAGES]`
- Invalid `area` values are ignored (fallback: all areas)

## No Breaking Changes

This redesign does not change the URL contract, route path, or search parameter schema. All existing bookmarks and links to `/oripa?area=akihabara&page=2` continue to work identically.
