'use client';

import { useState, useEffect } from 'react';
import Script from 'next/script';
import styles from './FloatingAdBanner.module.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const showAd = () => (window as any).a8adscript?.('body').showAd({
  req: { mat: '4B1THW+4QVFEA+5I52+BWGDT', alt: '商品リンク', id: '4AguhTp-g7-vjYMzr5' },
  goods: {
    ejp: 'h' + 'ttps://orikuji.com/gacha/pokemon/ga0011_202603_576_2',
    imu: 'h' + 'ttps://media.orikuji.com/gacha/ga0011_202603_576_thumb.webp',
  },
});

export function FloatingAdBanner() {
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    // ad.js が A8ProductAd によって既にロード済みの場合は即呼び出す
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).a8adscript) showAd();
  }, []);

  if (closed) return null;

  return (
    <div className={styles.wrapper}>
      <button
        onClick={() => setClosed(true)}
        aria-label="広告を閉じる"
        style={{
          position: 'absolute',
          top: -10,
          right: -10,
          width: 22,
          height: 22,
          borderRadius: '50%',
          border: 'none',
          background: '#333',
          color: '#fff',
          fontSize: 12,
          lineHeight: '22px',
          textAlign: 'center',
          cursor: 'pointer',
          padding: 0,
          zIndex: 1,
        }}
      >
        ×
      </button>
      <span className="a8ad 4AguhTp-g7-vjYMzr5"></span>
      <Script
        src="//statics.a8.net/ad/ad.js"
        strategy="lazyOnload"
        onLoad={showAd}
      />
    </div>
  );
}
