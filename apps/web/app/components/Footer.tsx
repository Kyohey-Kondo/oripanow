import styles from './Footer.module.css';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <nav className={styles.links}>
          <a href="/oripa">オリパなう</a>
          <a href="/giveaway">プレゼント企画</a>
          <a href="/privacy-policy" target="_blank" rel="noopener noreferrer">プライバシーポリシー</a>
        </nav>
        <p className={styles.copyright}>© {year} tacos / オリパなう</p>
      </div>
    </footer>
  );
}
