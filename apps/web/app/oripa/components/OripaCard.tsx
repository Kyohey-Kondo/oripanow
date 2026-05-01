import type { OripaPostSummary } from '@oripa-now/types';
import { Icon } from '@iconify/react';
import styles from '../oripa.module.css';

type PriceTier = 'high' | 'mid' | 'low' | 'unknown';

function getPriceTier(price?: number): PriceTier {
  if (price === undefined) return 'unknown';
  if (price >= 10000) return 'high';
  if (price >= 5000) return 'mid';
  return 'low';
}

const TOP_BAR_CLASS: Record<PriceTier, string> = {
  high:    styles.cardTopBarHigh,
  mid:     styles.cardTopBarMid,
  low:     styles.cardTopBarLow,
  unknown: styles.cardTopBarUnknown,
};

const PRICE_CLASS: Record<PriceTier, string> = {
  high:    styles.priceHigh,
  mid:     styles.priceMid,
  low:     styles.priceLow,
  unknown: styles.priceUnknown,
};

const AREA_LABELS: Record<string, string> = {
  akihabara: '秋葉原',
  kawagoe:   '川越',
  omiya:     '大宮',
  ikebukuro: '池袋',
};

function formatAtariCards(cards: string[]): string {
  if (cards.length <= 3) return cards.join(' / ');
  return cards.slice(0, 3).join(' / ') + ` … (+${cards.length - 3})`;
}

type Props = {
  post: OripaPostSummary;
  tweetTimestamp: string;
};

export function OripaCard({ post, tweetTimestamp }: Props) {
  const tier = getPriceTier(post.price);
  const hasAwards = post.lastOnePrizeName || (post.atariCards && post.atariCards.length > 0);
  const areaLabel = post.area ? (AREA_LABELS[post.area] ?? post.area) : '';

  return (
    <div className={styles.card}>
      <div className={`${styles.cardTopBar} ${TOP_BAR_CLASS[tier]}`} />
      <div className={styles.cardBody}>
        <div className={styles.cardShopRow}>
          <a
            href={`/oripa/shops/${post.storeId}`}
            className={styles.shopName}
          >
            <Icon icon="heroicons:building-storefront" width={13} height={13} style={{ flexShrink: 0 }} /> {post.storeName}
          </a>
          <div className={styles.postTime}>{tweetTimestamp}</div>
        </div>

        <div className={styles.priceRow}>
          <div className={PRICE_CLASS[tier]}>
            {post.price != null ? `¥${post.price.toLocaleString()}` : '—'}
          </div>
          <div className={styles.stockPill}>
            <Icon icon="mdi:package-variant-closed" width={13} height={13} />
            {post.stockCount !== undefined ? `${post.stockCount}口` : '—'}
          </div>
        </div>

        {hasAwards ? (
          <div className={styles.awardsSection}>
            {post.lastOnePrizeName && (
              <div className={styles.awardRow}>
                <div className={styles.awardLabelLast}>ラスト</div>
                <div className={styles.awardCards}>{post.lastOnePrizeName}</div>
              </div>
            )}
            {post.atariCards && post.atariCards.length > 0 && (
              <div className={styles.awardRow}>
                <div className={styles.awardLabelHit}>あたり</div>
                <div className={styles.awardCards}>{formatAtariCards(post.atariCards)}</div>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.noInfo}>当たり・ラストワン情報なし</div>
        )}
      </div>

      <div className={styles.cardFooter}>
        {areaLabel && <div className={styles.areaTag}>{areaLabel}</div>}
        <a
          className={styles.tweetBtn}
          href={`https://x.com/${post.twitterUsername}/status/${post.tweetId}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon icon="ri:twitter-x-fill" width={13} height={13} /> ポストを見る
        </a>
      </div>
    </div>
  );
}
