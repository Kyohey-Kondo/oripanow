"use client";

import { useState } from "react";
import type { GiveawayPostSummary, EntryConditions, GiveawayPrize, AdminActions } from "@oripa-now/types";
import { updateAdminAction, twitterFollow, twitterRetweet, twitterReply } from "../actions";
import styles from "../admin-giveaway.module.css";

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function formatDeadline(deadline: string): string {
  const [y, m, d] = deadline.split("-");
  return `${y}/${m}/${d}`;
}

function formatTimestamp(createdAt: string): string {
  const d = new Date(createdAt);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function getPrizeBadgeLabel(type: GiveawayPrize["type"]): string {
  if (type === "box") return "BOX";
  if (type === "single") return "カード";
  return "その他";
}

function getPrizeBadgeClass(type: GiveawayPrize["type"]): string {
  if (type === "box") return styles.prizeBadgeBox;
  if (type === "single") return styles.prizeBadgeSingle;
  return styles.prizeBadgeOther;
}

const CONDITION_DISPLAY: { key: keyof Omit<EntryConditions, "note">; label: string }[] = [
  { key: "follow",  label: "フォロー" },
  { key: "repost",  label: "リポスト" },
  { key: "reply",   label: "リプライ" },
  { key: "other",   label: "その他" },
];

// ─── Component ────────────────────────────────────────────────────────────────

type Props = { giveaway: GiveawayPostSummary };

export function AdminGiveawayCard({ giveaway }: Props) {
  const [actions, setActions] = useState<AdminActions>(giveaway.adminActions ?? {});
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isDone = actions.done ?? false;
  const displayName = giveaway.storeName ?? `@${giveaway.twitterUsername}`;
  const ec = giveaway.entryConditions;

  async function run(key: keyof AdminActions, task: () => Promise<void>) {
    setLoading(key);
    setError(null);
    try {
      await task();
      setActions((prev) => ({ ...prev, [key]: true }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(null);
    }
  }

  async function handleFollow() {
    await run("followed", () => twitterFollow(giveaway.postId, giveaway.twitterUsername));
  }

  async function handleRetweet() {
    await run("reposted", () => twitterRetweet(giveaway.postId, giveaway.tweetId));
  }

  async function handleReply() {
    const note = ec?.note ? `\n補足: ${ec.note}` : "";
    const text = window.prompt(`リプライ内容を入力してください${note}`, "");
    if (text === null || text.trim() === "") return;
    await run("replied", () => twitterReply(giveaway.postId, giveaway.tweetId, text.trim()));
  }

  async function handleDoneToggle() {
    const newValue = !isDone;
    setActions((prev) => ({ ...prev, done: newValue }));
    try {
      await updateAdminAction(giveaway.postId, "done", newValue);
    } catch (e) {
      setActions((prev) => ({ ...prev, done: !newValue }));
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    }
  }

  return (
    <div className={`${styles.card} ${isDone ? styles.cardDone : ""}`}>
      {isDone && <div className={styles.doneBadge}>✓ 対応済み</div>}

      <div className={styles.cardHeader}>
        <div className={styles.accountName}>{displayName}</div>
        <div className={styles.postTime}>{formatTimestamp(giveaway.createdAt)}</div>
      </div>

      <div className={styles.prizesSection}>
        {giveaway.prizes.map((prize, i) => (
          <div key={i} className={styles.prizeRow}>
            <span className={`${styles.prizeBadge} ${getPrizeBadgeClass(prize.type)}`}>
              {getPrizeBadgeLabel(prize.type)}
            </span>
            <span className={styles.prizeName}>{prize.name}</span>
            {prize.count !== undefined && (
              <span className={styles.prizeCount}>{prize.count}名</span>
            )}
          </div>
        ))}
      </div>

      {giveaway.deadline && (
        <div className={styles.deadlineRow}>
          <span className={styles.deadlineLabel}>締切</span>
          <span className={styles.deadlineDate}>{formatDeadline(giveaway.deadline)}</span>
          {giveaway.daysRemaining !== undefined && (
            <span className={styles.daysRemaining}>
              {giveaway.daysRemaining === 0 ? "本日" : `残り${giveaway.daysRemaining}日`}
            </span>
          )}
        </div>
      )}

      {ec && (
        <div className={styles.conditionsSection}>
          <span className={styles.conditionsLabel}>応募条件</span>
          <div className={styles.conditionBadgeGroup}>
            {CONDITION_DISPLAY.filter(({ key }) => ec[key]).map(({ key, label }) => (
              <span key={key} className={styles.conditionBadge}>{label}</span>
            ))}
          </div>
          {ec.note && <p className={styles.conditionNote}>{ec.note}</p>}
        </div>
      )}

      <div className={styles.actionRow}>
        {ec?.follow && (
          <button
            className={`${styles.actionBtn} ${actions.followed ? styles.actionBtnDone : ""}`}
            onClick={handleFollow}
            disabled={!!loading || !!actions.followed}
          >
            {loading === "followed" ? "…" : actions.followed ? "✓ フォロー" : "フォロー"}
          </button>
        )}
        {ec?.repost && (
          <button
            className={`${styles.actionBtn} ${actions.reposted ? styles.actionBtnDone : ""}`}
            onClick={handleRetweet}
            disabled={!!loading || !!actions.reposted}
          >
            {loading === "reposted" ? "…" : actions.reposted ? "✓ リポスト" : "リポスト"}
          </button>
        )}
        {ec?.reply && (
          <button
            className={`${styles.actionBtn} ${actions.replied ? styles.actionBtnDone : ""}`}
            onClick={handleReply}
            disabled={!!loading || !!actions.replied}
          >
            {loading === "replied" ? "…" : actions.replied ? "✓ リプライ" : "リプライ"}
          </button>
        )}
        <a
          className={styles.tweetLink}
          href={`https://x.com/${giveaway.twitterUsername}/status/${giveaway.tweetId}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          元ツイート
        </a>
      </div>

      {error && <p className={styles.errorMsg}>{error}</p>}

      <div className={styles.cardFooter}>
        <button
          className={`${styles.doneToggle} ${isDone ? styles.doneToggleActive : ""}`}
          onClick={handleDoneToggle}
          disabled={!!loading}
        >
          {isDone ? "対応を取り消す" : "対応済みにする"}
        </button>
      </div>
    </div>
  );
}
