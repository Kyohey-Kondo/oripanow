import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ulid } from 'ulid';
import { type TweetV2 } from 'twitter-api-v2';
import { TABLE_NAMES, type OripaPostItem, type StoreItem, type TweetItem } from '@oripa-now/db';
import type { AnalysisResult } from './parse';

/**
 * Write new tweet records to DynamoDB.
 * Each tweet becomes a TweetItem with isProcessed=false and processStatus="UNPROCESSED"
 * so it appears in the GSI2 unprocessed queue for downstream AI analysis.
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
      id: ulid(),
      tweetId: tweet.id,
      storeId: store.storeId,
      content: tweet.text,
      tweetedAt: tweet.created_at ?? fetchedAt,
      isProcessed: false,
      fetchedAt,
      processStatus: 'UNPROCESSED',
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAMES.tweets,
        Item: item,
        // Idempotency: skip if a record with the same internal tweetId already exists.
        // We check tweetId via a filter rather than a condition on PK (which is ULID).
        // Since since_id prevents the API from returning already-fetched tweets on
        // subsequent runs, this guard only fires on the very first run or after a
        // lastFetchedTweetId reset.
        ConditionExpression: 'attribute_not_exists(id)',
      }),
    );
    written++;
  }

  return written;
}

/**
 * Write an OripaPost record derived from AI analysis of a tweet.
 */
export async function saveOripaPost(
  docClient: DynamoDBDocumentClient,
  result: AnalysisResult,
  tweet: TweetItem,
  store: StoreItem,
): Promise<void> {
  const now = new Date().toISOString();
  const saleAt = result.saleAt ?? now.slice(0, 10);

  const item: OripaPostItem = {
    postId: ulid(),
    storeId: store.storeId,
    tweetId: tweet.tweetId,
    status: result.status as OripaPostItem['status'],
    price: result.price,
    stockCount: result.stockCount,
    saleAt,
    rawText: tweet.content,
    createdAt: now,
    updatedAt: now,
    areaStatusDate: `${store.area}#${result.status}#${saleAt}`,
    storeName: store.name,
    storeAddress: store.address,
  };

  await docClient.send(
    new PutCommand({ TableName: TABLE_NAMES.oripaPosts, Item: item }),
  );
}

/**
 * Mark a tweet as processed and remove it from the UNPROCESSED sparse index.
 */
export async function markTweetProcessed(
  docClient: DynamoDBDocumentClient,
  id: string,
): Promise<void> {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAMES.tweets,
      Key: { id },
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
