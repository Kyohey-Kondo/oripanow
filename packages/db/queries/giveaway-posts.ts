import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { GSI, TABLE_NAMES, type GiveawayPostItem } from "../schema/index";

const SENTINEL_DEADLINE = "9999-12-31";

/**
 * Returns future dates from today through today+days in JST as "YYYY-MM-DD", plus the sentinel.
 */
function getFutureDatesJST(days = 60): string[] {
  const formatter = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const dates = Array.from({ length: days + 1 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return formatter.format(d).replace(/\//g, "-");
  });
  dates.push(SENTINEL_DEADLINE);
  return dates;
}

/**
 * Query GSI1 on giveaway-posts for active campaigns with a specific deadline.
 * GSI1 PK = "statusDeadline" (e.g. "active#2026-06-01"), SK = "createdAt".
 */
async function queryActiveGiveawaysByDeadline(
  client: DynamoDBDocumentClient,
  tableName: string,
  deadline: string,
): Promise<GiveawayPostItem[]> {
  const result = await client.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: GSI.giveawayPostsByStatusDeadline,
      KeyConditionExpression: "statusDeadline = :pk",
      ExpressionAttributeValues: {
        ":pk": `active#${deadline}`,
      },
      ScanIndexForward: false,
    }),
  );
  return (result.Items ?? []) as GiveawayPostItem[];
}

/**
 * Query all active giveaway campaigns from today through today+days, plus unknown-deadline items.
 * All date queries run in parallel via Promise.all.
 */
export async function queryActiveGiveawaysForDateRange(
  client: DynamoDBDocumentClient,
  tableName: string,
  days = 60,
): Promise<GiveawayPostItem[]> {
  const dates = getFutureDatesJST(days);
  const results = await Promise.all(
    dates.map((date) => queryActiveGiveawaysByDeadline(client, tableName, date)),
  );
  return results.flat();
}

export const TABLE_NAME = TABLE_NAMES.giveawayPosts;
export { TABLE_NAMES };
