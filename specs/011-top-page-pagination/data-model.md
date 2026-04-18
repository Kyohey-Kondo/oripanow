# Data Model: Top Page Pagination

## No schema changes required

Pagination is a pure UI/query concern. No new DynamoDB entities or GSI changes needed.

## Constants (code-level)

| Constant | Value | Purpose |
|----------|-------|---------|
| `PAGE_SIZE` | 20 | Rows shown per page |
| `MAX_PAGES` | 3 | Maximum navigable pages |
| `MAX_RESULTS` | 60 | Total items fetched (was 50) |

## URL parameter

| Parameter | Type | Valid values | Default |
|-----------|------|-------------|---------|
| `page` | integer string | `"1"`, `"2"`, `"3"` | `"1"` (when absent or invalid) |

Combined with existing `area` parameter: `?area=akihabara&page=2`

## Derived values (computed in page component)

```
pageIndex  = clamp(parseInt(page ?? "1"), 1, MAX_PAGES)  // 1–3
pageStart  = (pageIndex - 1) * PAGE_SIZE                 // 0, 20, 40
pageEnd    = pageIndex * PAGE_SIZE                       // 20, 40, 60
pageItems  = summaries.slice(pageStart, pageEnd)         // items to render
totalPages = Math.min(Math.ceil(summaries.length / PAGE_SIZE), MAX_PAGES)
hasPrev    = pageIndex > 1
hasNext    = pageIndex < totalPages
```
