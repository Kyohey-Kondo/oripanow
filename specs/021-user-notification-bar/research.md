# Research: Invitation Code Promo Bar & Page

## 1. Client-side Dismissal in Next.js App Router

**Decision**: Client Component using `sessionStorage` for dismiss state.

**Rationale**:
- `sessionStorage` persists for the browser session (tab lifetime), matching the spec requirement that the bar stays hidden after dismissal until the session ends.
- In Next.js App Router, interactive UI elements requiring state must be Client Components (`'use client'`).
- `sessionStorage` is only available in the browser, so it must be accessed inside `useEffect` to avoid SSR hydration mismatch.
- Pattern: render bar visible on first paint (SSR), then `useEffect` reads `sessionStorage` and hides if dismissed. This avoids hydration errors.

**Alternatives considered**:
- `localStorage` — persists across sessions; too long-lived for a dismissal experience.
- Cookie — server-readable but adds complexity with no benefit here.
- React Context — no SSR benefit, same result as local state.

---

## 2. PromoBar Placement in Layout

**Decision**: Place `<PromoBar />` as the first child of `<body>` in `app/layout.tsx`, before `{children}`.

**Rationale**:
- Must appear on every page above all content.
- Placing before `{children}` ensures it is outside page-specific scroll containers.
- Existing global components (`<Footer>`, `<A8ProductAd>`, `<FloatingAdBanner>`) are placed after `{children}` — promo bar is placed before, mirroring that pattern symmetrically.

---

## 3. Static Data File Location & Format

**Decision**: TypeScript array in `apps/web/lib/invitation-codes.ts`.

**Rationale**:
- Existing static data (e.g., `lib/regions.ts`) uses TypeScript arrays, not JSON. Consistent with project conventions.
- TypeScript gives type safety and IDE autocomplete when adding entries.
- Developers can update the list by editing one file and deploying — no database or admin UI needed.

**Type definition**:
```typescript
export type InvitationCodeEntry = {
  siteName: string;        // Display name of the oripa site
  siteUrl: string;         // Direct link to sign-up or top page
  invitationCode: string;  // Code to display / copy
  description?: string;    // Optional short description
};
```

---

## 4. Invitation Code Page Route

**Decision**: Route at `/invitation` → `apps/web/app/invitation/page.tsx`.

**Rationale**:
- Follows existing page convention (`/oripa` → `app/oripa/page.tsx`).
- Short, memorable URL for a link from the promo bar.
- Server Component (no interactivity needed on the page itself — codes are static).

---

## 5. Copy-to-Clipboard Behavior

**Decision**: Out of scope for v1. Code is displayed as plain text; users can copy manually.

**Rationale**: Spec v1 does not require copy functionality. Keeping it simple for the initial release.
