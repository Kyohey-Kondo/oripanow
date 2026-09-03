'use client';

import { trackEvent } from '@/lib/gtag';

type AdBannerProps = {
  href: string;
  imgSrc: string;
  trackingSrc: string;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
  location?: string;
};

export function AdBanner({ href, imgSrc, trackingSrc, width = 300, height = 250, style, location }: AdBannerProps) {
  return (
    <div style={{ textAlign: 'center', ...style }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <a
        href={href}
        target="_blank"
        rel="nofollow noopener"
        onClick={() => trackEvent('affiliate_ad_click', { link_url: href, location: location ?? 'unknown' })}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img style={{ border: 0 }} width={width} height={height} alt="" src={imgSrc} />
      </a>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img style={{ border: 0 }} width={1} height={1} src={trackingSrc} alt="" />
    </div>
  );
}
