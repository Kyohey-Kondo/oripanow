import styles from './Footer.module.css';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.disclaimer}>
          本サービスは X (Twitter) の公開ポストを独自に収集・表示しています。各店舗の公式情報は直接ご確認ください。
        </p>
        <nav className={styles.links}>
          <a href="/privacy-policy">プライバシーポリシー</a>
        </nav>
        <p className={styles.copyright}>© {year} tacos / オリパなう</p>
      </div>
    </footer>
  );
}
