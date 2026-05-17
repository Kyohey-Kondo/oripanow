'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import styles from './PromoBar.module.css';

export function PromoBar() {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);

  if (pathname === '/invitation' || dismissed) return null;

  function handleDismiss() {
    setDismissed(true);
  }

  return (
    <div className={styles.bar}>
      <a href="/invitation" target="_blank" rel="noopener noreferrer" className={styles.link}>
        🎁 各オリパサイトの招待コードはこちら
      </a>
      <button
        className={styles.close}
        onClick={handleDismiss}
        aria-label="閉じる"
      >
        ✕
      </button>
    </div>
  );
}
