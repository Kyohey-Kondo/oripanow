import React from 'react';
import Script from 'next/script';
import { Icon } from '@iconify/react';
import { AdBanner } from '../components/AdBanner';
import { getTodayOnSalePosts } from '../../lib/posts';
import { tweetIdToDate } from '../../lib/tweet-utils';
import { OripaCard } from './components/OripaCard';
import styles from './oripa.module.css';

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

function pageUrl(p: number, area?: string): string {
  const params = new URLSearchParams();
  if (area) params.set('area', area);
  if (p > 1) params.set('page', String(p));
  const qs = params.toString();
  return qs ? `/oripa?${qs}` : '/oripa';
}

const AREA_LABELS: Record<string, string> = {
  akihabara:   '秋葉原',
  kawagoe:     '川越',
  omiya:       '大宮',
  urawamisono: '浦和美園',
};

export default async function OripaPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string; page?: string }>;
}) {
  const { area, page } = await searchParams;
  const summaries = await getTodayOnSalePosts(area);

  // Pagination
  const pageIndex = Math.min(Math.max(parseInt(page ?? '1') || 1, 1), MAX_PAGES);
  const totalPages = Math.min(Math.ceil(summaries.length / PAGE_SIZE), MAX_PAGES);
  const pageItems = summaries.slice((pageIndex - 1) * PAGE_SIZE, pageIndex * PAGE_SIZE);

  // Top 3 unique tweets for oEmbed previews
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
        <div className={styles.liveBadge}>
          <div className={styles.liveDot} />
          LIVE
        </div>
      </header>

      {/* Ad banner */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 24px 0' }}>
        <AdBanner
          href="https://px.a8.net/svt/ejp?a8mat=4B1THW+4QVFEA+5I52+5Z6WX"
          imgSrc="https://www25.a8.net/svt/bgt?aid=260425364287&wid=001&eno=01&mid=s00000025679001004000&mc=1"
          trackingSrc="https://www13.a8.net/0.gif?a8mat=4B1THW+4QVFEA+5I52+5Z6WX"
        />
      </div>

      {/* Area tabs */}
      <nav className={styles.areaTabs}>
        <a href="/oripa" className={`${styles.tab} ${!area ? styles.tabActive : ''}`}>
          すべて
        </a>
        {Object.entries(AREA_LABELS).map(([key, label]) => (
          <a
            key={key}
            href={`/oripa?area=${key}`}
            className={`${styles.tab} ${area === key ? styles.tabActive : ''}`}
          >
            {label}
          </a>
        ))}
      </nav>

      {/* Main content */}
      <main className={styles.main}>
        <div className={styles.contentLayout}>
          <div className={styles.gridColumn}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>本日のオリパ情報</div>
              {summaries.length > 0 && (
                <div className={styles.countBadge}>
                  {summaries.length}件 / {(pageIndex - 1) * PAGE_SIZE + 1}〜{Math.min(pageIndex * PAGE_SIZE, summaries.length)}表示
                </div>
              )}
            </div>

            {summaries.length === 0 ? (
              <p className={styles.emptyState}>直近14日間のオリパ情報はありません。</p>
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
                      <a href={pageUrl(pageIndex - 1, area)} className={styles.pageBtn}>← 前へ</a>
                    ) : (
                      <span className={`${styles.pageBtn} ${styles.pageBtnDisabled}`}>← 前へ</span>
                    )}
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <a
                        key={p}
                        href={pageUrl(p, area)}
                        className={`${styles.pageBtn} ${p === pageIndex ? styles.pageBtnActive : ''}`}
                      >
                        {p}
                      </a>
                    ))}
                    {pageIndex < totalPages ? (
                      <a href={pageUrl(pageIndex + 1, area)} className={styles.pageBtn}>次へ →</a>
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
                    <React.Fragment key={top3[i].tweetId}>
                      <div
                        style={{ zoom: 0.75 }}
                        dangerouslySetInnerHTML={{ __html: html }}
                      />
                      {i === 0 && (
                        <AdBanner
                          key="ad"
                          href="https://px.a8.net/svt/ejp?a8mat=4B1THW+97114I+5G0Y+5Z6WX"
                          imgSrc="https://www21.a8.net/svt/bgt?aid=260425364556&wid=001&eno=01&mid=s00000025405001004000&mc=1"
                          trackingSrc="https://www13.a8.net/0.gif?a8mat=4B1THW+97114I+5G0Y+5Z6WX"
                          style={{ margin: '8px 0' }}
                        />
                      )}
                    </React.Fragment>
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
