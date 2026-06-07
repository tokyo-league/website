# 東京リーグ リニューアル納品チェックリスト

最終更新: 2026-06-07 JST

## 納品物

| 納品物 | 現在の成果物 | 生成・確認コマンド | 状態 |
| --- | --- | --- | --- |
| サイト | `app/`, `components/`, `public/site-assets/` | `npm run build`, `npm run test:e2e` | ローカル検証済み |
| 管理者ツール | `app/admin/`, `components/admin-*`, `lib/admin-access.ts` | `npm run test:e2e` | E2Eモードで検証済み |
| 仕様書PDF | `docs/output/tokyo-league-renewal-spec.pdf` | `npm run docs:spec` | 生成済み |
| 管理者ツール説明書PDF | `docs/admin-manual/output/tokyo-league-admin-manual.pdf` | `npm run docs:admin` | 生成済み |
| 管理者説明書QA画像 | `docs/admin-manual/output/qa-pages/` | `npm run docs:admin:qa` | 19ページ生成済み |
| 本番デプロイRunbook | `docs/production-runbook.md` | 手順確認 | 作成済み |

## 非機能要件: セキュリティ

| 項目 | 実装・証跡 | 状態 |
| --- | --- | --- |
| 管理画面認証 | NextAuth + Google OIDC、DB有効登録メールのみ許可 | 実装済み |
| 権限管理 | `OWNER` / `EDITOR`、担当リーグ割当、担当者無効化 | 実装済み |
| サーバー側認可 | `requireOwner`, `getAdminScope` をサーバーアクションで使用 | 実装済み |
| Production環境変数検出 | Productionで必須環境変数の欠落を起動時検出 | 実装済み |
| 本番env安全確認 | `npm run security:prod-env -- .env.production.local` で必須項目、E2E誤設定、OAuth/DB/Blob形式を値非表示で確認 | 実装済み |
| E2Eバイパス本番無効化 | `lib/test-mode.ts`、`tests/e2e/security.spec.ts` | 実装済み |
| 入力サニタイズ | `lib/security.ts` と各管理アクション | 実装済み |
| 外部URL制限 | 公式サイトURL、画像パスは `http` / `https` または安全な相対パスのみ許可 | 実装済み |
| アップロード制限 | 画像・資料のMIME type、拡張子、ファイル内容、サイズ制限 | 実装済み |
| HTTPセキュリティヘッダー | `next.config.ts` | 実装済み |
| 管理画面noindex/no-store | `/admin`, `/login`, `/api/auth/*` に `X-Robots-Tag` と `Cache-Control` | 実装済み |
| robots.txt | `/admin`, `/login`, `/api/auth` のクロール禁止 | 実装済み |
| ヘッダー回帰テスト | `tests/e2e/security.spec.ts` | E2E通過 |
| 非機能仕様書記載 | `docs/data-model-and-admin-spec.md` | 記載済み |

## 直近の検証結果

- `npm run test:e2e`: 21件成功
- `npm run build`: 成功。公開トップとニュース一覧は動的レンダリング化し、ビルド時のDB接続エラーログなし
- `npm run docs:spec`: 成功
- `npm run docs:admin`: 成功
- `npm run docs:admin:qa`: 成功

## 納品前に残す確認

- 本番デプロイURLで公開サイトの主要導線を確認する
- 本番デプロイURLで管理画面ログイン、Owner操作、Editor操作を確認する
- 本番環境の `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `DATABASE_URL`, `DIRECT_URL`, `BLOB_READ_WRITE_TOKEN` を `npm run security:prod-env -- .env.production.local` で確認する
- Google OAuthのリダイレクトURIが本番ドメインだけに限定されていることを確認する
- 初期Ownerメールアドレスを確定し、`npm run prisma:seed-admin` またはDB管理画面で登録する
- Neon DB接続が本番ビルド・実行時に安定していることを確認する
- PDF納品物のページ欠け、画像欠け、文字切れを最終目視確認する
- `docs/production-runbook.md` に沿って本番反映・ロールバック手順を関係者へ共有する
