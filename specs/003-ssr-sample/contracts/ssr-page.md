# Contract: SSR Sample Page

**URL**: CloudFront Distribution ドメイン（`https://<distribution-id>.cloudfront.net/`）
**Method**: GET
**Handler**: `apps/web/src/lambda.ts` → Next.js Server Component (`apps/web/app/page.tsx`)

## Request

```
GET / HTTP/1.1
Host: <cloudfront-domain>
```

パラメータなし。認証不要。

## Response

### 成功時

```
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
```

```html
<!DOCTYPE html>
<html lang="ja">
  <head><title>オリパ発売情報</title></head>
  <body>
    <h1>オリパ発売情報</h1>
    <ul>
      <li>カードショップ秋葉原 — ポケモンカードオリパ 151弾 — 2026-04-15 — ¥3,000</li>
      <!-- ... -->
    </ul>
  </body>
</html>
```

**検証ポイント**:
- HTML ソース（`curl` で取得）にスタブデータの文字列が含まれること
- `<li>` 要素が 3 件以上あること
- JavaScript 実行前（curl 環境）でコンテンツが確認できること

### エラー時

```
HTTP/1.1 500 Internal Server Error
Content-Type: text/html
```

スタブデータ取得失敗時は Next.js のデフォルトエラーページを返す。

## 制約

- レスポンスは 5 秒以内に返る（Lambda タイムアウト 30 秒の範囲内）
- HTML は UTF-8 エンコーディング
- CloudFront キャッシュは無効（`CACHING_DISABLED` ポリシー適用済み）
