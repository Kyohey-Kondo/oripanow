import type { SortOption, FilterOption } from '../../../lib/posts';
import styles from '../oripa.module.css';

type Props = {
  currentSort: SortOption;
  currentFilter: FilterOption | undefined;
  area: string | undefined;
};

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: '新着順', value: 'newest' },
  { label: '価格 安→高', value: 'price_asc' },
  { label: '価格 高→安', value: 'price_desc' },
  { label: '在庫 少→多', value: 'stock_asc' },
  { label: '在庫 多→少', value: 'stock_desc' },
];

const FILTER_OPTIONS: { label: string; value: FilterOption | undefined }[] = [
  { label: 'すべて', value: undefined },
  { label: 'ラストワンあり', value: 'last_one' },
  { label: 'あたり情報あり', value: 'hit_card' },
  { label: '両方あり', value: 'both' },
];

function buildUrl(
  area: string | undefined,
  sort: SortOption,
  filter: FilterOption | undefined,
): string {
  const params = new URLSearchParams();
  if (area) params.set('area', area);
  if (sort !== 'newest') params.set('sort', sort);
  if (filter) params.set('filter', filter);
  const qs = params.toString();
  return qs ? `/oripa?${qs}` : '/oripa';
}

export function SortFilterToolbar({ currentSort, currentFilter, area }: Props) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarSection}>
        <span className={styles.toolbarLabel}>並び順</span>
        <div className={styles.toolbarButtons}>
          {SORT_OPTIONS.map(({ label, value }) => (
            <a
              key={value}
              href={buildUrl(area, value, currentFilter)}
              className={`${styles.tab} ${currentSort === value ? styles.tabActive : ''}`}
            >
              {label}
            </a>
          ))}
        </div>
      </div>
      <div className={styles.toolbarSection}>
        <span className={styles.toolbarLabel}>絞り込み</span>
        <div className={styles.toolbarButtons}>
          {FILTER_OPTIONS.map(({ label, value }) => (
            <a
              key={value ?? 'none'}
              href={buildUrl(area, currentSort, value)}
              className={`${styles.tab} ${currentFilter === value ? styles.tabActive : ''}`}
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
