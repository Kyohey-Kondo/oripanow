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
        <span className={styles.onlineOripaPromoTitleRow}>
          <span className={styles.onlineOripaPromoLive}>
            <span className={styles.liveDot} />
            LIVE
          </span>
          <span className={styles.onlineOripaPromoTitle}>今熱い！オンラインオリパの最新商品を掲載中</span>
        </span>
        <span className={styles.onlineOripaPromoSub}>自宅にいながら挑戦できるオリパをまとめてチェック</span>
      </span>
      <span className={styles.onlineOripaPromoArrow}>→</span>
    </TrackedLink>
  );
}
