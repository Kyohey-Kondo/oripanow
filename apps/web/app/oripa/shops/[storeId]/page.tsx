import React from 'react';
import { cache } from 'react';
import Script from 'next/script';
import type { Metadata } from 'next';
import { Icon } from '@iconify/react';
import { getShopPosts } from '../../../../lib/posts';
import { tweetIdToDate } from '../../../../lib/tweet-utils';
import { OripaCard } from '../../components/OripaCard';
import styles from '../../oripa.module.css';

const getCachedShopPosts = cache(getShopPosts);

async function fetchOEmbed(twitterUsername: string, tweetId: string): Promise<string | null> {
  try {
    const tweetUrl = `https://twitter.com/${twitterUsername}/status/${tweetId}`;
    const url = `https://publish.twitter.com/oembed?url=${encodeURIComponent(tweetUrl)}&omit_script=true`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = await res.json() as { html: string };
    return data.html;
  } catch {
    return null;
  }
}

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;
const MAX_PAGES = 3;

const AREA_LABELS: Record<string, string> = {
  akihabara:   '秋葉原',
  omiya:       '大宮',
  kawagoe:     '川越',
  urawamisono: '浦和美園',
  tokyo:       '東京',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ storeId: string }>;
}): Promise<Metadata> {
  const { storeId } = await params;
  const { storeName, area } = await getCachedShopPosts(storeId);
  const areaLabel = AREA_LABELS[area] ?? area;

  if (!storeName) return { title: 'ショップ詳細' };

  const title = `${storeName} のオリパ情報`;
  const description = `${storeName}（${areaLabel}）の最新オリパ入荷情報。あたりカード・ラストワン賞情報つき。直近14日間の在庫をチェックできます。`;
  return {
    title,
    description,
    alternates: { canonical: `https://oripanow.app/oripa/shops/${storeId}` },
    openGraph: { title: `${title} | オリパなう`, description },
    twitter: { title: `${title} | オリパなう`, description },
  };
}

function pageUrl(storeId: string, p: number): string {
  return p > 1 ? `/oripa/shops/${storeId}?page=${p}` : `/oripa/shops/${storeId}`;
}

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ storeId }, { page }] = await Promise.all([params, searchParams]);
  const { summaries, storeName, area } = await getCachedShopPosts(storeId);
  const areaLabel = AREA_LABELS[area] ?? area;
  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(`${storeName} ${areaLabel}`)}&output=embed&hl=ja`;

  // Pagination
  const pageIndex = Math.min(Math.max(parseInt(page ?? '1') || 1, 1), MAX_PAGES);
  const totalPages = Math.min(Math.ceil(summaries.length / PAGE_SIZE), MAX_PAGES);
  const pageItems = summaries.slice((pageIndex - 1) * PAGE_SIZE, pageIndex * PAGE_SIZE);

  const top3 = summaries
    .filter((s, i, arr) => arr.findIndex((x) => x.tweetId === s.tweetId) === i)
    .slice(0, 3);
  const oEmbeds = await Promise.all(top3.map((s) => fetchOEmbed(s.twitterUsername, s.tweetId)));

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}><Icon icon="mdi:cards-playing" width={20} height={20} /></div>
          <div>
            <div className={styles.logoText}>ORIPA NOW</div>
            <div className={styles.logoSub}>オリパ最新情報</div>
          </div>
        </div>
        <a href="/oripa" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none' }}>
          <Icon icon="heroicons:arrow-left" width={14} height={14} />
          トップへ戻る
        </a>
      </header>

      {/* Store info */}
      <div style={{ padding: '20px 24px 0', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <Icon icon="heroicons:building-storefront" width={20} height={20} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <h1 style={{ fontFamily: 'var(--font-body)', fontSize: '18px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            {storeName || 'ショップ詳細'}
          </h1>
          {areaLabel && <span className={styles.areaTag}>{areaLabel}</span>}
        </div>

        {storeName && (
          <div style={{ marginTop: '12px', marginBottom: '16px' }}>
            <iframe
              src={mapUrl}
              width="100%"
              height="240"
              style={{ border: 0, borderRadius: '12px', display: 'block', filter: 'brightness(0.85) contrast(1.1)' }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}
      </div>

      {/* Main content */}
      <main className={styles.main}>
        <div className={styles.contentLayout}>
          <div className={styles.gridColumn}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>オリパ履歴（直近14日）</div>
              {summaries.length > 0 && (
                <div className={styles.countBadge}>
                  {summaries.length}件 / {(pageIndex - 1) * PAGE_SIZE + 1}〜{Math.min(pageIndex * PAGE_SIZE, summaries.length)}表示
                </div>
              )}
            </div>

            {summaries.length === 0 ? (
              <p className={styles.emptyState}>この店舗の直近14日間の情報はありません。</p>
            ) : (
              <>
                <div className={styles.cardsGrid}>
                  {pageItems.map((s) => (
                    <OripaCard
                      key={s.postId}
                      post={s}
                      tweetTimestamp={tweetIdToDate(s.tweetId).toLocaleString('ja-JP', {
                        timeZone: 'Asia/Tokyo',
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className={styles.pagination}>
                    {pageIndex > 1 ? (
                      <a href={pageUrl(storeId, pageIndex - 1)} className={styles.pageBtn}>← 前へ</a>
                    ) : (
                      <span className={`${styles.pageBtn} ${styles.pageBtnDisabled}`}>← 前へ</span>
                    )}
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <a
                        key={p}
                        href={pageUrl(storeId, p)}
                        className={`${styles.pageBtn} ${p === pageIndex ? styles.pageBtnActive : ''}`}
                      >
                        {p}
                      </a>
                    ))}
                    {pageIndex < totalPages ? (
                      <a href={pageUrl(storeId, pageIndex + 1)} className={styles.pageBtn}>次へ →</a>
                    ) : (
                      <span className={`${styles.pageBtn} ${styles.pageBtnDisabled}`}>次へ →</span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {oEmbeds.some(Boolean) && (
            <aside className={styles.tweetSidebar}>
              <div className={styles.tweetList}>
                {oEmbeds.map((html, i) =>
                  html ? (
                    <div
                      key={top3[i].tweetId}
                      style={{ zoom: 0.75 }}
                      dangerouslySetInnerHTML={{ __html: html }}
                    />
                  ) : null
                )}
              </div>
            </aside>
          )}
        </div>
      </main>

      <Script src="https://platform.twitter.com/widgets.js" strategy="lazyOnload" />
    </div>
  );
}
