"use server";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { ulid } from "ulid";
import { revalidatePath } from "next/cache";
import { TABLE_NAMES } from "@oripa-now/db";
import type { StoreItem } from "@oripa-now/db";
import { AREAS, type Area } from "@/lib/admin";

const docClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION ?? "ap-northeast-1" }),
);
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION ?? "ap-northeast-1" });

function requireArea(value: FormDataEntryValue | null): Area {
  if (typeof value !== "string" || !AREAS.includes(value as Area)) {
    throw new Error(`Invalid area: ${String(value)}`);
  }
  return value as Area;
}

function requireString(value: FormDataEntryValue | null, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

export async function addStoreAction(formData: FormData): Promise<void> {
  const now = new Date().toISOString();
  const address = formData.get("address");

  const store: StoreItem = {
    storeId: ulid(),
    name: requireString(formData.get("name"), "name"),
    twitterUsername: requireString(formData.get("twitterUsername"), "twitterUsername").replace(/^@/, ""),
    area: requireArea(formData.get("area")),
    ...(typeof address === "string" && address.trim().length > 0 ? { address: address.trim() } : {}),
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(new PutCommand({ TableName: TABLE_NAMES.stores, Item: store }));
  revalidatePath("/admin-internal");
}

export async function updateStoreAction(formData: FormData): Promise<void> {
  const storeId = requireString(formData.get("storeId"), "storeId");
  const address = formData.get("address");

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAMES.stores,
      Key: { storeId },
      UpdateExpression:
        "SET #name = :name, twitterUsername = :twitterUsername, area = :area, isActive = :isActive, updatedAt = :updatedAt" +
        (typeof address === "string" && address.trim().length > 0
          ? ", address = :address"
          : " REMOVE address"),
      ExpressionAttributeNames: { "#name": "name" },
      ExpressionAttributeValues: {
        ":name": requireString(formData.get("name"), "name"),
        ":twitterUsername": requireString(formData.get("twitterUsername"), "twitterUsername").replace(/^@/, ""),
        ":area": requireArea(formData.get("area")),
        ":isActive": formData.get("isActive") === "on",
        ":updatedAt": new Date().toISOString(),
        ...(typeof address === "string" && address.trim().length > 0 ? { ":address": address.trim() } : {}),
      },
    }),
  );

  revalidatePath("/admin-internal");
}

export type CheckActionState = { status: "idle" | "done" | "error"; message: string };

/**
 * Trigger an on-demand tweet fetch for a single store, an area, or all
 * active stores. Reuses the same fetch/save logic as the daily batch by
 * invoking it asynchronously (fire-and-forget) — the admin decides when to
 * spend the API call, so this is intentionally not on any schedule.
 */
export async function triggerCheckAction(
  _prevState: CheckActionState,
  formData: FormData,
): Promise<CheckActionState> {
  const storeId = formData.get("storeId");
  const area = formData.get("area");

  const payload: { storeId?: string; area?: Area } = {
    ...(typeof storeId === "string" && storeId.length > 0 ? { storeId } : {}),
    ...(typeof area === "string" && AREAS.includes(area as Area) ? { area: area as Area } : {}),
  };

  const functionName = process.env.BATCH_FUNCTION_NAME;
  if (!functionName) {
    return { status: "error", message: "BATCH_FUNCTION_NAME is not configured" };
  }

  try {
    await lambdaClient.send(
      new InvokeCommand({
        FunctionName: functionName,
        InvocationType: "Event",
        Payload: Buffer.from(JSON.stringify(payload)),
      }),
    );
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : String(err) };
  }

  revalidatePath("/admin-internal");
  return { status: "done", message: "実行しました" };
}
