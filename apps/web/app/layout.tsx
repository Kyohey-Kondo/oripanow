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
  return (
    <html lang="ja">
      <body style={{ fontFamily: 'sans-serif', margin: 0, overflowX: 'hidden' }}>
        {children}
      </body>
      <GoogleAnalytics gaId="G-5RNYDB76T7" />
    </html>
  );
}
