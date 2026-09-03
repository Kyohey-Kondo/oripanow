import { fetchAdminStats, fetchStores, AREAS, type Area } from "@/lib/admin";
import { addStoreAction, updateStoreAction } from "./actions";
import { CheckButton } from "./CheckButton";
import styles from "./admin-internal.module.css";
import type { StoreItem } from "@oripa-now/db";

export const dynamic = "force-dynamic";

const AREA_LABELS: Record<Area, string> = {
  akihabara: "秋葉原",
  ikebukuro: "池袋",
  shinjuku: "新宿",
  kawagoe: "川越",
  omiya: "大宮",
};

const STALE_DAYS_WARNING = 14;

function daysSince(iso?: string): number | undefined {
  if (!iso) return undefined;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
}

function formatActivity(iso?: string): string {
  const days = daysSince(iso);
  if (days === undefined) return "記録なし";
  if (days <= 0) return "今日";
  return `${days}日前`;
}

function StoreRow({ store }: { store: StoreItem }) {
  const tweetDays = daysSince(store.lastTweetAt);
  const oripaDays = daysSince(store.lastOripaPostAt);
  const isTweetFresh = tweetDays !== undefined && tweetDays <= STALE_DAYS_WARNING;
  const isOripaFresh = oripaDays !== undefined && oripaDays <= STALE_DAYS_WARNING;

  return (
    <details className={styles.storeRow}>
      <summary className={styles.storeSummary}>
        <span className={styles.storeName}>{store.name}</span>
        <a
          href={`https://x.com/${store.twitterUsername}`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.twitterLink}
        >
          @{store.twitterUsername}
        </a>
        <span className={store.isActive ? styles.badgeActive : styles.badgeInactive}>
          {store.isActive ? "アクティブ" : "非アクティブ"}
        </span>
        <span className={`${styles.storeMeta} ${isTweetFresh ? styles.freshValue : ""}`}>
          ポケカ関連最終ツイート: {formatActivity(store.lastTweetAt)}
        </span>
        <span className={`${styles.storeMeta} ${isOripaFresh ? styles.freshValue : ""}`}>
          最終オリパ投稿: {formatActivity(store.lastOripaPostAt)}
        </span>
      </summary>

      <div className={styles.storeDetail}>
        <CheckButton label="この店舗を今すぐチェック" storeId={store.storeId} />

        <form action={updateStoreAction} className={styles.editForm}>
          <input type="hidden" name="storeId" value={store.storeId} />
          <label>
            店舗名
            <input type="text" name="name" defaultValue={store.name} required />
          </label>
          <label>
            Xユーザー名
            <input type="text" name="twitterUsername" defaultValue={store.twitterUsername} required />
          </label>
          <label>
            エリア
            <select name="area" defaultValue={store.area}>
              {!AREAS.includes(store.area as Area) && (
                <option value={store.area}>{store.area}（未対応エリア）</option>
              )}
              {AREAS.map((area) => (
                <option key={area} value={area}>
                  {AREA_LABELS[area]}
                </option>
              ))}
            </select>
          </label>
          <label>
            住所
            <input type="text" name="address" defaultValue={store.address ?? ""} />
          </label>
          <label className={styles.checkboxLabel}>
            <input type="checkbox" name="isActive" defaultChecked={store.isActive} />
            アクティブ（取得対象にする）
          </label>
          <button type="submit" className={styles.primaryButton}>
            保存
          </button>
        </form>
      </div>
    </details>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  const [stats, stores, { area: areaParam }] = await Promise.all([
    fetchAdminStats(),
    fetchStores(),
    searchParams,
  ]);

  const storesByArea = AREAS.map((area) => ({
    area,
    stores: stores.filter((s) => s.area === area),
  }));
  // Stores whose area predates the current 5-area scope (e.g. namba/umeda) are
  // still fetched daily by the batch but never surfaced on the public site —
  // show them separately so they aren't invisible when reviewing API spend.
  const otherAreaStores = stores.filter((s) => !AREAS.includes(s.area as Area));

  const selectedArea: Area | "other" = areaParam === "other" ? "other" : (AREAS.find((a) => a === areaParam) ?? AREAS[0]);
  const selectedStores = selectedArea === "other" ? otherAreaStores : storesByArea.find((g) => g.area === selectedArea)!.stores;

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Admin Dashboard</h1>
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
            <span>{AREA_LABELS[area as Area] ?? area}</span>
            <span className={styles.statValue}>{count}</span>
          </div>
        ))}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeaderRow}>
          <h2 className={styles.sectionTitle}>店舗管理</h2>
          <CheckButton label="全店舗を今すぐチェック" />
        </div>
        <p className={styles.meta}>
          「チェック」はTwitter APIを実際に呼び出します。結果は非同期で処理されるため、ポケカ関連最終ツイート/最終オリパ投稿は数十秒〜数分後に手動で再読み込みして確認してください。
        </p>

        <nav className={styles.areaTabs}>
          {AREAS.map((area) => (
            <a
              key={area}
              href={`?area=${area}`}
              className={`${styles.areaTab} ${selectedArea === area ? styles.areaTabActive : ""}`}
            >
              {AREA_LABELS[area]}（{storesByArea.find((g) => g.area === area)!.stores.length}）
            </a>
          ))}
          {otherAreaStores.length > 0 && (
            <a
              href="?area=other"
              className={`${styles.areaTab} ${selectedArea === "other" ? styles.areaTabActive : ""}`}
            >
              その他（{otherAreaStores.length}）
            </a>
          )}
        </nav>

        <div className={styles.areaGroup}>
          <div className={styles.areaHeaderRow}>
            <h3 className={styles.areaTitle}>
              {selectedArea === "other" ? "その他（未対応エリア・サイト非表示）" : AREA_LABELS[selectedArea]}（{selectedStores.length}）
            </h3>
            {selectedArea !== "other" && (
              <CheckButton label="このエリアをチェック" area={selectedArea} />
            )}
          </div>
          {selectedArea === "other" && (
            <p className={styles.meta}>
              現行の5エリアに含まれないため公開サイトには表示されませんが、isActiveであれば日次バッチの取得対象には入っています。
            </p>
          )}
          {selectedStores.map((store) => (
            <StoreRow key={store.storeId} store={store} />
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>店舗を追加</h2>
        <form action={addStoreAction} className={styles.editForm}>
          <label>
            店舗名
            <input type="text" name="name" required />
          </label>
          <label>
            Xユーザー名
            <input type="text" name="twitterUsername" required />
          </label>
          <label>
            エリア
            <select name="area" defaultValue={AREAS[0]}>
              {AREAS.map((area) => (
                <option key={area} value={area}>
                  {AREA_LABELS[area]}
                </option>
              ))}
            </select>
          </label>
          <label>
            住所（任意）
            <input type="text" name="address" />
          </label>
          <button type="submit" className={styles.primaryButton}>
            追加
          </button>
        </form>
      </div>
    </div>
  );
}
