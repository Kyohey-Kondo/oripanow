import styles from './PageNav.module.css';

type Props = {
  current: 'oripa' | 'giveaway';
};

export function PageNav({ current }: Props) {
  return (
    <nav className={styles.nav}>
      <a
        href="/oripa"
        className={`${styles.tab} ${current === 'oripa' ? styles.tabActive : ''}`}
      >
        <span className={styles.tabIcon}>🃏</span>
        オリパ情報
      </a>
      <a
        href="/giveaway"
        className={`${styles.tab} ${current === 'giveaway' ? styles.tabActive : ''}`}
      >
        <span className={styles.tabIcon}>🎁</span>
        プレゼント企画
      </a>
    </nav>
  );
}
