import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { GSI, TABLE_NAMES, type OripaPostItem } from "../schema/index";

/**
 * Returns today's date in Japan Standard Time (UTC+9) as "YYYY-MM-DD".
 */
export function getTodayJST(): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replace(/\//g, "-"); // "2026/04/13" → "2026-04-13"
}

/**
 * Returns the last `days` dates in JST as "YYYY-MM-DD" strings, newest first.
 */
export function getRecentDatesJST(days = 14): string[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .format(d)
      .replace(/\//g, "-");
  });
}

/**
 * Query on-sale posts across the last `days` days for a single area.
 * All date queries run in parallel via Promise.all.
 */
export async function queryRecentOnSalePostsByArea(
  client: DynamoDBDocumentClient,
  tableName: string,
  area: string,
  days = 14,
): Promise<OripaPostItem[]> {
  const dates = getRecentDatesJST(days);
  const results = await Promise.all(
    dates.map((date) => queryOnSalePostsByDate(client, tableName, area, date)),
  );
  return results.flat();
}

/**
 * Query GSI1 on oripa-posts for on-sale posts in a given area for the specified date.
 * GSI1 PK = "areaStatusDate" (e.g. "tokyo#on_sale#2026-04-13"), SK = "createdAt".
 * Results are returned newest-first (ScanIndexForward=false).
 */
export async function queryOnSalePostsByDate(
  client: DynamoDBDocumentClient,
  tableName: string,
  area: string,
  dateJST: string,
): Promise<OripaPostItem[]> {
  const result = await client.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: GSI.oripaPostsByAreaStatusDate,
      KeyConditionExpression: "areaStatusDate = :pk",
      FilterExpression: "price > :zero OR stockCount > :zero",
      ExpressionAttributeValues: {
        ":pk": `${area}#on_sale#${dateJST}`,
        ":zero": 0,
      },
      ScanIndexForward: false,
    }),
  );
  return (result.Items ?? []) as OripaPostItem[];
}

/**
 * Query GSI2 on oripa-posts for all posts from a single store in the last `days` days.
 * GSI2 PK = "storeId", SK = "createdAt". Results are returned newest-first.
 */
export async function queryRecentPostsByStore(
  client: DynamoDBDocumentClient,
  tableName: string,
  storeId: string,
  days = 14,
): Promise<OripaPostItem[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffISO = cutoff.toISOString();

  const result = await client.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: GSI.oripaPostsByStore,
      KeyConditionExpression: "storeId = :storeId AND createdAt >= :cutoff",
      ExpressionAttributeValues: {
        ":storeId": storeId,
        ":cutoff": cutoffISO,
      },
      ScanIndexForward: false,
      Limit: 100,
    }),
  );
  return (result.Items ?? []) as OripaPostItem[];
}

export const TABLE_NAME = TABLE_NAMES.oripaPosts;
export { TABLE_NAMES };
