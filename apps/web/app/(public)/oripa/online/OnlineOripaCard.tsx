'use client';

import { trackEvent } from '@/lib/gtag';
import type { OnlineOripaCardData } from '@/lib/online-oripa';
import styles from './online.module.css';

export function OnlineOripaCard({ item }: { item: OnlineOripaCardData }) {
  return (
    <a
      href={item.productUrl}
      target="_blank"
      rel="nofollow noopener"
      className={styles.card}
      onClick={() => trackEvent('affiliate_ad_click', { link_url: item.productUrl, location: 'online_oripa_grid' })}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.imageUrl} alt="" className={styles.thumbnail} loading="lazy" />
      <span className={styles.providerLabel}>{item.providerLabel}</span>
    </a>
  );
}
