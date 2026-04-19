# Implementation Plan: Shop Detail Page Google Map

**Branch**: `014-shop-google-map` | **Date**: 2026-04-19 | **Spec**: [spec.md](./spec.md)

## Summary

Add a Google Maps embed above the oripa post table on the shop detail page. The map is searched by store name + area label (e.g., "Duel Stade Ganryu 秋葉原") using an API-key-free iframe embed. Requires adding `area` to the `getShopPosts` return value.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 22 LTS  
**Primary Dependencies**: Next.js 15 (App Router, `force-dynamic`), `@aws-sdk/lib-dynamodb`  
**Storage**: DynamoDB — `stores` table (read only, no schema change)  
**Testing**: Existing test suite in `apps/web/lib/__tests__/posts.test.ts`  
**Target Platform**: Web (SSR)  
**Performance Goals**: Map iframe loads client-side independently; must not delay table render  
**Constraints**: No Google Maps API key — use public embed URL  
**Scale/Scope**: 2 files changed

## Constitution Check

Constitution not configured for this project — no gates to enforce.

## Project Structure

### Documentation (this feature)

```text
specs/014-shop-google-map/
├── plan.md              ← this file
├── spec.md
├── research.md
├── data-model.md
├── quickstart.md
└── checklists/requirements.md
```

### Source Code

```text
apps/web/
├── lib/
│   └── posts.ts                            ← add `area` to getShopPosts return
└── app/oripa/shops/[storeId]/
    └── page.tsx                            ← add Google Map iframe above table
```

## Implementation Steps

### Step 1 — Extend `getShopPosts` to return `area`

**File**: `apps/web/lib/posts.ts`

1. Add `area` to the `ProjectionExpression` in the `GetCommand` for the store:
   ```
   ProjectionExpression: "storeId, #n, twitterUsername, area"
   ```
2. Extract `area` from the store result:
   ```ts
   const area = store?.area ?? "";
   ```
3. Add `area` to the return type and returned object:
   ```ts
   ): Promise<{ summaries: OripaPostSummary[]; storeName: string; twitterUsername: string; area: string }>
   ```

### Step 2 — Add Google Map iframe to shop page

**File**: `apps/web/app/oripa/shops/[storeId]/page.tsx`

1. Add area-to-label mapping:
   ```ts
   const AREA_LABELS: Record<string, string> = {
     akihabara: '秋葉原',
     omiya: '大宮',
     kawagoe: '川越',
     urawamisono: '浦和美園',
     tokyo: '東京',
   };
   ```

2. Destructure `area` from `getShopPosts`:
   ```ts
   const { summaries, storeName, twitterUsername, area } = await getShopPosts(storeId);
   ```

3. Build map embed URL:
   ```ts
   const areaLabel = AREA_LABELS[area] ?? area;
   const mapQuery = encodeURIComponent(`${storeName} ${areaLabel}`);
   const mapUrl = `https://maps.google.com/maps?q=${mapQuery}&output=embed&hl=ja`;
   ```

4. Render iframe above the `tableColumn` div (inside `contentLayout`, before the table):
   ```tsx
   {storeName && (
     <div style={{ marginBottom: '16px' }}>
       <iframe
         src={mapUrl}
         width="100%"
         height="300"
         style={{ border: 0, borderRadius: '8px' }}
         loading="lazy"
         allowFullScreen
         referrerPolicy="no-referrer-when-downgrade"
       />
     </div>
   )}
   ```

### Step 3 — Verify with Playwright

Per CLAUDE.md: always verify UI changes with Playwright before deploying.

1. Take screenshot of shop detail page
2. Confirm map is visible above the table
3. Confirm table is still visible below the map

## Complexity Tracking

No constitution violations.
