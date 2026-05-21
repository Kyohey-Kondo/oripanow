import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { TwitterApi, type TweetV2 } from 'twitter-api-v2';
import { TABLE_NAMES, type GiveawayTweetItem, type StoreItem } from '@oripa-now/db';
import { saveGiveawayTweets, getGiveawaySearchCursor, updateGiveawaySearchCursor } from './save-giveaway';

export type FetchGiveawayRunResult = {
  runAt: string;
  storeAccountTweetsWritten: number;
  searchTweetsWritten: number;
  errors: Array<{ context: string; error: string }>;
};

const GIVEAWAY_KEYWORDS = ['プレゼント', '懸賞', '企画', 'プレゼントキャンペーン', '無料'];
const GAME_KEYWORDS = ['ポケカ', 'ポケモンカード', 'ポケモン', 'Pokemon', 'Pokémon', 'PTCG'];

function buildStoreQuery(username: string): string {
  const giveawayClause = GIVEAWAY_KEYWORDS.map((k) => `"${k}"`).join(' OR ');
  const gameClause = GAME_KEYWORDS.map((k) => `"${k}"`).join(' OR ');
  return `from:${username} (${giveawayClause}) (${gameClause}) -is:retweet`;
}

const BROAD_SEARCH_QUERY =
  '(ポケカ OR ポケモンカード) (プレゼント OR 懸賞 OR 企画 OR プレゼントキャンペーン) (フォロー OR RT OR リツイート) -is:retweet lang:ja';

function maxTweetId(ids: string[]): string | undefined {
  if (ids.length === 0) return undefined;
  return ids.reduce((max, id) => (BigInt(id) > BigInt(max) ? id : max));
}

async function fetchFromStoreAccounts(
  twitterClient: TwitterApi,
  stores: StoreItem[],
  fetchedAt: string,
): Promise<{ items: GiveawayTweetItem[]; errors: FetchGiveawayRunResult['errors'] }> {
  const items: GiveawayTweetItem[] = [];
  const errors: FetchGiveawayRunResult['errors'] = [];

  for (const store of stores) {
    try {
      const query = buildStoreQuery(store.twitterUsername);
      const params: Parameters<typeof twitterClient.v2.search>[1] = {
        max_results: 100,
        'tweet.fields': ['created_at', 'author_id', 'id'],
      };
      // Look back 48h when no since_id (giveaways are less frequent than oripa)
      params.start_time = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

      const paginator = await twitterClient.v2.search(query, params);
      const tweets: TweetV2[] = paginator.data.data ?? [];

      for (const tweet of tweets) {
        items.push({
          tweetId: tweet.id,
          sourceType: 'store',
          storeId: store.storeId,
          twitterUsername: store.twitterUsername,
          content: tweet.text,
          tweetedAt: tweet.created_at ?? fetchedAt,
          fetchedAt,
          isProcessed: false,
          processStatus: 'UNPROCESSED',
        });
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      errors.push({ context: `store:${store.twitterUsername}`, error });
      console.error(JSON.stringify({ level: 'ERROR', context: `store:${store.twitterUsername}`, error }));
    }
  }

  return { items, errors };
}

async function fetchFromBroadSearch(
  twitterClient: TwitterApi,
  fetchedAt: string,
  sinceId?: string,
): Promise<{ items: GiveawayTweetItem[]; highestId?: string }> {
  const params: Parameters<typeof twitterClient.v2.search>[1] = {
    max_results: 100,
    'tweet.fields': ['created_at', 'author_id', 'id'],
  };

  if (sinceId) {
    params.since_id = sinceId;
  } else {
    params.start_time = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  }

  console.log(JSON.stringify({ level: 'DEBUG', query: BROAD_SEARCH_QUERY, sinceId }));
  const paginator = await twitterClient.v2.search(BROAD_SEARCH_QUERY, params);
  const tweets: TweetV2[] = paginator.data.data ?? [];

  const items: GiveawayTweetItem[] = tweets.map((tweet) => ({
    tweetId: tweet.id,
    sourceType: 'search' as const,
    twitterUsername: tweet.author_id ?? 'unknown',
    content: tweet.text,
    tweetedAt: tweet.created_at ?? fetchedAt,
    fetchedAt,
    isProcessed: false,
    processStatus: 'UNPROCESSED' as const,
  }));

  return { items, highestId: maxTweetId(tweets.map((t) => t.id)) };
}

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (_event: unknown): Promise<FetchGiveawayRunResult> => {
  const runAt = new Date().toISOString();
  const fetchedAt = runAt;
  const twitterClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN ?? '');
  const errors: FetchGiveawayRunResult['errors'] = [];

  // Load active stores
  const storesResult = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAMES.stores,
      FilterExpression: 'isActive = :true',
      ExpressionAttributeValues: { ':true': true },
    }),
  );
  const stores = (storesResult.Items ?? []) as StoreItem[];

  // Strategy A: per-store accounts
  const { items: storeItems, errors: storeErrors } = await fetchFromStoreAccounts(
    twitterClient,
    stores,
    fetchedAt,
  );
  errors.push(...storeErrors);

  // Strategy B: broad keyword search
  const searchCursor = await getGiveawaySearchCursor(docClient);
  let searchItems: GiveawayTweetItem[] = [];
  try {
    const { items, highestId } = await fetchFromBroadSearch(twitterClient, fetchedAt, searchCursor);
    searchItems = items;
    if (highestId) {
      await updateGiveawaySearchCursor(docClient, highestId);
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    errors.push({ context: 'broad-search', error });
    console.error(JSON.stringify({ level: 'ERROR', context: 'broad-search', error }));
  }

  // Dedup by tweetId (store items take priority)
  const seen = new Set<string>();
  const allItems: GiveawayTweetItem[] = [];
  for (const item of [...storeItems, ...searchItems]) {
    if (!seen.has(item.tweetId)) {
      seen.add(item.tweetId);
      allItems.push(item);
    }
  }

  // Save to DynamoDB
  const storeAccountTweetsWritten = await saveGiveawayTweets(
    docClient,
    allItems.filter((i) => i.sourceType === 'store'),
  );
  const searchTweetsWritten = await saveGiveawayTweets(
    docClient,
    allItems.filter((i) => i.sourceType === 'search'),
  );

  const result: FetchGiveawayRunResult = {
    runAt,
    storeAccountTweetsWritten,
    searchTweetsWritten,
    errors,
  };
  console.log(JSON.stringify({ level: 'INFO', ...result }));
  return result;
};
