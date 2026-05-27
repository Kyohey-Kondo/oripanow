"use server";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { SSMClient, GetParametersCommand } from "@aws-sdk/client-ssm";
import { revalidatePath } from "next/cache";
import { headers, cookies } from "next/headers";
import { createHmac } from "crypto";
import { TwitterApi } from "twitter-api-v2";
import type { AdminActions } from "@oripa-now/types";

const TABLE_NAME =
  process.env.GIVEAWAY_POSTS_TABLE_NAME ??
  `${process.env.DEPLOY_ENV ?? "dev"}-giveaway-posts`;

const ALLOWED_KEYS = new Set<keyof AdminActions>(["followed", "reposted", "replied", "done"]);

const REGION = process.env.AWS_REGION ?? "ap-northeast-1";
const DEPLOY_ENV = process.env.DEPLOY_ENV ?? "dev";

function getDbClient(): DynamoDBDocumentClient {
  return DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
}

// Cache credentials for the Lambda warm-start lifetime (module scope)
type TwitterCreds = { apiKey: string; apiSecret: string; accessToken: string; accessSecret: string };
let cachedCreds: TwitterCreds | null = null;

async function getTwitterCreds(): Promise<TwitterCreds> {
  if (cachedCreds) return cachedCreds;

  // Local dev: use env vars directly
  if (process.env.X_STAFF_API_KEY) {
    cachedCreds = {
      apiKey: process.env.X_STAFF_API_KEY,
      apiSecret: process.env.X_STAFF_API_SECRET!,
      accessToken: process.env.X_STAFF_ACCESS_TOKEN!,
      accessSecret: process.env.X_STAFF_ACCESS_TOKEN_SECRET!,
    };
    return cachedCreds;
  }

  // Production: fetch from SSM SecureString at runtime
  const ssm = new SSMClient({ region: REGION });
  const { Parameters } = await ssm.send(new GetParametersCommand({
    Names: [
      `/oripa-now/${DEPLOY_ENV}/staff-customer-key`,
      `/oripa-now/${DEPLOY_ENV}/staff-customer-key-secret`,
      `/oripa-now/${DEPLOY_ENV}/staff-access-token`,
      `/oripa-now/${DEPLOY_ENV}/staff-access-token-secret`,
    ],
    WithDecryption: true,
  }));
  const get = (name: string) => Parameters?.find((p: { Name?: string; Value?: string }) => p.Name?.endsWith(name))?.Value ?? "";
  cachedCreds = {
    apiKey: get("staff-customer-key"),
    apiSecret: get("staff-customer-key-secret"),
    accessToken: get("staff-access-token"),
    accessSecret: get("staff-access-token-secret"),
  };
  return cachedCreds;
}

async function getTwitterClient(): Promise<TwitterApi> {
  const creds = await getTwitterCreds();
  return new TwitterApi({
    appKey: creds.apiKey,
    appSecret: creds.apiSecret,
    accessToken: creds.accessToken,
    accessSecret: creds.accessSecret,
  });
}

function makeSessionToken(): string {
  const secret = process.env.ADMIN_PASS ?? "fallback";
  return createHmac("sha256", secret).update("admin-authenticated").digest("hex");
}

/** Re-verify admin auth inside the action via HMAC session cookie. */
async function assertAdmin(): Promise<void> {
  const jar = await cookies();
  const cookie = jar.get("admin_session")?.value;
  if (cookie && cookie === makeSessionToken()) return;

  // Fallback for local dev without cookie (e.g. first request before cookie is set)
  const h = await headers();
  if (h.get("x-admin-validated") === "true") return;

  throw new Error("Unauthorized");
}

async function persistAdminAction(
  postId: string,
  key: keyof AdminActions,
  value: boolean,
): Promise<void> {
  const client = getDbClient();
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

// ─── Public actions ───────────────────────────────────────────────────────────

export async function updateAdminAction(
  postId: string,
  key: keyof AdminActions,
  value: boolean,
): Promise<void> {
  await assertAdmin();
  if (typeof postId !== "string" || postId.length === 0 || postId.length > 128) throw new Error("Invalid postId");
  if (!ALLOWED_KEYS.has(key as keyof AdminActions)) throw new Error("Invalid key");
  if (typeof value !== "boolean") throw new Error("Invalid value");
  await persistAdminAction(postId, key, value);
}

export async function twitterFollow(postId: string, twitterUsername: string): Promise<void> {
  await assertAdmin();
  if (typeof postId !== "string" || postId.length === 0 || postId.length > 128) throw new Error("Invalid postId");
  if (typeof twitterUsername !== "string" || twitterUsername.length === 0) throw new Error("Invalid username");

  const client = await getTwitterClient();
  const username = twitterUsername.replace(/^@/, "");
  const me = await client.v2.me();
  const target = await client.v2.userByUsername(username);
  await client.v2.follow(me.data.id, target.data.id);
  await persistAdminAction(postId, "followed", true);
}

export async function twitterRetweet(postId: string, tweetId: string): Promise<void> {
  await assertAdmin();
  if (typeof postId !== "string" || postId.length === 0 || postId.length > 128) throw new Error("Invalid postId");
  if (typeof tweetId !== "string" || !/^\d+$/.test(tweetId)) throw new Error("Invalid tweetId");

  const client = await getTwitterClient();
  const me = await client.v2.me();
  await client.v2.retweet(me.data.id, tweetId);
  await persistAdminAction(postId, "reposted", true);
}

export async function twitterReply(postId: string, tweetId: string, text: string): Promise<void> {
  await assertAdmin();
  if (typeof postId !== "string" || postId.length === 0 || postId.length > 128) throw new Error("Invalid postId");
  if (typeof tweetId !== "string" || !/^\d+$/.test(tweetId)) throw new Error("Invalid tweetId");
  if (typeof text !== "string" || text.length === 0 || text.length > 280) throw new Error("Invalid text");

  const client = await getTwitterClient();
  await client.v2.reply(text, tweetId);
  await persistAdminAction(postId, "replied", true);
}
