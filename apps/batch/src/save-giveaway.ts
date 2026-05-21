import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { TABLE_NAMES, type GiveawayPostItem, type GiveawayTweetItem, type StoreItem } from '@oripa-now/db';
import type { GiveawayAnalysisResult } from './parse-giveaway';

const SENTINEL_DEADLINE = '9999-12-31';

function buildStatusDeadline(status: GiveawayPostItem['status'], deadline?: string): string {
  return `${status}#${deadline ?? SENTINEL_DEADLINE}`;
}

/**
 * Write new giveaway tweet records to DynamoDB.
 * tweetId is the PK, so duplicates are silently skipped.
 * Each tweet is saved with processStatus="UNPROCESSED" for the GSI2 queue.
 *
 * Returns the number of records written.
 */
export async function saveGiveawayTweets(
  docClient: DynamoDBDocumentClient,
  tweets: GiveawayTweetItem[],
): Promise<number> {
  let written = 0;

  for (const item of tweets) {
    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAMES.giveawayTweets,
          Item: item,
          ConditionExpression: 'attribute_not_exists(tweetId)',
        }),
      );
      written++;
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'ConditionalCheckFailedException') {
        continue;
      }
      throw err;
    }
  }

  return written;
}

/**
 * Write a GiveawayPost record derived from AI analysis.
 * postId = tweetId (one record per giveaway tweet).
 * Returns true if written, false if already existed (idempotent skip).
 */
export async function saveGiveawayPost(
  docClient: DynamoDBDocumentClient,
  result: GiveawayAnalysisResult,
  tweet: GiveawayTweetItem,
  store?: StoreItem,
): Promise<boolean> {
  const now = new Date().toISOString();

  const post: GiveawayPostItem = {
    postId: tweet.tweetId,
    tweetId: tweet.tweetId,
    sourceType: tweet.sourceType,
    ...(tweet.storeId ? { storeId: tweet.storeId } : {}),
    ...(store ? { storeName: store.name } : {}),
    twitterUsername: tweet.twitterUsername,
    status: result.status as GiveawayPostItem['status'],
    prizes: result.prizes,
    ...(result.conditions ? { conditions: result.conditions } : {}),
    ...(result.deadline ? { deadline: result.deadline } : {}),
    rawText: tweet.content,
    createdAt: now,
    updatedAt: now,
    statusDeadline: buildStatusDeadline(
      result.status as GiveawayPostItem['status'],
      result.deadline,
    ),
  };

  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.giveawayPosts,
        Item: post,
        ConditionExpression: 'attribute_not_exists(postId)',
      }),
    );
    return true;
  } catch (err: unknown) {
    if ((err as { name?: string }).name === 'ConditionalCheckFailedException') {
      return false;
    }
    throw err;
  }
}

/**
 * Mark a giveaway tweet as processed and remove it from the UNPROCESSED sparse index.
 */
export async function markGiveawayTweetProcessed(
  docClient: DynamoDBDocumentClient,
  tweetId: string,
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAMES.giveawayTweets,
      Key: { tweetId },
      UpdateExpression: 'SET isProcessed = :true REMOVE processStatus',
      ExpressionAttributeValues: { ':true': true },
    }),
  );
}

/**
 * Get or update the giveaway keyword search cursor (since_id).
 * Stored as a special item in the stores table with PK = "GIVEAWAY_SEARCH_CURSOR".
 */
export async function getGiveawaySearchCursor(
  docClient: DynamoDBDocumentClient,
): Promise<string | undefined> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAMES.stores,
      Key: { storeId: 'GIVEAWAY_SEARCH_CURSOR' },
    }),
  );
  return (result.Item as { sinceId?: string } | undefined)?.sinceId;
}

export async function updateGiveawaySearchCursor(
  docClient: DynamoDBDocumentClient,
  sinceId: string,
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAMES.stores,
      Key: { storeId: 'GIVEAWAY_SEARCH_CURSOR' },
      UpdateExpression: 'SET sinceId = :sinceId, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':sinceId': sinceId,
        ':updatedAt': new Date().toISOString(),
      },
    }),
  );
}
