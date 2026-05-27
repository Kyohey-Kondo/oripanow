import { fetchAdminStats } from "@/lib/admin";
import styles from "./admin-internal.module.css";

export const dynamic = "force-dynamic";

const AREA_LABELS: Record<string, string> = {
  akihabara: "秋葉原",
  ikebukuro: "池袋",
  shinjuku: "新宿",
  kawagoe: "川越",
  omiya: "大宮",
};

export default async function AdminPage() {
  const stats = await fetchAdminStats();

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Admin Dashboard</h1>
      <nav className={styles.nav}>
        <a href="/admin-internal/giveaway" className={styles.navLink}>Giveaway 対応管理 →</a>
      </nav>
      <p className={styles.meta}>取得時刻: {new Date(stats.fetchedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}</p>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>店舗情報</h2>
        <div className={styles.statRow}>
          <span>総店舗数</span>
          <span className={styles.statValue}>{stats.storeCount}</span>
        </div>
        <div className={styles.statRow}>
          <span>アクティブ店舗数</span>
          <span className={styles.statValue}>{stats.activeStoreCount}</span>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>直近7日間の販売中投稿数（エリア別）</h2>
        {Object.entries(stats.postCountsByArea).map(([area, count]) => (
          <div key={area} className={styles.statRow}>
            <span>{AREA_LABELS[area] ?? area}</span>
            <span className={styles.statValue}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
