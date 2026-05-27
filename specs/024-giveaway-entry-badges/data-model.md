# Data Model: Giveaway Entry Condition Badges

**Branch**: `024-giveaway-entry-badges` | **Date**: 2026-05-27

## New Type: EntryConditions

Defined in both `packages/db/schema/index.ts` (DB layer) and `packages/types/src/index.ts` (UI layer).

| Field    | Type    | Required | Description |
|----------|---------|----------|-------------|
| follow   | boolean | yes      | Must follow the account (フォロー必須) |
| repost   | boolean | yes      | Must repost/RT (リポスト/RT必須) |
| reply    | boolean | yes      | Must reply or quote-tweet (リプライ/引用RT必須) |
| other    | boolean | yes      | Any other condition (いいね、ハッシュタグ等) |
| note     | string  | no       | Supplementary detail in Japanese (e.g. specific hashtag, required reply content) |

## Modified Type: GiveawayPostItem (`packages/db/schema/index.ts`)

| Field | Change |
|-------|--------|
| `conditions?: string` | **Removed** |
| `entryConditions?: EntryConditions` | **Added** |

DynamoDB attribute: stored as a JSON map under key `entryConditions`. No GSI change.

## Modified Type: GiveawayAnalysisResult (`apps/batch/src/parse-giveaway.ts`)

| Field | Change |
|-------|--------|
| `conditions?: string` | **Removed** |
| `entryConditions?: EntryConditions` | **Added** |

## Modified Type: GiveawayPostSummary (`packages/types/src/index.ts`)

| Field | Change |
|-------|--------|
| `conditions?: string` | **Removed** |
| `entryConditions?: EntryConditions` | **Added** |

## Bedrock Tool Schema Change (`apps/batch/src/parse-giveaway.ts`)

Old property:
```json
"conditions": {
  "type": "string",
  "description": "..."
}
```

New property:
```json
"entryConditions": {
  "type": "object",
  "properties": {
    "follow":  { "type": "boolean" },
    "repost":  { "type": "boolean" },
    "reply":   { "type": "boolean" },
    "other":   { "type": "boolean" },
    "note":    { "type": "string"  }
  },
  "required": ["follow", "repost", "reply", "other"]
}
```
