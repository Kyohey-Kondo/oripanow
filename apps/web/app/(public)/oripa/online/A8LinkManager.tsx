'use client';

import Script from 'next/script';

// A8.net リンクマネージャー: ページ内の出リンクをスキャンし、参加承認済み広告主
// (オリくじ等)宛てのリンクをクリック時に自動でA8計測リンクへ変換する。
// config_id はA8マイページで発行されたアカウント固有の識別子(非シークレット)。
const A8_LINK_MANAGER_CONFIG_ID = 'mxyXMArBZWD3H24L2ST7';

declare global {
  interface Window {
    a8linkmgr?: (config: { config_id: string }) => void;
  }
}

export function A8LinkManager() {
  return (
    <Script
      src="https://statics.8me.jp/a8link/a8linkmgr.js"
      strategy="afterInteractive"
      onLoad={() => {
        window.a8linkmgr?.({ config_id: A8_LINK_MANAGER_CONFIG_ID });
      }}
    />
  );
}
