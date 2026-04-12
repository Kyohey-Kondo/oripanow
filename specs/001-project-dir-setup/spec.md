# Feature Specification: Project Directory Setup

**Feature Branch**: `001-project-dir-setup`
**Created**: 2026-04-12
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 開発者がリポジトリをクローンしてすぐに作業を開始できる (Priority: P1)

開発者がリポジトリをクローンした際、プロジェクトのディレクトリ構造が整備されており、各アプリケーション・パッケージ・インフラの配置が一目でわかる状態になっている。

**Why this priority**: モノリポ構成の土台が整っていないと後続のすべての開発作業が始められない。

**Independent Test**: リポジトリをクローンし、`apps/web`・`apps/batch`・`packages/db`・`packages/types`・`packages/config`・`infra/cdk` の各ディレクトリが存在し、それぞれに用途がわかる最低限のファイル（`package.json` や `README.md` 等）が配置されていれば完了。

**Acceptance Scenarios**:

1. **Given** 空のリポジトリ, **When** セットアップを実行する, **Then** モノリポの全ディレクトリが作成される
2. **Given** セットアップ済みのリポジトリ, **When** ルートの `package.json` を確認する, **Then** ワークスペースに全パッケージが列挙されている

---

### User Story 2 - 開発者が共通設定を各アプリで再利用できる (Priority: P2)

TypeScript・Lint などの共通設定が `packages/config` に集約されており、各アプリが継承して使える。

**Why this priority**: 設定の重複を防ぎ、コード品質を一貫して保つための基盤。

**Independent Test**: `packages/config` の共通 TSConfig を `apps/web` の `tsconfig.json` が継承していることを確認できる。

**Acceptance Scenarios**:

1. **Given** セットアップ済みの構成, **When** `apps/web/tsconfig.json` を確認する, **Then** `packages/config` の基底設定を extends している

---

### User Story 3 - 開発者がビルドコマンド一発でモノリポ全体を操作できる (Priority: P3)

ルートで単一コマンドを実行することで、全ワークスペースのビルド・型チェック・Lint が実行できる。

**Why this priority**: 開発体験の向上と CI 実行効率のため。

**Independent Test**: ルートで `pnpm build`（または相当コマンド）を実行したとき、全パッケージのビルドが順次実行される。

**Acceptance Scenarios**:

1. **Given** セットアップ済みの構成, **When** ルートで `pnpm build` を実行する, **Then** 全ワークスペースがビルドされる（ダミー実装で可）

---

### Edge Cases

- `packages/db` など依存関係のあるパッケージが先にビルドされない場合のビルド順序の問題
- Node.js / pnpm のバージョン不一致による依存解決失敗

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: リポジトリは `apps/web`・`apps/batch`・`packages/db`・`packages/types`・`packages/config`・`infra/cdk` のディレクトリ構成を持たなければならない
- **FR-002**: ルートの `package.json` は pnpm workspaces として全パッケージを列挙しなければならない
- **FR-003**: 各ワークスペースは独自の `package.json` を持ち、パッケージ名・依存関係を宣言しなければならない
- **FR-004**: `packages/config` は言語共通設定を提供し、各アプリが継承して使用できなければならない
- **FR-005**: ビルドオーケストレーション設定が存在し、パッケージ間の依存順序を定義しなければならない
- **FR-006**: バージョン固定・除外パターン等の開発環境共通ファイルがルートに配置されなければならない

### Key Entities

- **apps/web**: エンドユーザー向け Web アプリケーション
- **apps/batch**: 定期実行バッチ処理（ツイート取得・AI解析）
- **packages/db**: データベーススキーマと型定義
- **packages/types**: アプリ間共有の型定義
- **packages/config**: ESLint・TSConfig 等の共通設定
- **infra/cdk**: インフラ定義（IaC）

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: リポジトリをクローンして依存インストール後、5分以内に全ワークスペースのビルドが完了する
- **SC-002**: 新規開発者がディレクトリ構成を見てどのアプリがどこにあるか 1 分以内に把握できる（各ディレクトリに `package.json` の `description` または `README.md` が存在する）
- **SC-003**: ルートから単一コマンドで全パッケージの型チェックが実行できる

## Assumptions

- pnpm workspaces + Turborepo をパッケージ管理・ビルドオーケストレーションとして使用する（要件定義ドラフト Section 6.2 に基づく）
- 各アプリの実装コード（ページ・ハンドラー等）はこのフィーチャーのスコープ外とし、ディレクトリ骨格と最低限の設定ファイルのみ作成する
- Node.js バージョンは `.nvmrc` で固定する
- TypeScript は全ワークスペースで共通利用する
