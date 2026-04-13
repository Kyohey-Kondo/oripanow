import { getTodayOnSalePosts } from '../lib/posts';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const summaries = await getTodayOnSalePosts();

  return (
    <main>
      <h1>Oripa Sale Information</h1>
      <p style={{ color: '#666', marginBottom: '16px' }}>
        Stores with same-day stock — sorted by newest update
      </p>
      {summaries.length === 0 ? (
        <p>No stores with available stock today.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
              <th style={{ padding: '8px' }}>Store</th>
              <th style={{ padding: '8px' }}>Updated At</th>
              <th style={{ padding: '8px' }}>Price</th>
              <th style={{ padding: '8px' }}>Stock</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((s) => (
              <tr key={s.postId} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px' }}>{s.storeName}</td>
                <td style={{ padding: '8px' }}>
                  {new Date(s.createdAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
                </td>
                <td style={{ padding: '8px' }}>
                  {s.price !== undefined ? `¥${s.price.toLocaleString()}` : '—'}
                </td>
                <td style={{ padding: '8px' }}>
                  {s.stockCount !== undefined ? s.stockCount : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
