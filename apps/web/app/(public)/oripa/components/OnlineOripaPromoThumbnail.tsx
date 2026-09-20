'use client';

import { useEffect, useState } from 'react';
import styles from '../oripa.module.css';

export function OnlineOripaPromoThumbnail() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/online-oripa/random-thumbnail', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: { imageUrl: string | null }) => {
        if (!cancelled) setImageUrl(data.imageUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!imageUrl) {
    return <span className={styles.onlineOripaPromoIcon}>🛒</span>;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={imageUrl} alt="" className={styles.onlineOripaPromoThumb} loading="lazy" />;
}
