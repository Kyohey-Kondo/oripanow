import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { TwitterApi } from 'twitter-api-v2';
import { TABLE_NAMES } from '@oripa-now/db';
import { queryOnSalePostsByDate } from '@oripa-now/db/queries/oripa-posts';

const AREAS = ['akihabara', 'ikebukuro', 'shinjuku', 'kawagoe', 'omiya'] as const;
type Area = (typeof AREAS)[number];

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

function composeTweet(area: Area, count: number): string {
  const label = AREA_LABELS[area];
  const hashtag = AREA_HASHTAGS[area];
  return [
    `【${label}】本日のオリパ情報が${count}件更新されました🎴`,
    '',
    '詳細・最新在庫はプロフィールリンクから👆',
    '',
    `#ポケカ #ポケモン #オリパ ${hashtag}`,
  ].join('\n');
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

      const text = composeTweet(area, posts.length);
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
