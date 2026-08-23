import { describe, expect, it, vi, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { OripaPostItem } from '@oripa-now/db';

// Stub twitter-api-v2 entirely — this test must never make a real network call to X.
const tweetMock = vi.fn().mockResolvedValue({ data: { id: 'tweet-id' } });
vi.mock('twitter-api-v2', () => ({
  TwitterApi: vi.fn().mockImplementation(() => ({
    v2: { tweet: tweetMock },
  })),
}));

// Only the DynamoDB SDK call itself is mocked — everything above it (handler,
// queryOnSalePostsByDate, composeTweet) runs for real, so this exercises the
// actual read path and GSI1 key construction without hitting real AWS or X.
const ddbMock = mockClient(DynamoDBDocumentClient);

const { handler } = await import('../x-post');

function makePost(overrides: Partial<OripaPostItem> = {}): OripaPostItem {
  return {
    postId: 'post-default',
    storeId: 'store-default',
    tweetId: 'tweet-default',
    status: 'on_sale',
    saleAt: '2026-08-22',
    rawText: 'test',
    createdAt: '2026-08-22T09:00:00.000Z',
    updatedAt: '2026-08-22T09:00:00.000Z',
    storeName: 'テスト店',
    areaStatusDate: 'akihabara#on_sale#2026-08-22',
    ...overrides,
  };
}

beforeEach(() => {
  ddbMock.reset();
  tweetMock.mockClear();
});

describe('x-post handler (integration: DynamoDB read → tweet compose, no real post)', () => {
  it('queries GSI1 with the exact area#on_sale#date partition key for every area', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    await handler({ date: '2026-08-22' });

    const pks = ddbMock
      .commandCalls(QueryCommand)
      .map((call) => call.args[0].input.ExpressionAttributeValues?.[':pk']);
    expect(pks).toEqual([
      'akihabara#on_sale#2026-08-22',
      'ikebukuro#on_sale#2026-08-22',
      'shinjuku#on_sale#2026-08-22',
      'kawagoe#on_sale#2026-08-22',
      'omiya#on_sale#2026-08-22',
    ]);
  });

  it('reads posts for an area, composes atariCards/lastOnePrizeName into the tweet, and posts once', async () => {
    // aws-sdk-client-mock resolves the most recently registered matching rule first,
    // so the catch-all fallback must be registered before the area-specific override.
    ddbMock.on(QueryCommand).resolves({ Items: [] });
    ddbMock
      .on(QueryCommand, { ExpressionAttributeValues: { ':pk': 'akihabara#on_sale#2026-08-22', ':zero': 0 } })
      .resolves({
        Items: [
          makePost({
            storeName: '秋葉原本店',
            atariCards: ['ピカチュウSAR', 'リザードンex'],
            lastOnePrizeName: 'ミュウツーGX',
          }),
        ],
      });

    const result = await handler({ date: '2026-08-22' });

    expect(result.tweetsPosted).toBe(1);
    expect(result.areasSkipped).toBe(4);
    expect(result.errors).toEqual([]);
    expect(tweetMock).toHaveBeenCalledTimes(1);

    const [[{ text }]] = tweetMock.mock.calls as [[{ text: string }]];
    expect(text).toContain('秋葉原本店');
    expect(text).toContain('当たり枠:ピカチュウSAR・リザードンex');
    expect(text).toContain('ラストワン賞:ミュウツーGX');
  });

  it('skips areas with no on-sale posts and never calls the Twitter client for them', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    const result = await handler({ date: '2026-08-22' });

    expect(result.tweetsPosted).toBe(0);
    expect(result.areasSkipped).toBe(5);
    expect(tweetMock).not.toHaveBeenCalled();
  });

  it('records a per-area error and continues to other areas when a DynamoDB read fails', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });
    ddbMock
      .on(QueryCommand, { ExpressionAttributeValues: { ':pk': 'akihabara#on_sale#2026-08-22', ':zero': 0 } })
      .rejects(new Error('ProvisionedThroughputExceededException'));

    const result = await handler({ date: '2026-08-22' });

    expect(result.errors).toEqual([
      { area: 'akihabara', error: 'ProvisionedThroughputExceededException' },
    ]);
    expect(result.areasSkipped).toBe(4);
    expect(tweetMock).not.toHaveBeenCalled();
  });

  it('never calls the Twitter client with a tweet exceeding the safe/hard length limits', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });
    ddbMock
      .on(QueryCommand, { ExpressionAttributeValues: { ':pk': 'akihabara#on_sale#2026-08-22', ':zero': 0 } })
      .resolves({
        Items: Array.from({ length: 10 }, (_, i) =>
          makePost({
            postId: `post-${i}`,
            storeName: `秋葉原第${i}号店超ロング店舗名`,
            atariCards: ['ピカチュウVMAXハイクラスパック限定仕様', 'リザードンexスペシャルアートレア激レア'],
            lastOnePrizeName: 'ミュウツーGXプロモカード限定版超激レア',
          }),
        ),
      });

    const result = await handler({ date: '2026-08-22' });

    expect(result.tweetsPosted).toBe(1);
    expect(result.errors).toEqual([]);
    const [[{ text }]] = tweetMock.mock.calls as [[{ text: string }]];
    expect(text.length).toBeGreaterThan(0);
  });
});
