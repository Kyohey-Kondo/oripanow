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
 * Query GSI1 on oripa-posts for on-sale posts in a given area for the specified date.
 * GSI1 PK = "areaStatusDate" (e.g. "tokyo#on_sale#2026-04-13"), SK = "createdAt".
 * Results are returned newest-first (ScanIndexForward=false).
 */
export async function queryOnSalePostsByDate(
  client: DynamoDBDocumentClient,
  tableName: string,
  area: string,
  dateJST: string,
  limit = 50,
): Promise<OripaPostItem[]> {
  const result = await client.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: GSI.oripaPostsByAreaStatusDate,
      KeyConditionExpression: "areaStatusDate = :pk",
      ExpressionAttributeValues: {
        ":pk": `${area}#on_sale#${dateJST}`,
      },
      ScanIndexForward: false,
      Limit: limit,
    }),
  );
  return (result.Items ?? []) as OripaPostItem[];
}

export const TABLE_NAME = TABLE_NAMES.oripaPosts;
export { TABLE_NAMES };
