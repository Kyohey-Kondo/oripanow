---
description: "Task list for Infrastructure Smoke Test"
---

# Tasks: Infrastructure Smoke Test

**Branch**: `002-infra-smoke-test` | **Feature**: `specs/002-infra-smoke-test/`
**Input**: plan.md, spec.md, contracts/lambda-health-check.md, quickstart.md
**Tech**: AWS CDK v2, Lambda Node.js 22.x, DynamoDB, TypeScript 5.x, pnpm

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: CDK と Lambda の依存パッケージをセットアップし、ビルドが通る状態にする

- [x] T001 `esbuild` を `infra/cdk` の devDependency に追加する（`NodejsFunction` のバンドラーとして必須）`infra/cdk/package.json`
- [x] T002 `@aws-sdk/client-dynamodb` と `@aws-sdk/lib-dynamodb` を `apps/batch` の dependencies に追加する `apps/batch/package.json`
- [x] T003 pnpm install を実行してロックファイルを更新する（`pnpm install` at repo root）

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: CDK スタックの骨格を実装する。US1 の `cdk synth/diff` と US2/US3 の Lambda デプロイはここに依存する

**⚠️ CRITICAL**: このフェーズが完了するまで US1〜US3 の実装は開始できない

- [x] T004 `infra/cdk/bin/app.ts` を実装する — `BatchStack` と `WebStack` を CDK App に登録するエントリーポイント `infra/cdk/bin/app.ts`
- [x] T005 `infra/cdk/lib/batch-stack.ts` を実装する — DynamoDB テーブル（`oripa-now`、PK+SK、GSI × 3、オンデマンド）・IAM ロール・IAM ポリシー（GetItem/PutItem/Query/UpdateItem）・`NodejsFunction`（ヘルスチェック Lambda）・CloudWatch Log Group を定義する `infra/cdk/lib/batch-stack.ts`
- [x] T006 [P] `infra/cdk/lib/web-stack.ts` を実装する — Lambda（Next.js スタブ）・CloudFront Distribution・S3 Bucket・IAM ロール・CloudWatch Log Group を定義するスタブ実装 `infra/cdk/lib/web-stack.ts`

**Checkpoint**: `pnpm --filter @oripa-now/infra synth` が成功し CloudFormation テンプレートが生成される

---

## Phase 3: User Story 1 — デプロイ前の AWS リソース全量確認 (Priority: P1) 🎯 MVP

**Goal**: 開発者が `cdk synth` / `cdk diff` を実行し、作成予定の全 AWS リソースを種別・論理 ID とともに確認できる

**Independent Test**: `pnpm cdk synth` が成功し、出力 CloudFormation テンプレートに DynamoDB Table・IAM Role × 2・Lambda × 2・CloudFront Distribution・S3 Bucket のリソースが含まれる

### Implementation for User Story 1

- [x] T007 [US1] `infra/cdk/cdk.json` の `app` エントリを確認・修正し `ts-node` または `esbuild-register` で `bin/app.ts` が実行できることを確認する `infra/cdk/cdk.json`
- [x] T008 [US1] `pnpm --filter @oripa-now/infra synth` を実行し、batch-stack に DynamoDB・IAM・Lambda の各リソースが + 表示されることを確認する（手動 smoke test）
- [x] T009 [US1] `pnpm --filter @oripa-now/infra run deploy -- --require-approval never --all` の代わりに `pnpm cdk diff` を実行し、作成予定リソース一覧が表示されることを確認する（手動 smoke test）

**Checkpoint**: `cdk diff` 出力で batch-stack（5 リソース）と web-stack（5 リソース）の全量が確認できる — SC-001 達成

---

## Phase 4: User Story 2 — Lambda ヘルスチェック (Priority: P2)

**Goal**: デプロイ済みの Lambda を `aws lambda invoke` で呼び出すと `{"status":"healthy"}` を含むレスポンスが返る

**Independent Test**: `aws lambda invoke --function-name <name> --payload '{}'` の結果 JSON に `"status":"healthy"` と `"timestamp"` が含まれる

### Implementation for User Story 2

- [x] T010 [US2] `apps/batch/src/index.ts` に Lambda ハンドラーを実装する — イベントを受け取り `{ statusCode: 200, body: { status: "healthy", timestamp: new Date().toISOString() } }` を返す最小実装（DB 接続なし） `apps/batch/src/index.ts`
- [x] T011 [US2] `infra/cdk/lib/batch-stack.ts` の `NodejsFunction` で `entry` を `apps/batch/src/index.ts` に、`handler` を `index.handler` に設定し `runtime: Runtime.NODEJS_22_X` を指定する `infra/cdk/lib/batch-stack.ts`
- [ ] T012 [US2] `pnpm cdk deploy batch-stack --require-approval never` でデプロイし `aws lambda invoke` で `{"status":"healthy"}` が返ることを手動確認する（quickstart.md 手順 2〜3 に相当）

