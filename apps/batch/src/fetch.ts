import { TwitterApi, type TweetV2 } from 'twitter-api-v2';
import type { StoreItem } from '@oripa-now/db';

const TWEET_KEYWORDS = (process.env.TWEET_KEYWORDS ?? 'オリパ,おりぱ,oripa,ORIPA,オリジナルパック,オリパ在庫,ブロックオリパ,mystery pack,mystery box,custom pack,blind pack,gacha pack')
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean);

const GAME_KEYWORDS = (process.env.GAME_KEYWORDS ?? 'ポケカ,ポケモンカード,ポケモン,Pokemon,Pokémon,PTCG,PKM')
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean);

function buildQuery(username: string): string {
  const oripaClause = TWEET_KEYWORDS.map((k) => `"${k}"`).join(' OR ');
  const gameClause = GAME_KEYWORDS.map((k) => `"${k}"`).join(' OR ');
  return `from:${username} (${oripaClause}) (${gameClause}) -is:retweet`;
}

/**
 * Fetch recent tweets from a store's Twitter account that match oripa keywords.
 * Uses since_id (lastFetchedTweetId) when available to avoid re-fetching known tweets.
 */
export async function fetchTweetsForStore(
  client: TwitterApi,
  store: StoreItem,
  sinceId?: string,
): Promise<TweetV2[]> {
  const query = buildQuery(store.twitterUsername);

  const params: Parameters<typeof client.v2.search>[1] = {
    max_results: 100,
    'tweet.fields': ['created_at', 'author_id', 'id'],
  };

  if (sinceId) {
    // since_id and start_time cannot be used together (Twitter API returns 400)
    params.since_id = sinceId;
  } else {
    params.start_time = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  }

  console.log(JSON.stringify({ level: 'DEBUG', query, params }));
  const paginator = await client.v2.search(query, params);
  return paginator.data.data ?? [];
}
