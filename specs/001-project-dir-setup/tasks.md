# Tasks: Project Directory Setup

**Input**: Design documents from `/specs/001-project-dir-setup/`
**Branch**: `001-project-dir-setup`
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: pnpm workspaces のルート設定ファイル整備

- [x] T001 Create `package.json` at repo root with pnpm workspaces definition listing all 6 packages
- [x] T002 Create `pnpm-workspace.yaml` at repo root listing `apps/*`, `packages/*`, `infra/cdk`
- [x] T003 [P] Create `.nvmrc` at repo root with `22` (Node.js 22 LTS)
- [x] T004 [P] Create `.gitignore` at repo root covering `node_modules`, `.next`, `dist`, `.turbo`, `cdk.out`, `.env*`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: `packages/config` と `packages/types` を整備。すべての他ワークスペースがこれらに依存するため先行して完成させる

**⚠️ CRITICAL**: この Phase が完了するまで US1 以降の作業は開始しない

- [x] T005 Create `packages/config/package.json` with name `@oripa-now/config` and no runtime dependencies
- [x] T006 [P] Create `packages/config/tsconfig.base.json` with strict TypeScript config (`strict: true`, `target: ES2022`, `moduleResolution: bundler`)
- [x] T007 [P] Create `packages/config/eslint-base.js` as ESLint flat config base (TypeScript rules, no framework-specific rules)
- [x] T008 Create `packages/types/package.json` with name `@oripa-now/types`, `main: "src/index.ts"`
- [x] T009 Create `packages/types/src/index.ts` as empty stub exporting placeholder type (`export type {}`)
- [x] T010 Create `packages/types/tsconfig.json` extending `@oripa-now/config/tsconfig.base.json`

**Checkpoint**: packages/config と packages/types が揃った状態 — US1 以降の実装可能

---

## Phase 3: User Story 1 - ディレクトリ骨格の整備 (Priority: P1) 🎯 MVP

**Goal**: リポジトリをクローンして `pnpm install` を実行後、全ワークスペースのディレクトリが存在し、各 `package.json` と最低限のスタブファイルが配置された状態

**Independent Test**: クローン後 `pnpm install` が通り、各ワークスペースに `package.json` と `tsconfig.json` が存在することを確認

### Implementation for User Story 1

- [x] T011 [P] [US1] Create `apps/web/package.json` with name `@oripa-now/web`, dependencies on `@oripa-now/types` and `@oripa-now/db`, Next.js 15 as dependency
- [x] T012 [P] [US1] Create `apps/web/tsconfig.json` extending `@oripa-now/config/tsconfig.nextjs.json` (placeholder reference — tsconfig.nextjs.json is created in US2)
- [x] T013 [P] [US1] Create `apps/web/next.config.ts` as minimal Next.js config stub
- [x] T014 [P] [US1] Create directories `apps/web/app/`, `apps/web/components/`, `apps/web/lib/`, `apps/web/public/` with `.gitkeep`
- [x] T015 [P] [US1] Create `apps/batch/package.json` with name `@oripa-now/batch`, dependencies on `@oripa-now/types` and `@oripa-now/db`
- [x] T016 [P] [US1] Create `apps/batch/tsconfig.json` extending `@oripa-now/config/tsconfig.base.json`
- [x] T017 [P] [US1] Create stub files `apps/batch/src/index.ts`, `apps/batch/src/fetch.ts`, `apps/batch/src/parse.ts`, `apps/batch/src/save.ts` (each with `export {}` placeholder)
- [x] T018 [P] [US1] Create `packages/db/package.json` with name `@oripa-now/db`, dependency on `@oripa-now/types`, Drizzle ORM as dependency
- [x] T019 [P] [US1] Create `packages/db/tsconfig.json` extending `@oripa-now/config/tsconfig.base.json`
- [x] T020 [P] [US1] Create `packages/db/schema/index.ts` as empty stub and `packages/db/drizzle.config.ts` as minimal config stub
- [x] T021 [P] [US1] Create directory `packages/db/migrations/` with `.gitkeep`
- [x] T022 [P] [US1] Create `infra/cdk/package.json` with name `@oripa-now/infra`, dependency on `@oripa-now/types`, AWS CDK v2 as dependency
- [x] T023 [P] [US1] Create `infra/cdk/tsconfig.json` extending `@oripa-now/config/tsconfig.base.json`
- [x] T024 [P] [US1] Create `infra/cdk/cdk.json` with minimal CDK app config pointing to `bin/app.ts`
- [x] T025 [P] [US1] Create stub files `infra/cdk/bin/app.ts`, `infra/cdk/lib/web-stack.ts`, `infra/cdk/lib/batch-stack.ts`, `infra/cdk/lib/db-stack.ts` (each with `export {}` placeholder)

**Checkpoint**: この時点で `pnpm install` が通り、全6ワークスペースのディレクトリと `package.json` が存在する

---

## Phase 4: User Story 2 - 共通設定の継承 (Priority: P2)

**Goal**: `packages/config/tsconfig.nextjs.json` が作成され、`apps/web` はそれを継承、他のアプリは `tsconfig.base.json` を継承している状態

**Independent Test**: `apps/web/tsconfig.json` が `@oripa-now/config/tsconfig.nextjs.json` を extends していることをファイル確認

### Implementation for User Story 2