**Checkpoint**: Lambda の呼び出しが 30 秒以内に完了し `status: healthy` が返る — SC-002 達成

---

## Phase 5: User Story 3 — DynamoDB 接続確認 (Priority: P3)

**Goal**: Lambda が DynamoDB の `DescribeTable` を試み、結果を `{"db":"connected"}` または `{"db":"error","dbError":"..."}` として返す

**Independent Test**: `aws lambda invoke` の結果 JSON に `"db":"connected"` が含まれ `"dbLatencyMs"` が 30000 未満である

### Implementation for User Story 3

- [x] T013 [US3] `apps/batch/src/index.ts` の Lambda ハンドラーに DynamoDB 接続確認ロジックを追加する — `DynamoDBClient` + `DescribeTableCommand` で `DYNAMODB_TABLE_NAME` のテーブルを確認し、成功時は `db: "connected", dbLatencyMs: <ms>` 、失敗時は `db: "error", dbError: <message>` をレスポンスに含める `apps/batch/src/index.ts`
- [x] T014 [US3] `infra/cdk/lib/batch-stack.ts` の Lambda に `DYNAMODB_TABLE_NAME` 環境変数（DynamoDB テーブル名）を渡すよう設定する `infra/cdk/lib/batch-stack.ts`
- [ ] T015 [US3] `pnpm cdk deploy batch-stack --require-approval never` で再デプロイし `aws lambda invoke` で `{"db":"connected"}` が返ることを手動確認する（quickstart.md 手順 3 に相当）

**Checkpoint**: Lambda が DynamoDB に接続でき `db: connected` が返る — SC-003 達成

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 冪等性確認とドキュメント整合性チェック

- [x] T016 [P] 2 回目の `pnpm cdk diff` を実行し「There were no differences」が表示されることを確認する — SC-004 冪等性検証
- [x] T017 [P] `infra/cdk/tsconfig.json` を確認し `apps/batch/src/` のパスが `NodejsFunction` の `entry` と一致していることを確認する
- [x] T018 quickstart.md のトラブルシューティング手順（`AccessDeniedException` / `ResourceNotFoundException`）が実際の IAM ポリシー・環境変数設定と一致することを確認する `specs/002-infra-smoke-test/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし — 即開始可能
- **Foundational (Phase 2)**: Phase 1 完了後 — **全 US をブロック**
- **US1 (Phase 3)**: Phase 2 完了後 — `cdk synth/diff` の手動確認のみ
- **US2 (Phase 4)**: Phase 2 完了後 — US1 と並行実施可能
- **US3 (Phase 5)**: Phase 4 完了後 — US2 の Lambda ハンドラーに追記するため直列
- **Polish (Phase 6)**: US2 + US3 完了後

### User Story Dependencies

- **US1**: Phase 2 完了後すぐ開始可能（手動確認のみ）
- **US2**: Phase 2 完了後すぐ開始可能（US1 と並行）
- **US3**: US2 完了後（同一ファイル `apps/batch/src/index.ts` に追記）

### Parallel Opportunities

- T005 と T006 は異なるファイル → 並行可能
- US1（T007〜T009）と US2（T010〜T012）は異なるファイル → 並行実施可能
- Phase 6 の T016・T017 は並行可能

---

## Parallel Example: Foundational Phase

```bash
# T005 と T006 は別ファイルなので並行実施可能:
Task: "batch-stack.ts 実装 (DynamoDB + IAM + Lambda)"
Task: "web-stack.ts 実装 (CloudFront + S3 + Lambda スタブ)"
```

---

## Implementation Strategy

### MVP First (User Story 1 のみ)

1. Phase 1: Setup（T001〜T003）
2. Phase 2: Foundational（T004〜T006）
3. Phase 3: US1（T007〜T009）— `cdk synth/diff` でリソース全量確認
4. **STOP and VALIDATE**: `cdk diff` 出力で 10 リソースすべてを確認

### Incremental Delivery

1. Setup + Foundational → CDK テンプレート生成確認
2. US1 → `cdk diff` でリソース確認 → **MVP**
3. US2 → Lambda ヘルスチェックデプロイ・動作確認
4. US3 → DynamoDB 接続確認追加
5. Polish → 冪等性確認

---

## Notes

- [P] タスクは異なるファイルを対象とするため並行実施可能
- `apps/batch/src/index.ts` は US2（T010）と US3（T013）で同一ファイルに追記するため直列
- `infra/cdk/lib/batch-stack.ts` も US2（T011）と US3（T014）で同一ファイルを変更するため直列
- `NodejsFunction` は `esbuild` を使って `entry` のファイルをバンドルするため、`esbuild` が devDependency に必要（T001）
- デプロイには有効な AWS CLI 認証情報と CDK ブートストラップ済み環境が必要（`cdk bootstrap`）
