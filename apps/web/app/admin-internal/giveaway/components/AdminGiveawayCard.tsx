"use client";

import { useState } from "react";
import type { GiveawayPostSummary, EntryConditions, GiveawayPrize, AdminActions } from "@oripa-now/types";
import { updateAdminAction } from "../actions";
import styles from "../admin-giveaway.module.css";

// ─── Pure helpers (mirrors public GiveawayCard) ───────────────────────────────

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

const CONDITION_LABELS: { key: keyof Omit<EntryConditions, "note">; label: string; actionKey: keyof AdminActions; intentFn: (username: string, tweetId: string) => string }[] = [
  {
    key: "follow",
    label: "フォロー",
    actionKey: "followed",
    intentFn: (username) => `https://twitter.com/intent/follow?screen_name=${username.replace(/^@/, "")}`,
  },
  {
    key: "repost",
    label: "リポスト",
    actionKey: "reposted",
    intentFn: (_, tweetId) => `https://twitter.com/intent/retweet?tweet_id=${tweetId}`,
  },
  {
    key: "reply",
    label: "リプライ",
    actionKey: "replied",
    intentFn: (_, tweetId) => `https://twitter.com/intent/tweet?in_reply_to=${tweetId}`,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

type Props = { giveaway: GiveawayPostSummary };

export function AdminGiveawayCard({ giveaway }: Props) {
  const [actions, setActions] = useState<AdminActions>(giveaway.adminActions ?? {});

  const isDone = actions.done ?? false;
  const displayName = giveaway.storeName ?? `@${giveaway.twitterUsername}`;

  async function handleAction(actionKey: keyof AdminActions, value: boolean, intentUrl?: string) {
    if (intentUrl) window.open(intentUrl, "_blank", "noopener,noreferrer");
    setActions((prev) => ({ ...prev, [actionKey]: value }));
    await updateAdminAction(giveaway.postId, actionKey, value);
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

      {giveaway.entryConditions && (
        <div className={styles.conditionsSection}>
          <span className={styles.conditionsLabel}>応募条件</span>
          <div className={styles.conditionBadgeGroup}>
            {CONDITION_LABELS.filter(({ key }) => giveaway.entryConditions![key]).map(({ key, label }) => (
              <span key={key} className={styles.conditionBadge}>{label}</span>
            ))}
            {giveaway.entryConditions.other && (
              <span className={styles.conditionBadge}>その他</span>
            )}
          </div>
          {giveaway.entryConditions.note && (
            <p className={styles.conditionNote}>{giveaway.entryConditions.note}</p>
          )}
        </div>
      )}

      <div className={styles.actionRow}>
        {giveaway.entryConditions && CONDITION_LABELS.filter(({ key }) => giveaway.entryConditions![key]).map(({ label, actionKey, intentFn }) => {
          const done = actions[actionKey] ?? false;
          return (
            <button
              key={actionKey}
              className={`${styles.actionBtn} ${done ? styles.actionBtnDone : ""}`}
              onClick={() => handleAction(actionKey, true, intentFn(giveaway.twitterUsername, giveaway.tweetId))}
            >
              {done ? `✓ ${label}` : label}
            </button>
          );
        })}
        <a
          className={styles.tweetLink}
          href={`https://x.com/${giveaway.twitterUsername}/status/${giveaway.tweetId}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          元ツイート
        </a>
      </div>

      <div className={styles.cardFooter}>
        <button
          className={`${styles.doneToggle} ${isDone ? styles.doneToggleActive : ""}`}
          onClick={() => handleAction("done", !isDone)}
        >
          {isDone ? "対応を取り消す" : "対応済みにする"}
        </button>
      </div>
    </div>
  );
}
