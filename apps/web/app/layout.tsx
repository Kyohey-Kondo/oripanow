import type { Metadata } from 'next';
import { Orbitron, Noto_Sans_JP } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import { Footer } from './components/Footer';
import { AdBanner } from './components/AdBanner';

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['600', '800'],
  variable: '--font-orbitron',
  display: 'swap',
});

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://oripanow.app'),
  title: {
    default: 'オリパなう',
    template: '%s | オリパなう',
  },
  description: 'ポケモンカードのオリパ最新情報を毎時更新。あたりカード・ラストワン賞情報つき。秋葉原・大宮・川越・浦和美園のオリパ在庫をリアルタイムで確認できます。',
  keywords: ['オリパ', 'ポケモンカード', 'ポケカ', 'あたりカード', 'ラストワン', 'oripa', 'original pack', 'Pokemon card', 'Pokemon', 'Japanese oripa', 'Pokemon oripa', 'Pokemon original pack', '秋葉原', '大宮', '川越', '浦和美園'],
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    siteName: 'オリパなう',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="ja" className={`${orbitron.variable} ${notoSansJP.variable}`}>
      <body style={{ fontFamily: 'var(--font-body, sans-serif)', margin: 0, overflowX: 'hidden' }}>
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
