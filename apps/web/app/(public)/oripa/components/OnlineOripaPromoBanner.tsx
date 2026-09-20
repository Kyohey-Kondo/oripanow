import { getActiveOnlineOripaItems } from '@/lib/online-oripa';
import { TrackedLink } from '@/app/components/TrackedLink';
import styles from '../oripa.module.css';

export async function OnlineOripaPromoBanner() {
  const { items } = await getActiveOnlineOripaItems();
  const thumbnail = items.length > 0 ? items[Math.floor(Math.random() * items.length)] : null;

  return (
    <TrackedLink
      href="/oripa/online"
      target="_blank"
      rel="noopener"
      className={styles.onlineOripaPromo}
      eventName="internal_nav_click"
      eventParams={{ link_url: '/oripa/online', location: 'oripa_top_promo' }}
    >
      {thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbnail.imageUrl} alt="" className={styles.onlineOripaPromoThumb} loading="lazy" />
      ) : (
        <span className={styles.onlineOripaPromoIcon}>🛒</span>
      )}
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
