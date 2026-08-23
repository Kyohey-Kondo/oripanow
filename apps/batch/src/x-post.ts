import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { TwitterApi } from 'twitter-api-v2';
import { TABLE_NAMES, type OripaPostItem } from '@oripa-now/db';
import { queryOnSalePostsByDate } from '@oripa-now/db/queries/oripa-posts';

export const AREAS = ['akihabara', 'ikebukuro', 'shinjuku', 'kawagoe', 'omiya'] as const;
export type Area = (typeof AREAS)[number];

const AREA_LABELS: Record<Area, string> = {
  akihabara: '秋葉原',
  ikebukuro: '池袋',
  shinjuku: '新宿',
  kawagoe: '川越',
  omiya: '大宮',
};

const AREA_HASHTAGS: Record<Area, string> = {
  akihabara: '#秋葉原',
  ikebukuro: '#池袋',
  shinjuku: '#新宿',
  kawagoe: '#川越',
  omiya: '#大宮',
};


function getYesterdayJST(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(d)
    .replace(/\//g, '-');
}

// X weighs most non-Latin characters (Japanese kana/kanji, fullwidth punctuation, emoji)
// as 2 toward its 280-character budget. TWEET_SAFE_LIMIT keeps a margin below the hard
// limit so a post is never rejected for length.
export const TWEET_HARD_LIMIT = 280;
export const TWEET_SAFE_LIMIT = 250;

function isWideCodePoint(codePoint: number): boolean {
  return (
    (codePoint >= 0x1100 && codePoint <= 0x115f) || // Hangul Jamo
    (codePoint >= 0x2e80 && codePoint <= 0xa4cf) || // CJK Radicals – Yi
    (codePoint >= 0xac00 && codePoint <= 0xd7a3) || // Hangul Syllables
    (codePoint >= 0xf900 && codePoint <= 0xfaff) || // CJK Compatibility Ideographs
    (codePoint >= 0xfe30 && codePoint <= 0xfe4f) || // CJK Compatibility Forms
    (codePoint >= 0xff00 && codePoint <= 0xff60) || // Fullwidth Forms
    (codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
    (codePoint >= 0x1f300 && codePoint <= 0x1faff) || // Emoji
    (codePoint >= 0x20000 && codePoint <= 0x3fffd) // CJK Extension B+
  );
}

export function weightedLength(text: string): number {
  let length = 0;
  for (const char of text) {
    length += isWideCodePoint(char.codePointAt(0) ?? 0) ? 2 : 1;
  }
  return length;
}

type StoreHighlight = {
  storeName: string;
  atariCards: string[];
  lastOnePrizeName?: string;
};

// Merge per-post 当たり枠 (atariCards) / ラストワン賞 (lastOnePrizeName) by store, deduping cards.
function buildHighlights(posts: OripaPostItem[]): StoreHighlight[] {
  const byStore = new Map<string, StoreHighlight>();
  for (const post of posts) {
    if (!post.atariCards?.length && !post.lastOnePrizeName) continue;
    const highlight = byStore.get(post.storeName) ?? { storeName: post.storeName, atariCards: [] };
    for (const card of post.atariCards ?? []) {
      if (!highlight.atariCards.includes(card)) highlight.atariCards.push(card);
    }
    if (post.lastOnePrizeName && !highlight.lastOnePrizeName) {
      highlight.lastOnePrizeName = post.lastOnePrizeName;
    }
    byStore.set(post.storeName, highlight);
  }
  return [...byStore.values()];
}

function formatHighlightLine(highlight: StoreHighlight): string {
  const parts: string[] = [];
  if (highlight.atariCards.length > 0) {
    parts.push(`当たり枠:${highlight.atariCards.slice(0, 2).join('・')}`);
  }
  if (highlight.lastOnePrizeName) {
    parts.push(`ラストワン賞:${highlight.lastOnePrizeName}`);
  }
  return `・${highlight.storeName} ${parts.join(' / ')}`;
}

export function composeTweet(area: Area, posts: OripaPostItem[]): string {
  const label = AREA_LABELS[area];
  const hashtag = AREA_HASHTAGS[area];
  const header = `【${label}】本日のオリパ情報が${posts.length}件更新されました🎴`;
  const footer = ['詳細・最新在庫はプロフィールリンクから👆', '', `#ポケカ #ポケモン #オリパ ${hashtag}`].join('\n');
  const highlightLines = buildHighlights(posts).map(formatHighlightLine);

  const assemble = (includedCount: number): string => {
    const included = highlightLines.slice(0, includedCount);
    const omitted = highlightLines.length - includedCount;
    const lines = included.length > 0 ? [header, '', ...included] : [header];
    if (omitted > 0) lines.push(`ほか${omitted}件`);
    return [...lines, '', footer].join('\n');
  };

  // Start with every highlight and drop the least important (last) one at a time
  // until the tweet fits comfortably under the safe limit.
  let includedCount = highlightLines.length;
  while (includedCount > 0 && weightedLength(assemble(includedCount)) > TWEET_SAFE_LIMIT) {
    includedCount--;
  }

  return assemble(includedCount);
}

export type PostRunResult = {
  runAt: string;
  date: string;
  tweetsPosted: number;
  areasSkipped: number;
  errors: Array<{ area: string; error: string }>;
};

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event: { date?: string } = {}): Promise<PostRunResult> => {
  const runAt = new Date().toISOString();
  const date = event.date ?? getYesterdayJST();
  const errors: PostRunResult['errors'] = [];
  let tweetsPosted = 0;
  let areasSkipped = 0;

  const twitterClient = new TwitterApi({
    appKey: process.env.X_API_KEY ?? '',
    appSecret: process.env.X_API_SECRET ?? '',
    accessToken: process.env.X_ACCESS_TOKEN ?? '',
    accessSecret: process.env.X_ACCESS_TOKEN_SECRET ?? '',
  });

  for (const area of AREAS) {
    try {
      const posts = await queryOnSalePostsByDate(docClient, TABLE_NAMES.oripaPosts, area, date);

      if (posts.length === 0) {
        areasSkipped++;
        console.log(JSON.stringify({ level: 'INFO', area, message: 'No on-sale posts, skipped' }));
        continue;
      }

      const text = composeTweet(area, posts);
      if (weightedLength(text) > TWEET_HARD_LIMIT) {
        throw new Error(`Composed tweet exceeds X length limit (${weightedLength(text)} > ${TWEET_HARD_LIMIT})`);
      }
      await twitterClient.v2.tweet({ text });
      tweetsPosted++;
      console.log(JSON.stringify({ level: 'INFO', area, count: posts.length, message: 'Tweet posted' }));
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      errors.push({ area, error });
      console.error(JSON.stringify({ level: 'ERROR', area, error }));
    }
  }

  const result: PostRunResult = { runAt, date, tweetsPosted, areasSkipped, errors };
  console.log(JSON.stringify({ level: 'INFO', ...result }));
  return result;
};
