import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { GSI, TABLE_NAMES, type OnlineOripaItem } from "../schema/index";

/**
 * Query GSI1 on online-oripa-items for currently active items, newest first.
 * GSI1 is sparse — only items with status "active" carry the activeStatus
 * attribute, so inactive items never appear here.
 */
export async function queryActiveOnlineOripaItems(
  client: DynamoDBDocumentClient,
  tableName: string,
): Promise<OnlineOripaItem[]> {
  const result = await client.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: GSI.onlineOripaItemsByActiveStatus,
      KeyConditionExpression: "activeStatus = :active",
      ExpressionAttributeValues: { ":active": "ACTIVE" },
      ScanIndexForward: false,
    }),
  );
  return (result.Items ?? []) as OnlineOripaItem[];
}

export const TABLE_NAME = TABLE_NAMES.onlineOripaItems;
export { TABLE_NAMES };
