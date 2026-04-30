import type { MetadataRoute } from 'next';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { TABLE_NAMES } from '@oripa-now/db';

const BASE_URL = 'https://oripanow.com';

async function getAllActiveStoreIds(): Promise<string[]> {
  const client = DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: process.env.AWS_REGION ?? 'ap-northeast-1' }),
  );
  try {
    const result = await client.send(new ScanCommand({
      TableName: TABLE_NAMES.stores,
      ProjectionExpression: 'storeId',
      FilterExpression: 'isActive = :t',
      ExpressionAttributeValues: { ':t': true },
    }));
    return (result.Items ?? []).map((item) => item.storeId as string);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const storeIds = await getAllActiveStoreIds();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/oripa`, lastModified: new Date(), changeFrequency: 'hourly', priority: 1 },
    { url: `${BASE_URL}/privacy-policy`, changeFrequency: 'monthly', priority: 0.3 },
  ];

  const shopRoutes: MetadataRoute.Sitemap = storeIds.map((id) => ({
    url: `${BASE_URL}/oripa/shops/${id}`,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...shopRoutes];
}
