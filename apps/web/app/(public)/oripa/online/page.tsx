import type { Metadata } from 'next';
import { getActiveOnlineOripaItems } from '@/lib/online-oripa';
import { A8LinkManager } from './A8LinkManager';
import { OnlineOripaCard } from './OnlineOripaCard';
import styles from './online.module.css';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://oripanow.app';

export const metadata: Metadata = {
  title: 'オンラインオリパ | ORIPA NOW',
  description: 'オンラインオリパサイトで販売中のポケモンカードオリパをサムネイルで一覧表示。',
  alternates: { canonical: `${BASE_URL}/oripa/online` },
};

export default async function OnlineOripaPage() {
  const items = await getActiveOnlineOripaItems();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <a href="/oripa" className={styles.logo}>
          <div className={styles.logoIcon}>🎴</div>
          <div>
            <div className={styles.logoText}>ORIPA NOW</div>
            <h1 className={styles.logoSub}>オンラインオリパ</h1>
          </div>
        </a>
      </header>
      <p className={styles.promoDisclosure}>PR / このページには広告が含まれています。</p>

      <main className={styles.main}>
        {items.length === 0 ? (
          <p className={styles.emptyState}>現在販売中のオンラインオリパはありません。</p>
        ) : (
          <div className={styles.grid}>
            {items.map((item) => (
              <OnlineOripaCard key={item.itemId} item={item} />
            ))}
          </div>
        )}
      </main>

      <A8LinkManager />
    </div>
  );
}
