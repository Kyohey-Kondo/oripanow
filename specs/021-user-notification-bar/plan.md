# Implementation Plan: Invitation Code Promo Bar & Page

**Branch**: `021-user-notification-bar` | **Date**: 2026-05-17 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/021-user-notification-bar/spec.md`

## Summary

Add a fixed promo bar at the top of every page that links to a new `/invitation` page listing oripa sites with their invitation codes. The bar can be dismissed for the session. Data is managed via a static TypeScript file.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 22 LTS  
**Primary Dependencies**: Next.js 15 (App Router, Server + Client Components), CSS Modules  
**Storage**: N/A — static TypeScript data file only  
**Testing**: Playwright (UI verification per CLAUDE.md rules)  
**Target Platform**: Web (desktop + mobile, 320px–1920px)  
**Project Type**: Web application (Next.js)  
**Performance Goals**: Standard page load; bar renders without layout shift  
**Constraints**: Hydration-safe (bar dismissal must not cause SSR/client mismatch)  
**Scale/Scope**: < 20 oripa site entries for v1

## Constitution Check

Constitution file contains only placeholder content — no project-specific gates defined. Proceeding without violations.

## Project Structure

### Documentation (this feature)

```text
specs/021-user-notification-bar/
├── plan.md              ← this file
├── spec.md
├── research.md
├── data-model.md
├── quickstart.md
└── checklists/
    └── requirements.md
```

### Source Code Changes

```text
apps/web/
├── app/
│   ├── layout.tsx                    ← MODIFY: add <PromoBar />
│   ├── components/
│   │   ├── PromoBar.tsx              ← CREATE: 'use client', dismiss + link
│   │   └── PromoBar.module.css       ← CREATE: bar styles
│   └── invitation/
│       ├── page.tsx                  ← CREATE: Server Component, entry list
│       └── page.module.css           ← CREATE: page styles
└── lib/
    └── invitation-codes.ts           ← CREATE: InvitationCodeEntry[]
```

## Implementation Steps

### Step 1 — Static data file

Create `apps/web/lib/invitation-codes.ts`:

```typescript
export type InvitationCodeEntry = {
  siteName: string;
  siteUrl: string;
  invitationCode: string;
  description?: string;
};

export const INVITATION_CODES: InvitationCodeEntry[] = [
  // entries added here
];
```

### Step 2 — PromoBar component

Create `apps/web/app/components/PromoBar.tsx` as a Client Component:

- On mount, read `sessionStorage.getItem('promoBarDismissed')`
- If `"1"`, set `dismissed = true` → render `null`
- Render a bar with label text + link to `/invitation` + close button
- On close: `sessionStorage.setItem('promoBarDismissed', '1')` + set state

**Hydration safety**: initial render always shows the bar (SSR), `useEffect` hides it if dismissed. No flash for non-dismissed users.

CSS (`PromoBar.module.css`):
- Fixed/sticky top, full width
- Dark theme consistent with existing palette (`--accent`, `--text`, etc.)
- Z-index above page content
- Mobile: single line, text truncated if needed

### Step 3 — Invitation code page

Create `apps/web/app/invitation/page.tsx` (Server Component):

- Import `INVITATION_CODES` from `lib/invitation-codes.ts`
- Render a list of cards: site name, description, invitation code, link button
- Each link opens in `target="_blank" rel="noopener noreferrer"`
- Add `generateMetadata()` for SEO

### Step 4 — Wire PromoBar into root layout

Modify `apps/web/app/layout.tsx`:
- Import `PromoBar`
- Add `<PromoBar />` as first element inside `<body>`, before `{children}`

### Step 5 — Verify with Playwright

Per CLAUDE.md UI rules:
- Screenshot homepage → bar visible at top
- Click bar link → `/invitation` loads with entries
- Click close → bar hidden; navigate to another page → still hidden
- Mobile viewport (375px) → bar renders correctly

## Complexity Tracking

No constitution violations. No complexity justification required.
