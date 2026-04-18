import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Oripa Now',
  description: 'Pokemon card oripa sale information aggregator',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body style={{ fontFamily: 'sans-serif', margin: 0, overflowX: 'hidden' }}>
        {children}
      </body>
    </html>
  );
}
