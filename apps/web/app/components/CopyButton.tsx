'use client';

import { useState } from 'react';
import styles from './CopyButton.module.css';

export function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button className={styles.button} onClick={handleCopy} aria-label="コードをコピー">
      {copied ? '✓ コピー済み' : 'コピー'}
    </button>
  );
}
