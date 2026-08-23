import { describe, expect, it } from 'vitest';
import type { OripaPostItem } from '@oripa-now/db';
import { composeTweet, weightedLength, TWEET_HARD_LIMIT, TWEET_SAFE_LIMIT } from '../x-post';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makePost(overrides: Partial<OripaPostItem> = {}): OripaPostItem {
  return {
    postId: 'post-default',
    storeId: 'store-default',
    tweetId: 'tweet-default',
    status: 'on_sale',
    saleAt: '2026-04-13',
    rawText: 'test',
    createdAt: '2026-04-13T09:00:00.000Z',
    updatedAt: '2026-04-13T09:00:00.000Z',
    storeName: 'テスト店',
    areaStatusDate: 'akihabara#on_sale#2026-04-13',
    ...overrides,
  };
}

// ─── weightedLength ─────────────────────────────────────────────────────────────

describe('weightedLength', () => {
  it('counts ASCII characters as weight 1', () => {
    expect(weightedLength('abcde')).toBe(5);
  });

  it('counts Japanese characters as weight 2', () => {
    expect(weightedLength('あいうえお')).toBe(10);
  });

  it('counts emoji as weight 2', () => {
    expect(weightedLength('🎴')).toBe(2);
  });

  it('mixes weights correctly', () => {
    expect(weightedLength('a あ🎴')).toBe(1 + 1 + 2 + 2); // "a" + " " + "あ" + emoji
  });
});

// ─── composeTweet ─────────────────────────────────────────────────────────────

describe('composeTweet', () => {
  it('falls back to the count-only message when no post has atariCards or lastOnePrizeName', () => {
    const posts = [makePost(), makePost({ postId: 'post-2' })];
    const text = composeTweet('akihabara', posts);

    expect(text).toContain('【秋葉原】本日のオリパ情報が2件更新されました🎴');
    expect(text).not.toContain('当たり枠');
    expect(text).not.toContain('ラストワン賞');
  });

  it('includes atariCards and lastOnePrizeName for a single store', () => {
    const posts = [
      makePost({
        storeName: '秋葉原本店',
        atariCards: ['ピカチュウSAR', 'リザードンex'],
        lastOnePrizeName: 'ミュウツーGX',
      }),
    ];
    const text = composeTweet('akihabara', posts);

    expect(text).toContain('秋葉原本店');
    expect(text).toContain('当たり枠:ピカチュウSAR・リザードンex');
    expect(text).toContain('ラストワン賞:ミュウツーGX');
  });

  it('merges and dedupes atariCards across multiple posts from the same store', () => {
    const posts = [
      makePost({ postId: 'p1', storeName: '秋葉原本店', atariCards: ['ピカチュウSAR'] }),
      makePost({ postId: 'p2', storeName: '秋葉原本店', atariCards: ['ピカチュウSAR', 'カビゴンV'] }),
    ];
    const text = composeTweet('akihabara', posts);
    const highlightLine = text.split('\n').find((line) => line.startsWith('・秋葉原本店'));

    expect(highlightLine).toBe('・秋葉原本店 当たり枠:ピカチュウSAR・カビゴンV');
  });

  it('lists highlights for multiple distinct stores', () => {
    const posts = [
      makePost({ postId: 'p1', storeName: '秋葉原本店', atariCards: ['ピカチュウSAR'] }),
      makePost({ postId: 'p2', storeName: '秋葉原駅前店', lastOnePrizeName: 'ミュウex' }),
    ];
    const text = composeTweet('akihabara', posts);

    expect(text).toContain('・秋葉原本店 当たり枠:ピカチュウSAR');
    expect(text).toContain('・秋葉原駅前店 ラストワン賞:ミュウex');
  });

  it('never exceeds the hard X length limit even with many long highlights', () => {
    const posts = Array.from({ length: 10 }, (_, i) =>
      makePost({
        postId: `post-${i}`,
        storeName: `秋葉原第${i}号店超ロング店舗名`,
        atariCards: ['ピカチュウVMAXハイクラスパック限定仕様', 'リザードンexスペシャルアートレア激レア'],
        lastOnePrizeName: 'ミュウツーGXプロモカード限定版超激レア',
      }),
    );

    const text = composeTweet('akihabara', posts);
    expect(weightedLength(text)).toBeLessThanOrEqual(TWEET_HARD_LIMIT);
  });

  it('stays within the safe margin for a realistic number of stores/highlights', () => {
    const posts = [
      makePost({
        postId: 'p1',
        storeName: '秋葉原本店',
        atariCards: ['ピカチュウSAR', 'リザードンex'],
        lastOnePrizeName: 'ミュウツーGX',
      }),
      makePost({ postId: 'p2', storeName: '秋葉原駅前店', atariCards: ['カビゴンV'] }),
    ];

    const text = composeTweet('akihabara', posts);
    expect(weightedLength(text)).toBeLessThanOrEqual(TWEET_SAFE_LIMIT);
  });

  it('shows an omitted count when highlights are dropped to fit the length limit', () => {
    const posts = Array.from({ length: 10 }, (_, i) =>
      makePost({
        postId: `post-${i}`,
        storeName: `秋葉原第${i}号店超ロング店舗名`,
        atariCards: ['ピカチュウVMAXハイクラスパック限定仕様', 'リザードンexスペシャルアートレア激レア'],
        lastOnePrizeName: 'ミュウツーGXプロモカード限定版超激レア',
      }),
    );

    const text = composeTweet('akihabara', posts);
    expect(text).toMatch(/ほか\d+件/);
  });

  it('includes the area hashtag in the footer', () => {
    const text = composeTweet('kawagoe', [makePost({ storeName: '川越店' })]);
    expect(text).toContain('#川越');
  });
});
