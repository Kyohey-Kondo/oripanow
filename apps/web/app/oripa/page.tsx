import React from 'react';
import Script from 'next/script';
import type { Metadata } from 'next';
import { Icon } from '@iconify/react';
import { AdBanner } from '../components/AdBanner';
import { PageNav } from '../components/PageNav';
import {
  getTodayOnSalePosts,
  sortPosts,
  filterPosts,
  VALID_SORTS,
  VALID_FILTERS,
} from '../../lib/posts';
import type { SortOption, FilterOption } from '../../lib/posts';
import { tweetIdToDate } from '../../lib/tweet-utils';
import { REGIONS, getAreasForRegion } from '../../lib/regions';
import { OripaCard } from './components/OripaCard';
import { SortFilterToolbar } from './components/SortFilterToolbar';
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

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://oripanow.app';
const OG_IMAGE = [{ url: '/og-image.png', width: 1200, height: 630 }];

const AREA_LABELS_MAP: Record<string, string> = {
  akihabara: '秋葉原',
  ikebukuro: '池袋',
  shinjuku:  '新宿',
  namba:     'なんば',
  umeda:     '梅田',
  kawagoe:   '川越',
  omiya:     '大宮',
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ area?: string; region?: string; page?: string; sort?: string; filter?: string }>;
}): Promise<Metadata> {
  const { area, region, page } = await searchParams;
  const areaLabel = area ? AREA_LABELS_MAP[area] : null;
  const regionLabel = !area && region ? REGIONS.find((r) => r.key === region)?.label : null;

  const canonicalParams = new URLSearchParams();
  if (region) canonicalParams.set('region', region);
  if (area) canonicalParams.set('area', area);
  if (page && page !== '1') canonicalParams.set('page', page);
  const qs = canonicalParams.toString();
  const canonicalUrl = `${BASE_URL}/oripa${qs ? `?${qs}` : ''}`;

  const description = areaLabel
    ? `${areaLabel}のポケモンカードオリパ最新情報。あたりカード・ラストワン賞情報を毎時更新。`
    : 'ポケモンカードのオリパ最新情報を毎時更新。あたりカード・ラストワン賞情報つき。秋葉原・池袋・新宿・大宮・川越のオリパ在庫をリアルタイムで確認できます。';

  const pageLabel = areaLabel ?? regionLabel;
  if (pageLabel) {
    const title = `${pageLabel}のオリパ情報`;
    return {
      title,
      description: `${pageLabel}のポケモンカードオリパ最新情報。あたりカード・ラストワン賞情報を毎時更新。`,
      alternates: { canonical: canonicalUrl },
      openGraph: { title: `${title} | オリパなう`, description, images: OG_IMAGE },
      twitter: { title: `${title} | オリパなう`, description, images: OG_IMAGE },
    };
  }

  return {
    title: { absolute: 'オリパなう' },
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: { title: 'オリパなう', description, images: OG_IMAGE },
    twitter: { title: 'オリパなう', description, images: OG_IMAGE },
  };
}

const PAGE_SIZE = 20;
const MAX_PAGES = 3;

function pageUrl(p: number, area?: string, sort?: SortOption, filter?: FilterOption, region?: string): string {
  const params = new URLSearchParams();
  if (region) params.set('region', region);
  if (area) params.set('area', area);
  if (sort && sort !== 'newest') params.set('sort', sort);
  if (filter) params.set('filter', filter);
  if (p > 1) params.set('page', String(p));
  const qs = params.toString();
  return qs ? `/oripa?${qs}` : '/oripa';
}

const AREA_LABELS = AREA_LABELS_MAP;