- [x] T026 [US2] Create `packages/config/tsconfig.nextjs.json` extending `tsconfig.base.json` with Next.js-specific settings (`jsx: preserve`, `plugins: [{name: "next"}]`)
- [x] T027 [P] [US2] Update `apps/web/tsconfig.json` to extend `@oripa-now/config/tsconfig.nextjs.json` with web-specific include paths (`app/**`, `components/**`, `lib/**`)
- [x] T028 [P] [US2] Update `apps/batch/tsconfig.json` with correct include paths (`src/**`)
- [x] T029 [P] [US2] Update `packages/db/tsconfig.json` with correct include paths (`schema/**`, `migrations/**`)
- [x] T030 [P] [US2] Update `infra/cdk/tsconfig.json` with correct include paths (`bin/**`, `lib/**`)

**Checkpoint**: 全ワークスペースの `tsconfig.json` が共通設定を正しく継承している

---

## Phase 5: User Story 3 - ビルドオーケストレーション (Priority: P3)

**Goal**: ルートで `pnpm build`・`pnpm typecheck`・`pnpm lint` を実行すると全ワークスペースが依存順に処理される

**Independent Test**: ルートで `pnpm build` を実行し、全ワークスペースのビルドが順次完了する（スタブ実装で可）

### Implementation for User Story 3

- [x] T031 [US3] Create `turbo.json` at repo root with pipeline: `build` (dependsOn `^build`, outputs `.next/**`, `dist/**`), `typecheck` (dependsOn `^build`), `lint` (no deps), `dev` (cache false, persistent true)
- [x] T032 [P] [US3] Add root-level scripts to `package.json`: `"build": "turbo build"`, `"typecheck": "turbo typecheck"`, `"lint": "turbo lint"`, `"dev": "turbo dev"`
- [x] T033 [P] [US3] Add scripts to `apps/web/package.json`: `"build": "next build"`, `"typecheck": "tsc --noEmit"`, `"lint": "eslint ."`, `"dev": "next dev"`
- [x] T034 [P] [US3] Add scripts to `apps/batch/package.json`: `"build": "tsc"`, `"typecheck": "tsc --noEmit"`, `"lint": "eslint ."`
- [x] T035 [P] [US3] Add scripts to `packages/db/package.json`: `"build": "tsc"`, `"typecheck": "tsc --noEmit"`
- [x] T036 [P] [US3] Add scripts to `packages/types/package.json`: `"build": "tsc"`, `"typecheck": "tsc --noEmit"`
- [x] T037 [P] [US3] Add scripts to `packages/config/package.json`: `"typecheck": "tsc --noEmit"`
- [x] T038 [P] [US3] Add scripts to `infra/cdk/package.json`: `"build": "tsc"`, `"typecheck": "tsc --noEmit"`

**Checkpoint**: ルートから `pnpm build` を実行したとき全ワークスペースがビルド順に実行される

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: ドキュメント整備と動作確認

- [x] T039 [P] Create `README.md` at repo root covering: project overview, directory structure table, setup steps (`nvm use` → `pnpm install` → `pnpm build`)
- [ ] T040 Run `pnpm install` from repo root and confirm it succeeds with no errors — pnpm 未インストールのため手動確認が必要
- [ ] T041 Run `pnpm build` from repo root and confirm all workspaces build (stub implementations) — T040 完了後に実施
- [ ] T042 [P] Run quickstart.md validation steps to confirm SC-001, SC-002, SC-003 are met — T041 完了後に実施

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational completion
- **US2 (Phase 4)**: Depends on US1 completion (tsconfig.json files must exist before updating them)
- **US3 (Phase 5)**: Depends on US1 completion (package.json files must exist before adding scripts)
- **Polish (Phase N)**: Depends on US1, US2, US3 completion

### Parallel Opportunities per Phase

**Phase 1**: T003, T004 can run in parallel after T001, T002
**Phase 2**: T006, T007 can run in parallel after T005; T009, T010 run after T008
**Phase 3**: T011–T025 すべて並列実行可能（異なるワークスペースのファイル）
**Phase 4**: T027–T030 は T026 完了後に並列実行可能
**Phase 5**: T033–T038 は T031, T032 完了後に並列実行可能

---

## Parallel Example: User Story 1

```bash
# T011–T025 を全て並列で実行可能（それぞれ別ディレクトリ）
Task: "Create apps/web/package.json"          # T011
Task: "Create apps/batch/package.json"         # T015
Task: "Create packages/db/package.json"        # T018
Task: "Create infra/cdk/package.json"          # T022
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup 完了
2. Phase 2: Foundational 完了（CRITICAL）
3. Phase 3: US1 完了
4. **STOP and VALIDATE**: `pnpm install` が通り全ディレクトリが存在することを確認
5. US2、US3 は後続フィーチャーとして進められる

### Incremental Delivery

1. Phase 1 + 2 → ルート設定と共有パッケージ完成
2. Phase 3 (US1) → 全ワークスペース骨格完成 → **MVP!**
3. Phase 4 (US2) → TypeScript 継承が整備される
4. Phase 5 (US3) → ビルドパイプライン完成
5. Phase N → ドキュメント・動作確認

---

## Notes

- [P] タスクは異なるファイル・ディレクトリを操作するため依存関係なしで並列実行可能
- スタブファイルは `export {}` 一行で十分（型エラーを防ぐため）
- `apps/web/tsconfig.json` は US2 で tsconfig.nextjs.json を作成後に正式に更新するが、T012 では placeholder として参照先を記述しておく
- 各フェーズ完了後に git commit を推奨（`/speckit-git-commit`）
