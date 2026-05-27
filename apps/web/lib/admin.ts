import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { TABLE_NAMES } from "@oripa-now/db";
import { TABLE_NAME, queryRecentOnSalePostsByArea } from "@oripa-now/db/queries/oripa-posts";
import type { StoreItem } from "@oripa-now/db";

const AREAS = ["akihabara", "ikebukuro", "shinjuku", "kawagoe", "omiya"] as const;
type Area = typeof AREAS[number];

export type AdminStats = {
  storeCount: number;
  activeStoreCount: number;
  postCountsByArea: Record<Area, number>;
  fetchedAt: string;
};

export async function fetchAdminStats(): Promise<AdminStats> {
  const client = DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: process.env.AWS_REGION ?? "ap-northeast-1" }),
  );

  const [storesResult, ...areaCounts] = await Promise.all([
    client.send(new ScanCommand({ TableName: TABLE_NAMES.stores })),
    ...AREAS.map((area) =>
      queryRecentOnSalePostsByArea(client, TABLE_NAME, area, 7),
    ),
  ]);

  const stores = (storesResult.Items ?? []) as StoreItem[];
  const postCountsByArea = Object.fromEntries(
    AREAS.map((area, i) => [area, areaCounts[i].length]),
  ) as Record<Area, number>;

  return {
    storeCount: stores.length,
    activeStoreCount: stores.filter((s) => s.isActive).length,
    postCountsByArea,
    fetchedAt: new Date().toISOString(),
  };
}
