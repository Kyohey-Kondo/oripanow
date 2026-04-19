# Data Model: Shop Detail Page Google Map

## No schema changes required

This feature does not add or modify any DynamoDB tables or indexes.

## Data flow changes

### `getShopPosts` return type (lib/posts.ts)

Add `area` to the return value:

```
{
  summaries: OripaPostSummary[]   // unchanged
  storeName: string               // unchanged
  twitterUsername: string         // unchanged
  area: string                    // NEW — e.g., "akihabara"
}
```

The `area` field is fetched from the existing `StoreItem` via `GetCommand`.
The `ProjectionExpression` in the existing query is extended to include `area`.

## Area label mapping (UI layer only)

Computed at render time, not stored:

| area (DB value) | Display label |
|-----------------|---------------|
| akihabara       | 秋葉原         |
| omiya           | 大宮           |
| kawagoe         | 川越           |
| urawamisono     | 浦和美園       |
| tokyo           | 東京           |
| *(other)*       | *(raw value)*  |

## Google Maps embed query

Constructed at render time from `storeName + " " + areaLabel`:

```
query = `${storeName} ${areaLabel}`
embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed&hl=ja`
```
