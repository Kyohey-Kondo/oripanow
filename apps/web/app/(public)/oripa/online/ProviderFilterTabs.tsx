import { PROVIDERS } from '@/lib/online-oripa';
import styles from './online.module.css';

type Props = {
  currentProvider: string | undefined;
  counts: Record<string, number>;
  total: number;
};

function buildUrl(provider: string | undefined): string {
  return provider ? `/oripa/online?provider=${provider}` : '/oripa/online';
}

export function ProviderFilterTabs({ currentProvider, counts, total }: Props) {
  return (
    <div className={styles.toolbarButtons}>
      <a
        href={buildUrl(undefined)}
        className={`${styles.tab} ${currentProvider === undefined ? styles.tabActive : ''}`}
      >
        すべて ({total})
      </a>
      {PROVIDERS.map(({ value, label }) => (
        <a
          key={value}
          href={buildUrl(value)}
          className={`${styles.tab} ${currentProvider === value ? styles.tabActive : ''}`}
        >
          {label} ({counts[value] ?? 0})
        </a>
      ))}
    </div>
  );
}
