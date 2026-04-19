# Research: Shop Detail Page Google Map

## Google Maps Embed Approach

**Decision**: Use API-key-free iframe embed (`maps.google.com/maps?q=...&output=embed`)

**Rationale**:
- No API key required — avoids credential management and billing setup
- Supports text-based search queries (store name + area) natively
- Interactive (pan/zoom) out of the box
- Opens full Google Maps in new tab via standard "View larger map" link included in the embed

**Alternatives considered**:
- **Google Maps Embed API** (requires API key): More configurable, but introduces billing risk and secret management overhead. Rejected for simplicity.
- **Static map image**: Not interactive. Rejected per FR-003.
- **OpenStreetMap embed**: No Google brand; less accurate for Japanese store search. Rejected since spec references Google Maps explicitly.

**Embed URL pattern**:
```
https://maps.google.com/maps?q=<encoded-query>&output=embed&hl=ja
```
Example: `https://maps.google.com/maps?q=Duel+Stade+Ganryu+秋葉原&output=embed&hl=ja`

---

## Area Code → Japanese Label Mapping

**Decision**: Map area codes to Japanese location names for use in search queries.

**Rationale**: Area codes in the DB (`akihabara`, `omiya`, etc.) are English slugs. Google Maps searches return better results with Japanese place names.

**Mapping**:

| Area code    | Japanese label |
|--------------|---------------|
| akihabara    | 秋葉原         |
| omiya        | 大宮           |
| kawagoe      | 川越           |
| urawamisono  | 浦和美園       |
| tokyo        | 東京           |

Unknown codes fall back to the raw code value.

---

## Data Availability

**Decision**: Extend `getShopPosts` to return `area` in addition to `storeName` and `twitterUsername`.

**Rationale**: The shop page currently fetches `storeId`, `name`, `twitterUsername` from DynamoDB. `area` is already stored on the `StoreItem` and can be retrieved with the same `GetCommand` by adding it to the `ProjectionExpression`.

**Change scope**: Minimal — one field added to the existing `GetCommand` in `lib/posts.ts`.

---

## Rendering Approach

**Decision**: Render the map as a client-side `<iframe>` inside the server-side Next.js page component.

**Rationale**:
- No server-side computation needed — the URL is constructed from already-available data
- The iframe loads independently (FR-007: must not block table rendering)
- Consistent with how Twitter oEmbed widgets are handled in the same file

**Map dimensions**: Fixed height of `300px`, full container width. Matches the `tableColumn` width on desktop; on mobile it spans full viewport width.
