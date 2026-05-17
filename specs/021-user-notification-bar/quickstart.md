# Quickstart: Invitation Code Promo Bar & Page

## What gets built

1. **PromoBar** — a dismissible banner at the top of every page linking to `/invitation`
2. **Invitation Code Page** — `/invitation` lists oripa sites with their codes and sign-up links
3. **Static data file** — `lib/invitation-codes.ts` to manage the list

## Files to create

```
apps/web/
├── app/
│   ├── components/
│   │   ├── PromoBar.tsx          # 'use client' — dismiss + link
│   │   └── PromoBar.module.css
│   └── invitation/
│       ├── page.tsx              # Server Component — renders entry list
│       └── page.module.css
└── lib/
    └── invitation-codes.ts       # Static data: InvitationCodeEntry[]
```

## Files to modify

```
apps/web/app/layout.tsx           # Add <PromoBar /> before {children}
```

## Dev workflow

```bash
pnpm --filter @oripa-now/web dev
# → http://localhost:3000
# Check bar appears on top of every page
# Check /invitation renders the list
# Click close → bar disappears; navigate → still hidden
```

## Adding a new oripa site

Edit `apps/web/lib/invitation-codes.ts` and add one entry to the array:

```typescript
{
  siteName: 'サイト名',
  siteUrl: 'https://...',
  invitationCode: 'CODE123',
  description: '任意の説明文',
}
```

Deploy to reflect changes.
