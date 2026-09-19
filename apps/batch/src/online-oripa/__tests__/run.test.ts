import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { beforeEach, describe, expect, it } from 'vitest';
import type { OnlineOripaItem } from '@oripa-now/db';
import { runProviderScrape } from '../run';

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  ddbMock.reset();
});

function makeItem(overrides: Partial<OnlineOripaItem> = {}): OnlineOripaItem {
  return {
    itemId: 'item',
    provider: 'orikuji',
    productUrl: 'https://orikuji.com/gacha/pokemon/a',
    imageUrl: 'https://media.orikuji.com/a.webp',
    status: 'active',
    missCount: 0,
    firstSeenAt: '2026-09-01T00:00:00.000Z',
    lastSeenAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    activeStatus: 'ACTIVE',
    ...overrides,
  };
}

describe('runProviderScrape provider isolation', () => {
  it('scopes activeCountBefore and the missing-item diff to the running provider only', async () => {
    const orikujiSeen = makeItem({ itemId: 'o1', provider: 'orikuji', productUrl: 'https://orikuji.com/gacha/pokemon/o1' });
    const orikujiMissing = makeItem({ itemId: 'o2', provider: 'orikuji', productUrl: 'https://orikuji.com/gacha/pokemon/o2' });
    const dopaItem = makeItem({ itemId: 'd1', provider: 'dopa', productUrl: 'https://dopa-game.jp/pokemon/gacha/d1', imageUrl: 'https://cdn.dopa-game.jp/d1.webp' });

    // The shared table's active-items query returns rows from every provider.
    ddbMock.on(QueryCommand).resolves({ Items: [orikujiSeen, orikujiMissing, dopaItem] });
    ddbMock.on(UpdateCommand).resolves({});

    const result = await runProviderScrape('orikuji', async () => [
      { productUrl: orikujiSeen.productUrl, imageUrl: orikujiSeen.imageUrl },
    ]);

    // activeCountBefore must reflect only orikuji's 2 rows, not all 3.
    expect(result.activeCountBefore).toBe(2);
    expect(result.anomalyDetected).toBe(false);
    expect(result.itemsMissed).toBe(1);

    // DOPA's row must never be touched by an orikuji run — its itemId should
    // not appear in any UpdateCommand key.
    const updatedItemIds = ddbMock
      .commandCalls(UpdateCommand)
      .map((call) => call.args[0].input.Key?.itemId);
    expect(updatedItemIds).not.toContain('d1');
    expect(updatedItemIds).toContain('o2');
  });
});
