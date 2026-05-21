import type { GiveawaySortOption, GiveawayFilterOption } from '../../../lib/giveaways';
import styles from '../giveaway.module.css';

type Props = {
  currentSort: GiveawaySortOption;
  currentFilter: GiveawayFilterOption | undefined;
};

const SORT_OPTIONS: { label: string; value: GiveawaySortOption }[] = [
  { label: '締め切り順', value: 'deadline_asc' },
  { label: '新着順', value: 'newest' },
];

const FILTER_OPTIONS: { label: string; value: GiveawayFilterOption | undefined }[] = [
  { label: 'すべて', value: undefined },
  { label: 'BOXのみ', value: 'box' },
  { label: 'シングルのみ', value: 'single' },
];

function buildUrl(
  sort: GiveawaySortOption,
  filter: GiveawayFilterOption | undefined,
): string {
  const params = new URLSearchParams();
  if (sort !== 'deadline_asc') params.set('sort', sort);
  if (filter) params.set('filter', filter);
  const qs = params.toString();
  return qs ? `/giveaway?${qs}` : '/giveaway';
}

export function GiveawaySortFilterToolbar({ currentSort, currentFilter }: Props) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarSection}>
        <span className={styles.toolbarLabel}>並び順</span>
        <div className={styles.toolbarButtons}>
          {SORT_OPTIONS.map(({ label, value }) => (
            <a
              key={value}
              href={buildUrl(value, currentFilter)}
              className={`${styles.toolbarBtn} ${currentSort === value ? styles.toolbarBtnActive : ''}`}
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
              href={buildUrl(currentSort, value)}
              className={`${styles.toolbarBtn} ${currentFilter === value ? styles.toolbarBtnActive : ''}`}
            >
              {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
