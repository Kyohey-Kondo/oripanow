"use server";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { revalidatePath } from "next/cache";
import type { AdminActions } from "@oripa-now/types";

const TABLE_NAME =
  process.env.GIVEAWAY_POSTS_TABLE_NAME ??
  `${process.env.DEPLOY_ENV ?? "dev"}-giveaway-posts`;

function getClient(): DynamoDBDocumentClient {
  return DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: process.env.AWS_REGION ?? "ap-northeast-1" }),
  );
}

export async function updateAdminAction(
  postId: string,
  key: keyof AdminActions,
  value: boolean,
): Promise<void> {
  const client = getClient();

  const existing = await client.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { postId },
      ProjectionExpression: "adminActions",
    }),
  );
  const current = (existing.Item?.adminActions ?? {}) as AdminActions;
  const updated: AdminActions = { ...current, [key]: value };

  await client.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { postId },
      UpdateExpression: "SET adminActions = :actions, updatedAt = :now",
      ExpressionAttributeValues: {
        ":actions": updated,
        ":now": new Date().toISOString(),
      },
    }),
  );

  revalidatePath("/admin-internal/giveaway");
}
