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
      <a href="https://px.a8.net/svt/ejp?a8mat=4BA398+13W2B6+5CJO+BXIYP" rel="nofollow">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img width={300} height={250} alt="" src="https://www23.a8.net/svt/bgt?aid=260811260067&wid=001&eno=01&mid=s00000024954002004000&mc=1" style={{ border: 0 }} />
      </a>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img width={1} height={1} src="https://www12.a8.net/0.gif?a8mat=4BA398+13W2B6+5CJO+BXIYP" alt="" style={{ border: 0 }} />
    </div>
  );
}
