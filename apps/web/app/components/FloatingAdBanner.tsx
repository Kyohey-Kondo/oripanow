'use client';

import { useState } from 'react';
import styles from './FloatingAdBanner.module.css';

export function FloatingAdBanner() {
  const [closed, setClosed] = useState(false);

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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <a href="https://px.a8.net/svt/ejp?a8mat=4B1THW+4QVFEA+5I52+5ZMCH" rel="nofollow">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          width={100}
          height={60}
          alt=""
          src="https://www27.a8.net/svt/bgt?aid=260425364287&wid=001&eno=01&mid=s00000025679001006000&mc=1"
          style={{ display: 'block', width: 200, height: 120, border: 0 }}
        />
      </a>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        style={{ border: 0 }}
        width={1}
        height={1}
        src="https://www16.a8.net/0.gif?a8mat=4B1THW+4QVFEA+5I52+5ZMCH"
        alt=""
      />
    </div>
  );
}