export default async function OripaPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string; region?: string; page?: string; sort?: string; filter?: string }>;
}) {
  const { area, region, page, sort: sortParam, filter: filterParam } = await searchParams;

  // Validate sort/filter params — fall back to defaults for unknown values
  const resolvedSort: SortOption = VALID_SORTS.includes(sortParam as SortOption) ? (sortParam as SortOption) : 'newest';
  const resolvedFilter: FilterOption | undefined = VALID_FILTERS.includes(filterParam as FilterOption) ? (filterParam as FilterOption) : undefined;

  // Resolve which areas to show in tier-2 and query
  const validRegion = REGIONS.find((r) => r.key === region)?.key;
  const visibleAreas = getAreasForRegion(validRegion);

  const summaries = await getTodayOnSalePosts(area, validRegion ? visibleAreas : undefined);
  const sorted = sortPosts(summaries, resolvedSort);
  const filtered = filterPosts(sorted, resolvedFilter);

  // Pagination (based on filtered result count)
  const pageIndex = Math.min(Math.max(parseInt(page ?? '1') || 1, 1), MAX_PAGES);
  const totalPages = Math.min(Math.ceil(filtered.length / PAGE_SIZE), MAX_PAGES);
  const pageItems = filtered.slice((pageIndex - 1) * PAGE_SIZE, pageIndex * PAGE_SIZE);

  // Top 3 unique tweets for oEmbed previews (from full unfiltered list)
  const top3 = summaries
    .filter((s, i, arr) => arr.findIndex((x) => x.tweetId === s.tweetId) === i)
    .slice(0, 3);
  const oEmbeds = await Promise.all(top3.map((s) => fetchOEmbed(s.twitterUsername, s.tweetId)));

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <a href="/oripa" className={styles.logo} style={{ textDecoration: 'none' }}>
          <div className={styles.logoIcon}><Icon icon="mdi:cards-playing" width={20} height={20} /></div>
          <div>
            <div className={styles.logoText}>ORIPA NOW</div>
            <div className={styles.logoSub}>オリパ最新情報</div>
          </div>
        </a>
        <div className={styles.liveBadge}>
          <div className={styles.liveDot} />
          LIVE
        </div>
      </header>
      <PageNav current="oripa" />
      <p className={styles.promoDisclosure}>本サイトはプロモーションを含みます。</p>

      {/* Ad banner */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 24px 0' }}>
        <AdBanner
          href="https://px.a8.net/svt/ejp?a8mat=4B1THW+4QVFEA+5I52+5Z6WX"
          imgSrc="https://www25.a8.net/svt/bgt?aid=260425364287&wid=001&eno=01&mid=s00000025679001004000&mc=1"
          trackingSrc="https://www13.a8.net/0.gif?a8mat=4B1THW+4QVFEA+5I52+5Z6WX"
        />
      </div>

      {/* Main content */}
      <main className={styles.main}>
        <div className={styles.contentLayout}>
          <div className={styles.gridColumn}>

            {/* Region tabs (tier-1) */}
            <nav className={styles.regionTabs}>
              <a href="/oripa" className={`${styles.regionTab} ${!validRegion ? styles.regionTabActive : ''}`}>
                全国
              </a>
              {REGIONS.map((r) => (
                <a
                  key={r.key}
                  href={`/oripa?region=${r.key}`}
                  className={`${styles.regionTab} ${validRegion === r.key ? styles.regionTabActive : ''}`}
                >
                  {r.label}
                </a>
              ))}
            </nav>

            {/* Area tabs (tier-2) */}
            <nav className={styles.areaTabs}>
              <a
                href={validRegion ? `/oripa?region=${validRegion}` : '/oripa'}
                className={`${styles.tab} ${!area ? styles.tabActive : ''}`}
              >
                すべて
              </a>
              {visibleAreas.map((key) => (
                <a
                  key={key}
                  href={validRegion ? `/oripa?region=${validRegion}&area=${key}` : `/oripa?area=${key}`}
                  className={`${styles.tab} ${area === key ? styles.tabActive : ''}`}
                >
                  {AREA_LABELS[key]}
                </a>
              ))}
            </nav>

            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>本日のオリパ情報</div>
              {filtered.length > 0 && (
                <div className={styles.countBadge}>
                  {filtered.length}件 / {(pageIndex - 1) * PAGE_SIZE + 1}〜{Math.min(pageIndex * PAGE_SIZE, filtered.length)}表示
                </div>
              )}
            </div>

            {summaries.length > 0 && (
              <SortFilterToolbar
                currentSort={resolvedSort}
                currentFilter={resolvedFilter}
                area={area}
              />
            )}

            {summaries.length === 0 ? (
              <p className={styles.emptyState}>直近14日間のオリパ情報はありません。</p>
            ) : filtered.length === 0 ? (
              <p className={styles.emptyState}>条件に一致するオリパ情報がありません。</p>
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
                      <a href={pageUrl(pageIndex - 1, area, resolvedSort, resolvedFilter, validRegion)} className={styles.pageBtn}>← 前へ</a>
                    ) : (
                      <span className={`${styles.pageBtn} ${styles.pageBtnDisabled}`}>← 前へ</span>
                    )}
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <a
                        key={p}
                        href={pageUrl(p, area, resolvedSort, resolvedFilter, validRegion)}
                        className={`${styles.pageBtn} ${p === pageIndex ? styles.pageBtnActive : ''}`}
                      >
                        {p}
                      </a>
                    ))}
                    {pageIndex < totalPages ? (
                      <a href={pageUrl(pageIndex + 1, area, resolvedSort, resolvedFilter, validRegion)} className={styles.pageBtn}>次へ →</a>
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
