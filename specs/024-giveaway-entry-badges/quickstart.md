# Quickstart: Giveaway Entry Condition Badges

## Dev Workflow

```bash
# Type-check all packages
pnpm typecheck

# Start web dev server
pnpm --filter @oripa-now/web dev
# → http://localhost:3000/giveaway

# Lint
pnpm lint
```

## Verifying the UI

1. Start dev server
2. Navigate to `http://localhost:3000/giveaway`
3. Confirm each giveaway card shows four condition badges (フォロー / リポスト / リプライ / その他)
4. Active conditions appear highlighted (gold), inactive appear dimmed (gray)
5. Cards with a `note` show supplementary text below the badge row

## Verifying the Batch Analyzer

The AI extraction can be verified in a future batch run. For local testing, the `entryConditions` object can be manually inserted into DynamoDB dev table to test UI rendering.

## E2E Smoke Test (Playwright)

```bash
# from repo root
npx playwright screenshot http://localhost:3000/giveaway --output /tmp/giveaway-badges.png
```

Confirm badges are visible in the screenshot.
