---
description: "Task list for SSR Sample Page"
---

# Tasks: SSR Sample Page

**Branch**: `003-ssr-sample` | **Feature**: `specs/003-ssr-sample/`
**Input**: plan.md, spec.md, contracts/ssr-page.md, data-model.md, research.md, quickstart.md
**Tech**: Next.js 15 (App Router, standalone), serverless-http, TypeScript 5.x, Lambda Node.js 22.x

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 依存パッケージの追加と Next.js standalone ビルド設定

- [ ] T001 `serverless-http` と `@types/serverless-http` を `apps/web` の dependencies に追加する `apps/web/package.json`
- [ ] T002 `next.config.ts` に `output: 'standalone'` を追加する `apps/web/next.config.ts`
- [ ] T003 `apps/web` のディレクトリ構成を作成する — `app/`・`src/stubs/` ディレクトリを用意する `apps/web/`
- [ ] T004 pnpm install を実行してロックファイルを更新する（repo root で `pnpm install`）

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: スタブデータと Lambda ハンドラーの基盤を構築する。US1・US2 はここに依存する

**⚠️ CRITICAL**: このフェーズが完了するまで US1・US2 の実装は開始できない

- [ ] T005 `OripaPost` 型とスタブデータを実装する — `STUB_ORIPA_POSTS` 配列（3〜5 件）を export する `apps/web/src/stubs/oripa-posts.ts`
- [ ] T006 Lambda ハンドラーを実装する — `serverless-http` + Next.js standalone サーバーをラップし `handler` を export する `apps/web/src/lambda.ts`
- [ ] T007 `apps/web/package.json` の `build` スクリプトに postbuild を追加する — `next build` 後に `lambda.ts` のコンパイル済みファイルを `.next/standalone/` にコピーする `apps/web/package.json`
- [ ] T008 CDK `web-stack.ts` を更新する — `lambda.Code.fromInline` を `lambda.Code.fromAsset(path.join(__dirname, '../../../apps/web/.next/standalone'))` に変更し `handler` を `lambda.handler` に設定する `infra/cdk/lib/web-stack.ts`

**Checkpoint**: `pnpm --filter @oripa-now/web build` が成功し `.next/standalone/` が生成される

---

## Phase 3: User Story 1 — ブラウザでページを開くとコンテンツが表示される (Priority: P1) 🎯 MVP

**Goal**: curl で CloudFront URL にアクセスしたとき、サーバー生成 HTML が返る（SSR の証明）

**Independent Test**: `curl -s https://<cloudfront-domain>/` でレスポンスが HTML であり、`<html>` タグと何らかのコンテンツが含まれる

### Implementation for User Story 1

- [ ] T009 [US1] `apps/web/app/layout.tsx` を実装する — `<html lang="ja">` と `<body>` を含む最小レイアウト `apps/web/app/layout.tsx`
- [ ] T010 [US1] `apps/web/app/page.tsx` を実装する — Server Component として `STUB_ORIPA_POSTS` を import し `<h1>` + コンテンツを含む HTML を返す（`'use client'` なし） `apps/web/app/page.tsx`
- [ ] T011 [US1] `pnpm --filter @oripa-now/web build` を実行し standalone ビルドが成功することを確認する
- [ ] T012 [US1] `DEPLOY_ENV=dev pnpm --filter @oripa-now/infra run deploy -- dev-web-stack --require-approval never` でデプロイし `curl` で HTML レスポンスを確認する（quickstart.md 手順参照）

**Checkpoint**: `curl https://<cloudfront-domain>/` が `text/html` を返し `<html>` が含まれる — SC-001・SC-004 達成

---

## Phase 4: User Story 2 — スタブデータがページ上に一覧表示される (Priority: P2)

**Goal**: HTML ソースにスタブデータ（店舗名・商品名・日付・価格）が含まれている

**Independent Test**: `curl -s https://<cloudfront-domain>/ | grep "カードショップ"` が 1 件以上マッチする

### Implementation for User Story 2

- [ ] T013 [US2] `apps/web/app/page.tsx` を更新する — `STUB_ORIPA_POSTS` を `<ul><li>` で一覧表示し、店舗名・商品名・販売日・価格を表示する `apps/web/app/page.tsx`
- [ ] T014 [US2] ビルド & デプロイを実行し `curl -s <url> | grep -E "(カードショップ|オリパ|¥)"` でデータが HTML に含まれることを確認する（手動確認）

**Checkpoint**: HTML ソースにスタブデータ全件が含まれる — SC-002・SC-003 達成

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: エラーハンドリングとローカル開発確認

- [ ] T015 [P] `apps/web/app/page.tsx` に空データ時の表示を追加する — `STUB_ORIPA_POSTS` が空のとき「発売情報はありません」と表示する `apps/web/app/page.tsx`
- [ ] T016 [P] ローカル開発サーバーで動作確認する — `pnpm --filter @oripa-now/web dev` で `http://localhost:3000` にアクセスしスタブデータが表示されることを確認する（手動確認）
- [ ] T017 quickstart.md のビルド・確認コマンドが実際の手順と一致することを検証する `specs/003-ssr-sample/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし — 即開始可能
- **Foundational (Phase 2)**: Phase 1 完了後 — **全 US をブロック**
- **US1 (Phase 3)**: Phase 2 完了後 — MVP
- **US2 (Phase 4)**: Phase 3 完了後 — page.tsx に追記するため US1 の後
- **Polish (Phase 5)**: US1 + US2 完了後

### User Story Dependencies

- **US1**: Phase 2 完了後すぐ開始可能
- **US2**: US1 完了後（同一ファイル `apps/web/app/page.tsx` に追記）

### Parallel Opportunities

- T005（スタブデータ）と T006（Lambda ハンドラー）は別ファイル → 並行可能
- T009（layout.tsx）は T010（page.tsx）と別ファイル → 並行可能
- Phase 5 の T015・T016・T017 は並行可能

---

## Parallel Example: Foundational Phase

```bash
# T005 と T006 は別ファイルなので並行実施可能:
Task: "STUB_ORIPA_POSTS を apps/web/src/stubs/oripa-posts.ts に実装"
Task: "Lambda ハンドラーを apps/web/src/lambda.ts に実装"
```

---

## Implementation Strategy

### MVP First (User Story 1 のみ)

1. Phase 1: Setup（T001〜T004）
2. Phase 2: Foundational（T005〜T008）
3. Phase 3: US1（T009〜T012）— curl で HTML を確認
4. **STOP and VALIDATE**: `curl <url>` で `<html>` タグが返ることを確認

### Incremental Delivery

1. Setup + Foundational → ビルド基盤完成
2. US1 → curl で SSR 確認（MVP）
3. US2 → スタブデータが HTML に含まれることを確認
4. Polish → エラーハンドリング・ローカル確認

---

## Notes

- T006（lambda.ts）は Next.js standalone の `server.js` を wrap するため、T011（ビルド）実行後でないとパス解決できない点に注意
- `apps/web/app/page.tsx` は US1（T010）と US2（T013）で同一ファイルを変更するため直列
- Lambda のコールドスタートは最大数秒かかるため、デプロイ直後の初回 curl は遅い可能性がある（SC-001 の 5 秒以内はウォームスタート時の値）
- CDK web-stack の変更（T008）は batch-stack に影響しない
