import type { Metadata } from 'next';
import { Icon } from '@iconify/react';
import { getActiveOnlineOripaItems, isProviderValue } from '@/lib/online-oripa';
import { A8LinkManager } from './A8LinkManager';
import { OnlineOripaCard } from './OnlineOripaCard';
import { ProviderFilterTabs } from './ProviderFilterTabs';
import styles from './online.module.css';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://oripanow.app';

export const metadata: Metadata = {
  title: 'オンラインオリパ | ORIPA NOW',
  description: 'オンラインオリパサイトで販売中のポケモンカードオリパをサムネイルで一覧表示。',
  alternates: { canonical: `${BASE_URL}/oripa/online` },
};

export default async function OnlineOripaPage({
  searchParams,
}: {
  searchParams: Promise<{ provider?: string }>;
}) {
  const { provider: providerParam } = await searchParams;
  const currentProvider = providerParam && isProviderValue(providerParam) ? providerParam : undefined;

  const { items, lastUpdatedAt } = await getActiveOnlineOripaItems();
  const filteredItems = currentProvider ? items.filter((item) => item.provider === currentProvider) : items;
  const counts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.provider] = (acc[item.provider] ?? 0) + 1;
    return acc;
  }, {});

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
        <div className={styles.headerRight}>
          <a href="/oripa" className={styles.backLink}>
            <Icon icon="heroicons:arrow-left" width={14} height={14} />
            トップへ戻る
          </a>
          {lastUpdatedAt && (
            <p className={styles.lastUpdated}>
              最終更新:{' '}
              {new Date(lastUpdatedAt).toLocaleString('ja-JP', {
                timeZone: 'Asia/Tokyo',
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>
      </header>
      <p className={styles.promoDisclosure}>PR / このページには広告が含まれています。</p>

      <main className={styles.main}>
        {items.length > 0 && (
          <ProviderFilterTabs currentProvider={currentProvider} counts={counts} total={items.length} />
        )}
        {filteredItems.length === 0 ? (
          <p className={styles.emptyState}>
            {items.length === 0
              ? '現在販売中のオンラインオリパはありません。'
              : '該当するオンラインオリパはありません。'}
          </p>
        ) : (
          <div className={styles.grid}>
            {filteredItems.map((item) => (
              <OnlineOripaCard key={item.itemId} item={item} />
            ))}
          </div>
        )}
      </main>

      <A8LinkManager />
    </div>
  );
}
