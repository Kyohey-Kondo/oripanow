import Script from 'next/script';
import { Icon } from '@iconify/react';
import { getTodayOnSalePosts } from '../lib/posts';
import styles from './page.module.css';

async function fetchOEmbed(twitterUsername: string, tweetId: string): Promise<string | null> {
  try {
    const tweetUrl = `https://twitter.com/${twitterUsername}/status/${tweetId}`;
    const url = `https://publish.twitter.com/oembed?url=${encodeURIComponent(tweetUrl)}&omit_script=true`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = await res.json() as { html: string };
    return data.html;
  } catch {
    return null;
  }
}

export const dynamic = 'force-dynamic';

/** Derive tweet timestamp from Twitter snowflake ID. */
function tweetIdToDate(tweetId: string): Date {
  const TWITTER_EPOCH = 1288834974657n;
  return new Date(Number((BigInt(tweetId) >> 22n) + TWITTER_EPOCH));
}

const AREA_LABELS: Record<string, string> = {
  akihabara:   '秋葉原',
  kawagoe:     '川越',
  omiya:       '大宮',
  urawamisono: '浦和美園',
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  const { area } = await searchParams;
  const summaries = await getTodayOnSalePosts(area);

  // Top 3 unique tweets for oEmbed previews
  const top3 = summaries
    .filter((s, i, arr) => arr.findIndex((x) => x.tweetId === s.tweetId) === i)
    .slice(0, 3);
  const oEmbeds = await Promise.all(top3.map((s) => fetchOEmbed(s.twitterUsername, s.tweetId)));

  const activeBtn: React.CSSProperties = { background: '#333', color: '#fff', padding: '6px 14px', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold' };
  const inactiveBtn: React.CSSProperties = { background: '#eee', color: '#333', padding: '6px 14px', borderRadius: '4px', textDecoration: 'none' };

  return (
    <main className={styles.main}>
      <h1>Oripa Sale Information</h1>
      <p style={{ color: '#666', marginBottom: '12px' }}>
        Most recent available info per store — sorted by newest sale date
      </p>
      <div className={styles.contentLayout}>
        <div className={styles.tableColumn}>
          <nav style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <a href="/" style={!area ? activeBtn : inactiveBtn}>すべて</a>
            {Object.entries(AREA_LABELS).map(([key, label]) => (
              <a key={key} href={`/?area=${key}`} style={area === key ? activeBtn : inactiveBtn}>{label}</a>
            ))}
          </nav>
          {summaries.length === 0 ? (
            <p>No stores with available stock in the last 14 days.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>店舗名</th>
                  <th style={{ padding: '8px' }}>ツイート日時</th>
                  <th style={{ padding: '8px' }}>価格</th>
                  <th style={{ padding: '8px' }}>在庫数</th>
                  <th style={{ padding: '8px' }}>ツイート</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((s) => (
                  <tr key={s.postId} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px' }}>
                      <a href={`/shops/${s.storeId}`} style={{ textDecoration: 'underline', textDecorationColor: '#aaa', color: 'inherit' }}>
                        {s.storeName.length > 20 ? s.storeName.slice(0, 20) + '…' : s.storeName}
                      </a>
                    </td>
                    <td style={{ padding: '8px' }}>
                      {tweetIdToDate(s.tweetId).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
                    </td>
                    <td style={{ padding: '8px' }}>
                      {s.price !== undefined ? `¥${s.price.toLocaleString()}` : '—'}
                    </td>
                    <td style={{ padding: '8px' }}>
                      {s.stockCount !== undefined ? s.stockCount : '—'}
                    </td>
                    <td style={{ padding: '8px' }}>
                      <a href={`https://x.com/i/web/status/${s.tweetId}`} target="_blank" rel="noopener noreferrer">
                        <Icon icon="ri:twitter-x-fill" width={16} height={16} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {oEmbeds.some(Boolean) && (
          <aside className={styles.tweetSidebar}>
            <div className={styles.tweetList}>
              {oEmbeds.map((html, i) =>
                html ? (
                  <div key={top3[i].tweetId}
                    style={{ zoom: 0.75 }}
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                ) : null
              )}
            </div>
          </aside>
        )}
      </div>
      <Script src="https://platform.twitter.com/widgets.js" strategy="lazyOnload" />
    </main>
  );
}
