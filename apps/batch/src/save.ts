import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { type TweetV2 } from 'twitter-api-v2';
import { TABLE_NAMES, type OripaPostItem, type StoreItem, type TweetItem } from '@oripa-now/db';
import type { AnalysisResult } from './parse';

/**
 * Write new tweet records to DynamoDB.
 * tweetId (Twitter's ID) is the PK, so duplicate tweets are silently skipped.
 * Each tweet is saved with processStatus="UNPROCESSED" to appear in the GSI2 queue.
 *
 * Returns the number of records written.
 */
export async function saveTweets(
  docClient: DynamoDBDocumentClient,
  tweets: TweetV2[],
  store: StoreItem,
): Promise<number> {
  const fetchedAt = new Date().toISOString();
  let written = 0;

  for (const tweet of tweets) {
    const item: TweetItem = {
      tweetId: tweet.id,
      storeId: store.storeId,
      content: tweet.text,
      tweetedAt: tweet.created_at ?? fetchedAt,
      isProcessed: false,
      fetchedAt,
      processStatus: 'UNPROCESSED',
    };

    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAMES.tweets,
          Item: item,
          ConditionExpression: 'attribute_not_exists(tweetId)',
        }),
      );
      written++;
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'ConditionalCheckFailedException') {
        // Already exists — skip silently
        continue;
      }
      throw err;
    }
  }

  return written;
}

/**
 * Write OripaPost records derived from AI analysis of a tweet.
 * Creates one record per price tier (result.items). Returns the number of records written.
 * postId for item[0] = tweetId; item[i>0] = "{tweetId}-{i}" to keep idempotency per tier.
 */
export async function saveOripaPost(
  docClient: DynamoDBDocumentClient,
  result: AnalysisResult,
  tweet: TweetItem,
  store: StoreItem,
): Promise<number> {
  const now = new Date().toISOString();
  const saleAt = result.saleAt ?? now.slice(0, 10);
  // Guarantee at least one item even if AI returned an empty array
  const items = result.items.length > 0 ? result.items : [{}];
  let written = 0;

  for (let i = 0; i < items.length; i++) {
    const tier = items[i];
    const postId = i === 0 ? tweet.tweetId : `${tweet.tweetId}-${i}`;

    const post: OripaPostItem = {
      postId,
      storeId: store.storeId,
      tweetId: tweet.tweetId,
      status: result.status as OripaPostItem['status'],
      price: tier.price,
      stockCount: tier.stockCount,
      ...(tier.lastOnePrizeName ? { lastOnePrizeName: tier.lastOnePrizeName } : {}),
      ...(tier.atariCards && tier.atariCards.length > 0 ? { atariCards: tier.atariCards } : {}),
      saleAt,
      rawText: tweet.content,
      createdAt: now,
      updatedAt: now,
      areaStatusDate: `${store.area}#${result.status}#${saleAt}`,
      storeName: store.name,
      storeAddress: store.address,
    };

    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAMES.oripaPosts,
          Item: post,
          ConditionExpression: 'attribute_not_exists(postId)',
        }),
      );
      written++;
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'ConditionalCheckFailedException') {
        continue; // Already exists — idempotent skip
      }
      throw err;
    }
  }

  return written;
}

/**
 * Mark a tweet as processed and remove it from the UNPROCESSED sparse index.
 */
export async function markTweetProcessed(
  docClient: DynamoDBDocumentClient,
  tweetId: string,
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAMES.tweets,
      Key: { tweetId },
      UpdateExpression: 'SET isProcessed = :true REMOVE processStatus',
      ExpressionAttributeValues: { ':true': true },
    }),
  );
}

/**
 * Update the store's lastFetchedTweetId to enable since_id on the next run.
 * Uses the highest (numerically largest) tweet ID from the fetched set.
 */
export async function updateLastFetchedTweetId(
  docClient: DynamoDBDocumentClient,
  storeId: string,
  tweetId: string,
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAMES.stores,
      Key: { storeId },
      UpdateExpression: 'SET lastFetchedTweetId = :tweetId, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':tweetId': tweetId,
        ':updatedAt': new Date().toISOString(),
      },
    }),
  );
}
