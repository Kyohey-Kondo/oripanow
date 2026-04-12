# Research: Project Directory Setup

**Feature**: 001-project-dir-setup
**Date**: 2026-04-12

## Decision Log

### パッケージマネージャー

- **Decision**: pnpm workspaces
- **Rationale**: 要件定義ドラフト Section 6.2 に明示。モノリポでの依存共有が効率的で、シンボリックリンク管理が優れている。
- **Alternatives considered**: npm workspaces（機能不足）、yarn berry（複雑性が高い）

### ビルドオーケストレーター

- **Decision**: Turborepo (`turbo.json`)
- **Rationale**: 要件定義ドラフト Section 6.2 に明示。タスクのキャッシュ・並列実行が標準でサポートされる。
- **Alternatives considered**: Nx（設定が重い）、Lerna（低機能）

### Node.js バージョン

- **Decision**: Node.js 22 LTS（`.nvmrc` で固定）
- **Rationale**: 2026年時点での LTS。Next.js 15 が要求する最低バージョン（18以上）を満たす。
- **Alternatives considered**: Node.js 20 LTS（サポート期限が近い）

### TypeScript 設定方針

- **Decision**: `packages/config/tsconfig.base.json` を共通基底とし、各ワークスペースが extends
- **Rationale**: strict モードを全体で統一し、重複排除。
- **Structure**:
  - `packages/config/tsconfig.base.json` — 共通 strict 設定
  - `packages/config/tsconfig.nextjs.json` — Next.js 向け extends
  - 各アプリの `tsconfig.json` — プロジェクト固有設定

### ESLint 設定方針

- **Decision**: `packages/config/eslint-base.js` を共通設定として提供
- **Rationale**: ESLint Flat Config (v9) を採用。全ワークスペースで一貫したコード品質。

### Turborepo パイプライン設計

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "lint": {},
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### CDK バージョン

- **Decision**: AWS CDK v2
- **Rationale**: v1 は EOL。v2 はモノリポとの相性が良く、TypeScript ファーストで設計されている。

## 未解決事項

なし（すべて要件定義ドラフトで確定済み）
