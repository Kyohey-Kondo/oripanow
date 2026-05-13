'use client';

import Script from 'next/script';
import styles from './A8ProductAd.module.css';

export function A8ProductAd() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.inner}>
        <span className="a8ad 4AguhXK-g7-vjvJVlv"></span>
      </div>
      <Script
        src="//statics.a8.net/ad/ad.js"
        strategy="lazyOnload"
        onLoad={() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).a8adscript('body').showAd({
            req: { mat: '4B1THW+97114I+5G0Y+BWGDT', alt: '商品リンク', id: '4AguhXK-g7-vjvJVlv' },
            goods: {
              ejp: 'h' + 'ttps://www.furu1.online/product/detail/10303075',
              imu: 'h' + 'ttps://www.furu1.online/storage/product/10303075/00.webp',
            },
          });
        }}
      />
    </div>
  );
}
