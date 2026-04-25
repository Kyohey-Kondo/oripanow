import type { Metadata } from 'next';
import { GoogleAnalytics } from '@next/third-parties/google';

export const metadata: Metadata = {
  title: 'Oripa Now',
  description: 'Pokemon card oripa sale information aggregator',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="ja">
      <body style={{ fontFamily: 'sans-serif', margin: 0, overflowX: 'hidden' }}>
        {children}
      </body>
      {gaId && process.env.NODE_ENV === 'production' && <GoogleAnalytics gaId={gaId} />}
    </html>
  );
}
