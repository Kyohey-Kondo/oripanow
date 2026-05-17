import type { Metadata } from 'next';
import { Orbitron, Noto_Sans_JP } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import { Footer } from './components/Footer';
import { A8ProductAd } from './components/A8ProductAd';
import { FloatingAdBanner } from './components/FloatingAdBanner';
import { PromoBar } from './components/PromoBar';

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
        <PromoBar />
        {children}
        <A8ProductAd />
        <FloatingAdBanner />
        <Footer />
      </body>
      {gaId && process.env.NODE_ENV === 'production' && <GoogleAnalytics gaId={gaId} />}
    </html>
  );
}
