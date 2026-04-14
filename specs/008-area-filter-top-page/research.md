# Research: Area Filter on Top Page

## Decision 1: Filter Mechanism — URL Query Param (`?area=`)

**Decision**: `searchParams.area` in the Next.js App Router Server Component.

**Rationale**:
- `page.tsx` already uses `export const dynamic = 'force-dynamic'` — no caching concerns.
- Next.js 15 App Router passes `searchParams` as a prop to page components automatically.
- No client-side JS needed; area buttons are plain `<a href="/?area=akihabara">` links.
- URL is shareable and bookmarkable with no extra work.

**Alternatives considered**:
- Client-side `useState` + `useRouter` (rejected — adds `"use client"`, more complexity, breaks shareability)
- Separate route per area `/area/akihabara` (rejected — over-engineered for current scope)

---

## Decision 2: Area Label Mapping — Hardcoded in Page

**Decision**: Static `AREA_LABELS` map in `page.tsx`:
```ts
const AREA_LABELS: Record<string, string> = {
  akihabara: '秋葉原',
  kawagoe:   '川越',
  omiya:     '大宮',
  urawamisono: '浦和美園',
};
```

**Rationale**: Areas are fixed and known. No DB lookup needed. Co-locating labels with the page keeps it simple.

---

## Decision 3: "All" State — Absence of `?area` param

**Decision**: No `?area` param = show all areas. "All" button links to `/` (no param). Empty string or unknown value falls back to all.

**Rationale**: Simplest mental model. No need for `?area=all` sentinel value.

---

## Decision 4: Filtering in `getTodayOnSalePosts` — Pass Optional Area

**Decision**: Add optional `area?: string` parameter to `getTodayOnSalePosts`. When provided, query only that area; when absent, query all areas as before.

**Rationale**: Keeps the filter logic in the data layer, not scattered in the page component.

---

## No Unknowns Remaining
