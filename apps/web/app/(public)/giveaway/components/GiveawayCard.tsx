import type { GiveawayPostSummary, GiveawayPrize } from '@oripa-now/types';
import { Icon } from '@iconify/react';
import styles from '../giveaway.module.css';

function getTopBarClass(prizes: GiveawayPrize[]): string {
  if (prizes.some((p) => p.type === 'box')) return styles.cardTopBarBox;
  if (prizes.some((p) => p.type === 'single')) return styles.cardTopBarSingle;
  return styles.cardTopBarOther;
}

function getPrizeBadgeClass(type: GiveawayPrize['type']): string {
  if (type === 'box') return styles.prizeTypeBadgeBox;
  if (type === 'single') return styles.prizeTypeBadgeSingle;
  return styles.prizeTypeBadgeOther;
}

function getPrizeBadgeLabel(type: GiveawayPrize['type']): string {
  if (type === 'box') return 'BOX';
  if (type === 'single') return 'カード';
  return 'その他';
}

function getDeadlineBadgeClass(daysRemaining: number | undefined): string | null {
  if (daysRemaining === undefined) return null;
  if (daysRemaining < 3) return styles.deadlineBadgeUrgent;
  if (daysRemaining <= 7) return styles.deadlineBadgeSoon;
  return styles.deadlineBadgeOk;
}

function formatDeadline(deadline: string): string {
  const [y, m, d] = deadline.split('-');
  return `${y}/${m}/${d}`;
}

function formatTimestamp(createdAt: string): string {
  const d = new Date(createdAt);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

type Props = {
  giveaway: GiveawayPostSummary;
};

export function GiveawayCard({ giveaway }: Props) {
  const topBarClass = getTopBarClass(giveaway.prizes);
  const displayName = giveaway.storeName ?? `@${giveaway.twitterUsername}`;
  const deadlineBadgeClass = getDeadlineBadgeClass(giveaway.daysRemaining);

  return (
    <div className={styles.card}>
      <div className={`${styles.cardTopBar} ${topBarClass}`} />
      <div className={styles.cardBody}>
        <div className={styles.cardHeaderRow}>
          <div className={styles.accountName}>{displayName}</div>
          <div className={styles.postTime}>{formatTimestamp(giveaway.createdAt)}</div>
        </div>

        <div className={styles.prizesSection}>
          {giveaway.prizes.map((prize, i) => (
            <div key={i} className={styles.prizeRow}>
              <div className={`${styles.prizeTypeBadge} ${getPrizeBadgeClass(prize.type)}`}>
                {getPrizeBadgeLabel(prize.type)}
              </div>
              <div className={styles.prizeName}>{prize.name}</div>
              {prize.count !== undefined && (
                <div className={styles.prizeCount}>{prize.count}名</div>
              )}
            </div>
          ))}
        </div>

        {giveaway.conditions && (
          <div className={styles.conditionsRow}>
            <div className={styles.conditionsLabel}>応募</div>
            <div className={styles.conditionsText}>{giveaway.conditions}</div>
          </div>
        )}

        <div className={styles.deadlineRow}>
          <div className={styles.deadlineLabel}>締切</div>
          {giveaway.deadline ? (
            <>
              <div className={styles.deadlineDate}>{formatDeadline(giveaway.deadline)}</div>
              {deadlineBadgeClass && (
                <div className={`${styles.deadlineBadge} ${deadlineBadgeClass}`}>
                  {giveaway.daysRemaining === 0 ? '本日' : `残り${giveaway.daysRemaining}日`}
                </div>
              )}
            </>
          ) : (
            <div className={styles.deadlineUnknown}>締め切り不明</div>
          )}
        </div>
      </div>

      <div className={styles.cardFooter}>
        <a
          className={styles.tweetBtn}
          href={`https://x.com/${giveaway.twitterUsername}/status/${giveaway.tweetId}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon icon="ri:twitter-x-fill" width={13} height={13} /> 元ツイートを見る
        </a>
      </div>
    </div>
  );
}
