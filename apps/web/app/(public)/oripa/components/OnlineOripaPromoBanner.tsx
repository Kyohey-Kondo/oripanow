import { TrackedLink } from '@/app/components/TrackedLink';
import styles from '../oripa.module.css';

export function OnlineOripaPromoBanner() {
  return (
    <TrackedLink
      href="/oripa/online"
      className={styles.onlineOripaPromo}
      eventName="internal_nav_click"
      eventParams={{ link_url: '/oripa/online', location: 'oripa_top_promo' }}
    >
      <span className={styles.onlineOripaPromoIcon}>🛒</span>
      <span className={styles.onlineOripaPromoText}>
        <span className={styles.onlineOripaPromoTitle}>オンラインオリパも配信中</span>
        <span className={styles.onlineOripaPromoSub}>自宅から購入できるオリパをまとめてチェック</span>
      </span>
      <span className={styles.onlineOripaPromoArrow}>→</span>
    </TrackedLink>
  );
}
