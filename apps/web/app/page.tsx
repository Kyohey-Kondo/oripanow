import { STUB_ORIPA_POSTS } from '../src/stubs/oripa-posts';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const posts = STUB_ORIPA_POSTS;

  return (
    <main>
      <h1>Oripa Sale Information</h1>
      {posts.length === 0 ? (
        <p>No sale information available.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
              <th style={{ padding: '8px' }}>Store</th>
              <th style={{ padding: '8px' }}>Product</th>
              <th style={{ padding: '8px' }}>Sale Date</th>
              <th style={{ padding: '8px' }}>Price</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px' }}>{post.storeName}</td>
                <td style={{ padding: '8px' }}>{post.productName}</td>
                <td style={{ padding: '8px' }}>{post.saleDate}</td>
                <td style={{ padding: '8px' }}>¥{post.price.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
