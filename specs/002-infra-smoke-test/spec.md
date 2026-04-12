# Feature Specification: Infrastructure Smoke Test

**Feature Branch**: `002-infra-smoke-test`
**Created**: 2026-04-12
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 - デプロイ前に作成される AWS リソースの全量を把握できる (Priority: P1)

開発者がデプロイコマンドを実行する前に、CDK が作成・変更・削除する AWS リソースの一覧を確認できる。差分を事前に把握することで、意図しないリソース変更を防ぐ。

**Why this priority**: リソースの全量を把握してから実行しないと、意図しないコストや構成変更が発生するリスクがある。実行前の確認が最も重要。

**Independent Test**: `cdk diff` 相当のコマンドを実行し、作成される全リソース（ロール・Lambda・VPC・RDS 等）がリスト形式で出力される。

**Acceptance Scenarios**:

1. **Given** CDK スタックが未デプロイの状態, **When** リソース確認コマンドを実行する, **Then** 作成予定の全 AWS リソースが種別・名称とともにリスト表示される
2. **Given** 既存スタックに変更を加えた状態, **When** リソース確認コマンドを実行する, **Then** 追加・変更・削除されるリソースの差分が明示される

---

### User Story 2 - サンプル Lambda が正常に動作することを確認できる (Priority: P2)

デプロイ完了後、Lambda 関数を呼び出して `{"status": "healthy"}` が返ることを確認できる。インフラ全体が正しく構成されていることの最低限の証明となる。

**Why this priority**: Lambda が動作しなければ、バッチ処理・API の本番実装に進む意味がない。P1 でリソース確認後、実際にデプロイして動作を検証する。

**Independent Test**: デプロイ済みの Lambda を呼び出し、レスポンスに `status: healthy` が含まれることを確認できる。

**Acceptance Scenarios**:

1. **Given** Lambda がデプロイ済み, **When** テスト呼び出しを実行する, **Then** `{"status": "healthy"}` が返る
2. **Given** Lambda がデプロイ済み, **When** 複数回連続して呼び出す, **Then** 毎回同じレスポンスが返りコールドスタート後も動作する

---

### User Story 3 - Lambda からデータベースへ接続できることを確認できる (Priority: P3)

Lambda 関数がデータベースへの接続を試み、接続成功・失敗を判別できるレスポンスを返す。ネットワーク構成（VPC・セキュリティグループ等）が正しく設定されていることを検証する。

**Why this priority**: DB 接続は本番機能の前提条件。Lambda のヘルスチェックが通った後に確認する。

**Independent Test**: DB 接続確認エンドポイントを呼び出し、`{"status": "healthy", "db": "connected"}` が返ることを確認できる。

**Acceptance Scenarios**:

1. **Given** Lambda と DB がデプロイ済み, **When** DB 接続確認の呼び出しを実行する, **Then** `{"db": "connected"}` を含むレスポンスが返る
2. **Given** DB 接続情報が誤っている状態, **When** 呼び出しを実行する, **Then** `{"db": "error", "message": "[エラー内容]"}` が返り、接続失敗の原因が判別できる

---

### Edge Cases

- CDK デプロイ中にタイムアウトが発生した場合、スタックが中途半端な状態になる可能性がある
- Lambda のコールドスタートにより最初の呼び出しでタイムアウトする可能性がある
- VPC 内の Lambda が DB のセキュリティグループで拒否される場合、接続エラーを適切に返す必要がある

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: デプロイ前にインフラ確認コマンドを実行でき、作成予定の全 AWS リソースが一覧表示されなければならない
- **FR-002**: リソース一覧には、リソース種別・論理 ID・推定される物理名が含まれなければならない
- **FR-003**: サンプル Lambda は呼び出し時に `{"status": "healthy"}` を含むレスポンスを返さなければならない
- **FR-004**: サンプル Lambda は DynamoDB への接続を試み、結果（成功 or 失敗と原因）をレスポンスに含めなければならない
- **FR-005**: Lambda のレスポンスは 30 秒以内に返らなければならない（タイムアウト上限）
- **FR-006**: デプロイは冪等でなければならない（同じコマンドを複数回実行しても同じ状態になる）

### Key Entities

- **batch-stack**: EventBridge Scheduler + Lambda + DynamoDB をまとめて管理するスタック
- **web-stack**: CloudFront + Lambda (Next.js SSR) をまとめて管理するスタック
- **サンプル Lambda**: ヘルスチェックと DynamoDB 接続確認のみを行うスタブ実装
- **DynamoDB**: batch-stack 内で管理される Single Table（VPC 不要・IAM 認証）

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `cdk diff` 相当コマンドが作成予定リソースを全量出力し、開発者がデプロイ前に 5 分以内に内容を確認できる
- **SC-002**: サンプル Lambda の呼び出しが 30 秒以内に完了し `{"status": "healthy"}` を含むレスポンスが返る
- **SC-003**: DB 接続確認の呼び出しが 30 秒以内に完了し `{"db": "connected"}` または `{"db": "error"}` のいずれかが返る（接続結果が判別できる）
- **SC-004**: 同じデプロイコマンドを 2 回実行したとき、2 回目は「変更なし」と判定される（冪等性の確認）

## Assumptions

- AWS アカウントおよび CLI 認証設定はすでに完了している
- デプロイ対象は `batch-stack` と `web-stack` の 2 スタック
- サンプル Lambda の実装は最小限（ヘルスチェック + DB 接続確認のみ）で、本番機能の実装はスコープ外
- DynamoDB はテーブル名を環境変数として Lambda に渡す（接続情報・パスワード不要）
- Lambda は VPC なしで動作し、IAM ロール経由で DynamoDB に接続する
- DynamoDB テーブルは batch-stack 内で作成される
