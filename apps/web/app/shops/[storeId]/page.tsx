import Script from 'next/script';
import { Icon } from '@iconify/react';
import { getShopPosts } from '../../../lib/posts';
import styles from '../../page.module.css';

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

function tweetIdToDate(tweetId: string): Date {
  const TWITTER_EPOCH = 1288834974657n;
  return new Date(Number((BigInt(tweetId) >> 22n) + TWITTER_EPOCH));
}

export default async function ShopPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  const { summaries, storeName } = await getShopPosts(storeId);

  const top3 = summaries
    .filter((s, i, arr) => arr.findIndex((x) => x.tweetId === s.tweetId) === i)
    .slice(0, 3);
  const oEmbeds = await Promise.all(top3.map((s) => fetchOEmbed(s.twitterUsername, s.tweetId)));

  return (
    <main className={styles.main}>
      <p style={{ marginBottom: '8px' }}>
        <a href="/" style={{ color: '#555', textDecoration: 'none' }}>← トップへ戻る</a>
      </p>
      <h1>{storeName || 'ショップ詳細'}</h1>
      <div className={styles.contentLayout}>
        <div className={styles.tableColumn}>
          {summaries.length === 0 ? (
            <p style={{ color: '#666' }}>この店舗の直近14日間の情報はありません。</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
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
