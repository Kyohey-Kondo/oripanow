import { getActiveGiveaways } from "@/lib/giveaways";
import { AdminGiveawayCard } from "./components/AdminGiveawayCard";
import { headers } from "next/headers";
import styles from "./admin-giveaway.module.css";

export const dynamic = "force-dynamic";

export default async function AdminGiveawayPage() {
  const [giveaways, h] = await Promise.all([getActiveGiveaways(), headers()]);
  const pathHash = h.get("x-admin-path-hash") ?? "";
  const adminBase = pathHash ? `/${pathHash}` : "/admin-internal";

  const done = giveaways.filter((g) => g.adminActions?.done).length;
  const pending = giveaways.length - done;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <a href={adminBase} className={styles.backLink}>← Admin Dashboard</a>
        <h1 className={styles.heading}>Giveaway 対応管理</h1>
        <p className={styles.meta}>
          全 {giveaways.length} 件 — 未対応 <strong>{pending}</strong> 件 / 対応済み <strong>{done}</strong> 件
        </p>
      </div>

      {giveaways.length === 0 ? (
        <p className={styles.empty}>アクティブなGiveawayはありません</p>
      ) : (
        <div className={styles.cardsGrid}>
          {giveaways.map((giveaway) => (
            <AdminGiveawayCard key={giveaway.postId} giveaway={giveaway} />
          ))}
        </div>
      )}
    </div>
  );
}
