import type { Metadata } from 'next';
import { GoogleAnalytics } from '@next/third-parties/google';
import { Footer } from './components/Footer';
import { AdBanner } from './components/AdBanner';

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
        <AdBanner
          href="https://px.a8.net/svt/ejp?a8mat=4B1THW+97114I+5G0Y+5Z6WX"
          imgSrc="https://www21.a8.net/svt/bgt?aid=260425364556&wid=001&eno=01&mid=s00000025405001004000&mc=1"
          trackingSrc="https://www13.a8.net/0.gif?a8mat=4B1THW+97114I+5G0Y+5Z6WX"
          style={{ padding: '24px 0' }}
        />
        <Footer />
      </body>
      {gaId && process.env.NODE_ENV === 'production' && <GoogleAnalytics gaId={gaId} />}
    </html>
  );
}
