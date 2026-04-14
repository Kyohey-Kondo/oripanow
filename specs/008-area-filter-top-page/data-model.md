# Data Model: Area Filter on Top Page

## No DynamoDB Schema Changes

This feature is entirely in the application layer. No table, GSI, or CDK changes.

---

## New Constant: `AREA_LABELS` (`apps/web/app/page.tsx`)

```ts
const AREA_LABELS: Record<string, string> = {
  akihabara:    '秋葉原',
  kawagoe:      '川越',
  omiya:        '大宮',
  urawamisono:  '浦和美園',
};
```

Used to render button labels and validate the `?area` query param.

---

## Updated Function: `getTodayOnSalePosts` (`apps/web/lib/posts.ts`)

### Before

```ts
async function getTodayOnSalePosts(): Promise<OripaPostSummary[]>
```

### After

```ts
async function getTodayOnSalePosts(area?: string): Promise<OripaPostSummary[]>
```

When `area` is provided and matches a known area, query only that area.  
When `area` is absent or unrecognised, query all areas (existing behaviour).

**Internal change**:
```ts
// Before
const areasToQuery = AREAS; // always all

// After
const areasToQuery = area && AREAS.includes(area as typeof AREAS[number])
  ? [area as typeof AREAS[number]]
  : AREAS;
```

---

## Page Props: `searchParams` (`apps/web/app/page.tsx`)

Next.js 15 App Router passes `searchParams` as a Promise-based prop:

```ts
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
})
```

The `area` value is extracted and passed to `getTodayOnSalePosts(area)`.

---

## UI: Area Filter Bar

New `<nav>` above the table with one link per area plus "All":

| Button | `href` | Active when |
|--------|--------|-------------|
| すべて | `/` | no `?area` param |
| 秋葉原 | `/?area=akihabara` | `?area=akihabara` |
| 川越   | `/?area=kawagoe`   | `?area=kawagoe`   |
| 大宮   | `/?area=omiya`     | `?area=omiya`     |
| 浦和美園 | `/?area=urawamisono` | `?area=urawamisono` |

Active button: distinct background color (e.g. `#333` text on `#eee` bg → active: `#fff` text on `#333` bg).
