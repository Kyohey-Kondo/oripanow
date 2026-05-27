# Implementation Plan: Giveaway Entry Condition Badges

**Branch**: `024-giveaway-entry-badges` | **Date**: 2026-05-27 | **Spec**: [spec.md](./spec.md)

## Summary

Replace the free-text `conditions?: string` field on giveaway posts with a structured `entryConditions` object containing four boolean flags (follow / repost / reply / other) plus an optional note string. The change spans three layers: shared type packages → AI batch analyzer (Bedrock tool schema) → Next.js UI (badge rendering).

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 22 LTS  
**Primary Dependencies**: Next.js 15 (App Router), AWS SDK v3 Bedrock Runtime, CSS Modules  
**Storage**: DynamoDB `{env}-giveaway-posts` (no schema change — `entryConditions` replaces `conditions` as a plain attribute)  
**Testing**: Playwright E2E (UI), `pnpm typecheck` (type-level correctness)  
**Target Platform**: AWS Lambda (batch) + Vercel/Lambda (web SSR)  
**Project Type**: Web application (monorepo: batch + web)  
**Performance Goals**: No new queries; existing DynamoDB read path unchanged  
**Constraints**: No DynamoDB migrations; no new GSIs; backward compat via optional field (old records show no conditions row)  
**Scale/Scope**: ~50–200 active giveaway cards at any time

## Constitution Check

Constitution is a placeholder template — no project-specific gates defined. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/024-giveaway-entry-badges/
├── plan.md          # This file
├── research.md      # Phase 0 output
├── data-model.md    # Phase 1 output
├── quickstart.md    # Phase 1 output
└── tasks.md         # Phase 2 output (/speckit.tasks)
```

### Source Code (affected files)

```text
packages/db/schema/index.ts                                  # EntryConditions type + GiveawayPostItem
packages/types/src/index.ts                                  # EntryConditions interface + GiveawayPostSummary
apps/batch/src/parse-giveaway.ts                             # Bedrock tool schema + GiveawayAnalysisResult
apps/batch/src/save-giveaway.ts                              # DynamoDB put (conditions → entryConditions)
apps/web/lib/giveaways.ts                                    # mapToGiveawaySummary
apps/web/app/(public)/giveaway/components/GiveawayCard.tsx   # ConditionBadges component
apps/web/app/(public)/giveaway/giveaway.module.css           # Badge CSS
```

**Structure Decision**: Monorepo web-app layout. Changes flow from shared packages outward to app layers — no new files or directories required.
