# Data Model: Admin Page with Hash Path and Basic Auth

## No Schema Changes

This feature reads from existing DynamoDB tables only. No new tables, GSIs, or attribute changes are required.

## Existing Tables Used (Read-Only)

### `stores` Table

| Attribute | Type   | Description                  |
|-----------|--------|------------------------------|
| PK        | String | `STORE#<id>`                 |
| SK        | String | `STORE#<id>`                 |
| name      | String | Store display name           |
| area      | String | One of the valid area values |
| active    | Boolean | Whether store is active     |

**Access pattern**: Scan or Query all items to count active stores.

### `oripa-posts` Table (GSI1)

| Attribute    | Type   | Description                                    |
|--------------|--------|------------------------------------------------|
| GSI1PK       | String | `<area>#ON_SALE`                               |
| GSI1SK       | String | `<saleAtDate>#<createdAt>`                     |
| postId       | String | Unique post identifier                         |
| storeId      | String | Reference to `stores`                          |

**Access pattern**: Query GSI1 per area with `GSI1SK` between today-7days and today — same as `queryRecentOnSalePostsByArea`.

## Runtime Configuration (Environment Variables)

| Variable         | Description                                      | Example Value  |
|------------------|--------------------------------------------------|----------------|
| `ADMIN_PATH_HASH`| Short opaque string forming the admin URL segment | `a3f7b2`       |
| `ADMIN_USER`     | Basic Auth username                              | `admin`        |
| `ADMIN_PASS`     | Basic Auth password                              | `s3cr3t!`      |

All three variables are server-side only (no `NEXT_PUBLIC_` prefix). They are injected by CDK into the Next.js Lambda function environment.
