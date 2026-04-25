type AdBannerProps = {
  href: string;
  imgSrc: string;
  trackingSrc: string;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
};

export function AdBanner({ href, imgSrc, trackingSrc, width = 300, height = 250, style }: AdBannerProps) {
  return (
    <div style={{ textAlign: 'center', ...style }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <a href={href} rel="nofollow">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img style={{ border: 0 }} width={width} height={height} alt="" src={imgSrc} />
      </a>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img style={{ border: 0 }} width={1} height={1} src={trackingSrc} alt="" />
    </div>
  );
}
