import { getTodayOnSalePosts } from '../lib/posts';

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

  const activeBtn: React.CSSProperties = { background: '#333', color: '#fff', padding: '6px 14px', borderRadius: '4px', textDecoration: 'none', fontWeight: 'bold' };
  const inactiveBtn: React.CSSProperties = { background: '#eee', color: '#333', padding: '6px 14px', borderRadius: '4px', textDecoration: 'none' };

  return (
    <main>
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
    </main>
  );
}
