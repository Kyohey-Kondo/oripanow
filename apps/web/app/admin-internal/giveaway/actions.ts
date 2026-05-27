"use server";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type { AdminActions } from "@oripa-now/types";

const TABLE_NAME =
  process.env.GIVEAWAY_POSTS_TABLE_NAME ??
  `${process.env.DEPLOY_ENV ?? "dev"}-giveaway-posts`;

// Keys allowed to be set via this action — runtime guard against type erasure
const ALLOWED_KEYS = new Set<keyof AdminActions>(["followed", "reposted", "replied", "done"]);

function getClient(): DynamoDBDocumentClient {
  return DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: process.env.AWS_REGION ?? "ap-northeast-1" }),
  );
}

/** Re-verify admin auth inside the action — do not rely on middleware alone. */
async function assertAdmin(): Promise<void> {
  const h = await headers();

  // Production: CloudFront Function sets this header after validating Basic Auth.
  // Lambda is behind OAC so this can only originate from CloudFront.
  if (h.get("x-admin-validated") === "true") return;

  // Local dev: verify Basic Auth credentials directly.
  const auth = h.get("authorization") ?? "";
  if (!auth.startsWith("Basic ")) throw new Error("Unauthorized");
  const decoded = Buffer.from(auth.slice(6), "base64").toString("utf-8");
  const sep = decoded.indexOf(":");
  if (sep === -1) throw new Error("Unauthorized");
  const user = decoded.slice(0, sep);
  const pass = decoded.slice(sep + 1);
  const expectedUser = process.env.ADMIN_USER ?? "";
  const expectedPass = process.env.ADMIN_PASS ?? "";
  // Constant-time comparison to prevent timing attacks
  const ok =
    expectedUser.length > 0 &&
    user.length === expectedUser.length &&
    pass.length === expectedPass.length &&
    user === expectedUser &&
    pass === expectedPass;
  if (!ok) throw new Error("Unauthorized");
}

export async function updateAdminAction(
  postId: string,
  key: keyof AdminActions,
  value: boolean,
): Promise<void> {
  await assertAdmin();

  // Runtime input validation — TypeScript types are erased at the RPC boundary
  if (typeof postId !== "string" || postId.length === 0 || postId.length > 128) {
    throw new Error("Invalid postId");
  }
  if (!ALLOWED_KEYS.has(key as keyof AdminActions)) {
    throw new Error("Invalid key");
  }
  if (typeof value !== "boolean") {
    throw new Error("Invalid value");
  }

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
      ConditionExpression: "attribute_exists(postId)",
      ExpressionAttributeValues: {
        ":actions": updated,
        ":now": new Date().toISOString(),
      },
    }),
  );

  revalidatePath("/admin-internal/giveaway");
}
