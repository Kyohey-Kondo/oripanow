import type { Metadata } from 'next';
import { Icon } from '@iconify/react';
import { Footer } from '../components/Footer';
import { PageNav } from '../components/PageNav';
import {
  getActiveGiveaways,
  VALID_GIVEAWAY_SORTS,
  VALID_GIVEAWAY_FILTERS,
} from '../../lib/giveaways';
import type { GiveawaySortOption, GiveawayFilterOption } from '../../lib/giveaways';
import { GiveawayCard } from './components/GiveawayCard';
import { GiveawaySortFilterToolbar } from './components/GiveawaySortFilterToolbar';
import styles from './giveaway.module.css';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://oripanow.app';
const OG_IMAGE = [{ url: '/og-image.png', width: 1200, height: 630 }];

export const metadata: Metadata = {
  title: 'ポケカ プレゼント企画まとめ',
  description: 'Twitterで開催中のポケモンカードプレゼント企画・懸賞を自動収集。景品内容（BOX・シングルカード）、応募条件、締め切り日を一覧表示。',
  alternates: { canonical: `${BASE_URL}/giveaway` },
  openGraph: {
    title: 'ポケカ プレゼント企画まとめ | オリパなう',
    description: 'Twitterで開催中のポケモンカードプレゼント企画・懸賞を自動収集。景品内容（BOX・シングルカード）、応募条件、締め切り日を一覧表示。',
    images: OG_IMAGE,
  },
  twitter: {
    title: 'ポケカ プレゼント企画まとめ | オリパなう',
    description: 'Twitterで開催中のポケモンカードプレゼント企画・懸賞を自動収集。',
    images: OG_IMAGE,
  },
};

export default async function GiveawayPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; filter?: string }>;
}) {
  const { sort: rawSort, filter: rawFilter } = await searchParams;

  const sort: GiveawaySortOption =
    rawSort && VALID_GIVEAWAY_SORTS.includes(rawSort as GiveawaySortOption)
      ? (rawSort as GiveawaySortOption)
      : 'deadline_asc';

  const filter: GiveawayFilterOption | undefined =
    rawFilter && VALID_GIVEAWAY_FILTERS.includes(rawFilter as GiveawayFilterOption)
      ? (rawFilter as GiveawayFilterOption)
      : undefined;

  const giveaways = await getActiveGiveaways(filter, sort);

  return (
    <div className={styles.page}>
      <p className={styles.promoDisclosure}>※ 本サイトはアフィリエイト広告を含む場合があります</p>

      <header className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>🎁</div>
          <a href="/oripa" className={styles.logoText}>オリパなう</a>
        </div>
        <div className={styles.pageTitle}>プレゼント企画まとめ</div>
      </header>
      <PageNav current="giveaway" />

      <main className={styles.main}>
        <GiveawaySortFilterToolbar currentSort={sort} currentFilter={filter} />

        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>ACTIVE GIVEAWAYS</div>
          <div className={styles.countBadge}>{giveaways.length}件</div>
        </div>

        {giveaways.length > 0 ? (
          <div className={styles.cardsGrid}>
            {giveaways.map((g) => (
              <GiveawayCard key={g.postId} giveaway={g} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <Icon icon="heroicons:gift" width={32} height={32} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p>現在受付中のプレゼント企画はありません</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
