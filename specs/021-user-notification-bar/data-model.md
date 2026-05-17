# Data Model: Invitation Code Promo Bar & Page

## Entities

### InvitationCodeEntry

Static data record stored in `apps/web/lib/invitation-codes.ts`.

| Field | Type | Required | Description |
|---|---|---|---|
| `siteName` | `string` | ✓ | Display name of the oripa site |
| `siteUrl` | `string` | ✓ | Full URL to the site's sign-up or top page |
| `invitationCode` | `string` | ✓ | Invitation/referral code string |
| `description` | `string` | — | Short description shown under the site name |

**Example**:
```typescript
{
  siteName: 'トレカパーク',
  siteUrl: 'https://example-oripa.jp/invite?code=ORIPANOW',
  invitationCode: 'ORIPANOW',
  description: 'ポケカオリパ専門サイト',
}
```

---

### PromoBar (UI state — no persistence model)

Dismiss state is stored client-side in `sessionStorage` with key `promoBarDismissed`.

| Key | Value | Scope |
|---|---|---|
| `promoBarDismissed` | `"1"` | Browser session (tab lifetime) |

---

## No DynamoDB Changes

This feature uses no DynamoDB tables. All data is static TypeScript.
