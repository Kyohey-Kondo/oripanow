import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { INVITATION_CODES } from '@/lib/invitation-codes';
import { CopyButton } from '@/app/components/CopyButton';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: '招待コード一覧',
  description: '各オリパサイトの招待コード・紹介コードをまとめています。お得なボーナスを受け取ってオリパを楽しもう。',
};

export default function InvitationPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/oripa" className={styles.headerLogo}>
          <div className={styles.headerIcon}>
            <Icon icon="mdi:cards-playing" width={18} height={18} />
          </div>
          <span className={styles.headerLogoText}>ORIPA NOW</span>
        </Link>
        <Link href="/oripa" className={styles.backLink}>
          ← トップへ戻る
        </Link>
      </header>
      <p className={styles.promoDisclosure}>本サイトはプロモーションを含みます。</p>
      <div className={styles.container}>
        <h1 className={styles.title}>🎁 招待コード一覧</h1>
        <p className={styles.lead}>
          各オリパサイトの招待コード・紹介コードをまとめています。
          登録時に入力するとお得なボーナスがもらえます。
        </p>

        {INVITATION_CODES.length === 0 ? (
          <p className={styles.empty}>現在登録されているサイトはありません。</p>
        ) : (
          <ul className={styles.list}>
            {INVITATION_CODES.map((entry) => (
              <li key={entry.siteName} className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.siteName}>{entry.siteName}</span>
                  {entry.description && (
                    <span className={styles.description}>{entry.description}</span>
                  )}
                </div>
                {entry.banner && (
                  <div className={styles.banner}>
                    <a
                      href={entry.banner.linkUrl}
                      target="_blank"
                      rel="nofollow noopener noreferrer"
                    >
                      <img
                        src={entry.banner.imageUrl}
                        width={entry.banner.width}
                        height={entry.banner.height}
                        alt={entry.siteName}
                        style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
                      />
                    </a>
                    <img
                      src={entry.banner.trackingPixelUrl}
                      width={1}
                      height={1}
                      alt=""
                      style={{ display: 'none' }}
                    />
                  </div>
                )}
                {entry.invitationCode !== undefined && (
                  <div className={styles.codeRow}>
                    <span className={styles.codeLabel}>招待コード</span>
                    <span className={styles.code}>{entry.invitationCode}</span>
                    {entry.invitationCode && <CopyButton code={entry.invitationCode} />}
                  </div>
                )}
                {entry.siteUrl && (
                  <a
                    href={entry.siteUrl}
                    target="_blank"
                    rel="nofollow noopener noreferrer"
                    className={styles.siteLink}
                  >
                    サイトへ →
                  </a>
                )}
                {entry.trackingPixelUrl && (
                  <img
                    src={entry.trackingPixelUrl}
                    width={1}
                    height={1}
                    alt=""
                    style={{ display: 'none' }}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
