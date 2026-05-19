'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import styles from './PromoBar.module.css';

export function PromoBar() {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);
  const scriptLoaded = useRef(false);

  useEffect(() => {
    if (dismissed || pathname === '/invitation' || scriptLoaded.current) return;
    scriptLoaded.current = true;

    const script1 = document.createElement('script');
    script1.type = 'text/javascript';
    script1.src = '//statics.a8.net/ad/ad.js';
    script1.onload = () => {
      const script2 = document.createElement('script');
      script2.type = 'text/javascript';
      script2.textContent = `a8adscript('body').showAd({"req":{"mat":"4B1THW+4QVFEA+5I52+BWGDT","alt":"商品リンク","id":"4AguhTp-g7-vjYMzr5"},"goods":{"ejp":"h"+"ttps://orikuji.com/gacha/pokemon/ga0011_202603_576_2","imu":"h"+"ttps://media.orikuji.com/gacha/ga0011_202603_576_thumb.webp"}});`;
      document.body.appendChild(script2);
    };
    document.body.appendChild(script1);
  }, [dismissed, pathname]);

  if (pathname === '/invitation' || dismissed) return null;

  return (
    <div className={styles.bar}>
      <div className={styles.adContainer}>
        <span className="a8ad 4AguhTp-g7-vjYMzr5"></span>
      </div>
      <button
        className={styles.close}
        onClick={() => setDismissed(true)}
        aria-label="閉じる"
      >
        ✕
      </button>
    </div>
  );
}
