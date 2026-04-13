# Contract: Analyze Lambda

**Branch**: `006-ai-tweet-analysis` | **Date**: 2026-04-13

## Trigger

EventBridge `rate(1 hour)` rule, offset ~10 minutes after the fetch batch schedule.

The handler ignores the event payload.

## Response

```typescript
type AnalyzeRunResult = {
  runAt: string;           // ISO 8601
  tweetsProcessed: number; // total tweets attempted
  postsCreated: number;    // OripaPost records written
  skipped: number;         // not_oripa classifications
  errors: Array<{
    tweetId: string;
    error: string;
  }>;
};
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key (from SSM) |
| `DEPLOY_ENV` | Yes | Table name prefix |
| `TWEETS_TABLE_NAME` | Yes | Source queue table |
| `STORES_TABLE_NAME` | Yes | Store metadata lookup |
| `ORIPA_POSTS_TABLE_NAME` | Yes | Destination table |
| `ANALYZE_BATCH_SIZE` | No | Max tweets per run; default `50` |
| `ANTHROPIC_MODEL` | No | Claude model ID; default `claude-haiku-4-5-20251001` |

## CDK Changes (BatchStack)

| Resource | Change |
|----------|--------|
| New Lambda `${deployEnv}-oripa-now-analyze` | Entry: `apps/batch/src/analyze.ts`, timeout 5min, Node 22 |
| SSM parameter | `/oripa-now/${deployEnv}/ANTHROPIC_API_KEY` → Lambda env |
| EventBridge rule | `rate(1 hour)` targeting analyze Lambda |
| IAM | Read tweets + stores, write oripa-posts, update tweets |
