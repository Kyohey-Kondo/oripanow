import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { beforeEach, describe, expect, it } from 'vitest';
import type { OnlineOripaItem } from '@oripa-now/db';
import { deriveItemId, markItemMissed, upsertSeenItem } from '../save';

const ddbMock = mockClient(DynamoDBDocumentClient);
const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

beforeEach(() => {
  ddbMock.reset();
});

function makeItem(overrides: Partial<OnlineOripaItem> = {}): OnlineOripaItem {
  return {
    itemId: 'item-1',
    provider: 'orikuji',
    productUrl: 'https://orikuji.com/gacha/pokemon/ga0011',
    imageUrl: 'https://media.orikuji.com/gacha/ga0011_thumb.webp',
    status: 'active',
    missCount: 0,
    firstSeenAt: '2026-09-01T00:00:00.000Z',
    lastSeenAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    activeStatus: 'ACTIVE',
    ...overrides,
  };
}

describe('deriveItemId', () => {
  it('is deterministic for the same productUrl', () => {
    const url = 'https://orikuji.com/gacha/pokemon/ga0011_202609_690';
    expect(deriveItemId(url)).toBe(deriveItemId(url));
  });

  it('differs for different productUrls', () => {
    expect(deriveItemId('https://orikuji.com/gacha/pokemon/a')).not.toBe(
      deriveItemId('https://orikuji.com/gacha/pokemon/b'),
    );
  });
});

describe('upsertSeenItem', () => {
  it('sets the item active with missCount reset and preserves firstSeenAt via if_not_exists', async () => {
    ddbMock.on(UpdateCommand).resolves({});

    await upsertSeenItem(
      docClient,
      'orikuji',
      { productUrl: 'https://orikuji.com/gacha/pokemon/ga0011', imageUrl: 'https://media.orikuji.com/ga0011.webp' },
      '2026-09-19T00:00:00.000Z',
    );

    const call = ddbMock.commandCalls(UpdateCommand)[0].args[0].input;
    expect(call.UpdateExpression).toContain('if_not_exists(firstSeenAt, :now)');
    expect(call.ExpressionAttributeValues?.[':active']).toBe('active');
    expect(call.ExpressionAttributeValues?.[':zero']).toBe(0);
    expect(call.ExpressionAttributeValues?.[':activeStatus']).toBe('ACTIVE');
  });
});

describe('markItemMissed', () => {
  it('bumps missCount without deactivating below the threshold', async () => {
    ddbMock.on(UpdateCommand).resolves({});
    const item = makeItem({ missCount: 1 });

    const deactivated = await markItemMissed(docClient, item, '2026-09-19T00:00:00.000Z');

    expect(deactivated).toBe(false);
    const call = ddbMock.commandCalls(UpdateCommand)[0].args[0].input;
    expect(call.ExpressionAttributeValues?.[':missCount']).toBe(2);
    expect(call.UpdateExpression).not.toContain('REMOVE activeStatus');
  });

  it('deactivates and removes activeStatus once missCount reaches MAX_MISS_COUNT (3)', async () => {
    ddbMock.on(UpdateCommand).resolves({});
    const item = makeItem({ missCount: 2 });

    const deactivated = await markItemMissed(docClient, item, '2026-09-19T00:00:00.000Z');

    expect(deactivated).toBe(true);
    const call = ddbMock.commandCalls(UpdateCommand)[0].args[0].input;
    expect(call.ExpressionAttributeValues?.[':missCount']).toBe(3);
    expect(call.ExpressionAttributeValues?.[':inactive']).toBe('inactive');
    expect(call.UpdateExpression).toContain('REMOVE activeStatus');
  });
});
