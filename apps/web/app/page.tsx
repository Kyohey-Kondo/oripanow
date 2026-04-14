import { getTodayOnSalePosts } from '../lib/posts';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const summaries = await getTodayOnSalePosts();

  return (
    <main>
      <h1>Oripa Sale Information</h1>
      <p style={{ color: '#666', marginBottom: '16px' }}>
        Most recent available info per store — sorted by newest sale date
      </p>
      {summaries.length === 0 ? (
        <p>No stores with available stock in the last 14 days.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
              <th style={{ padding: '8px' }}>Store</th>
              <th style={{ padding: '8px' }}>Sale Date</th>
              <th style={{ padding: '8px' }}>Analyzed At</th>
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
                  {new Date(s.createdAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
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
