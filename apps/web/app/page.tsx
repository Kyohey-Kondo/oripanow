import Script from 'next/script';
import { getTodayOnSalePosts } from '../lib/posts';

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
    <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 32px' }}>
      <h1>Oripa Sale Information</h1>
      <p style={{ color: '#666', marginBottom: '12px' }}>
        Most recent available info per store — sorted by newest sale date
      </p>
      <nav style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <a href="/" style={!area ? activeBtn : inactiveBtn}>すべて</a>
        {Object.entries(AREA_LABELS).map(([key, label]) => (
          <a key={key} href={`/?area=${key}`} style={area === key ? activeBtn : inactiveBtn}>{label}</a>
        ))}
      </nav>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 0', minWidth: 0 }}>
          {summaries.length === 0 ? (
            <p>No stores with available stock in the last 14 days.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Store</th>
                  <th style={{ padding: '8px' }}>Sale Date</th>
                  <th style={{ padding: '8px' }}>Tweeted At</th>
                  <th style={{ padding: '8px' }}>Price</th>
                  <th style={{ padding: '8px' }}>Stock</th>
                  <th style={{ padding: '8px' }}>Tweet</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((s) => (
                  <tr key={s.postId} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px' }}>{s.storeName}</td>
                    <td style={{ padding: '8px' }}>{s.saleAt}</td>
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
                      <a href={`https://x.com/i/web/status/${s.tweetId}`} target="_blank" rel="noopener noreferrer">🔗</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {oEmbeds.some(Boolean) && (
          <aside style={{ width: '285px', flexShrink: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
