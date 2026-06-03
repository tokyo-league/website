# 東京リーグ 本番デプロイ・運用開始Runbook

最終更新: 2026-06-02 JST

このRunbookは、6/20納品前に本番環境を立ち上げ、公開サイト・管理者ツール・PDF納品物を確認するための手順です。時刻の扱いは日本時間を基準にします。

## 前提

- GitHub `main` ブランチがVercel本番デプロイ対象である
- PostgreSQLはNeonを想定する
- ファイル保存はVercel Blobを想定する
- 管理画面ログインはGoogle OIDC + NextAuthを使う
- 初期Ownerは `SEED_ADMIN_EMAIL` で登録する

## 必須環境変数

| name | environment | 用途 | 備考 |
| --- | --- | --- | --- |
| `DATABASE_URL` | Production / Preview / Development | Prismaの通常接続 | Neon pooled接続を設定 |
| `DIRECT_URL` | Production / Preview / Development | Prisma schema反映等の直接接続 | Neon direct接続を設定 |
| `AUTH_SECRET` | Production / Preview / Development | NextAuth署名鍵 | 長いランダム文字列。環境ごとに分ける |
| `AUTH_GOOGLE_ID` | Production / Preview / Development | Google OAuth Client ID | 本番ドメイン用OAuthクライアント |
| `AUTH_GOOGLE_SECRET` | Production / Preview / Development | Google OAuth Client Secret | リポジトリへコミットしない |
| `BLOB_READ_WRITE_TOKEN` | Production / Preview / Development | Vercel Blobアップロード | 管理画面の画像・資料アップロードに必要 |
| `SEED_ADMIN_EMAIL` | Local / one-off command | 初期Owner登録 | 本番常駐は不要。実行時だけ使う |
| `SEED_ADMIN_NAME` | Local / one-off command | 初期Owner表示名 | 未設定時は `Tokyo League Admin` |

## 初回デプロイ手順

1. Vercel ProjectをGitHubリポジトリに接続する
2. Vercel Dashboardで上記の必須環境変数を登録する
3. Google Cloud ConsoleでOAuth Clientを作成し、本番ドメインのリダイレクトURIを登録する
4. `main` ブランチをVercelへデプロイする
5. VercelのBuild Logsで `npm run build` が成功し、Prisma接続エラーが出ていないことを確認する
6. DB schemaを反映する
7. 初期Ownerを登録する
8. 本番URLで公開サイト・管理者ツールを確認する

## DB schema反映

ローカルから本番DBへ反映する場合:

```bash
vercel env pull .env.production.local --environment=production --yes
set -a && source .env.production.local && set +a
npm run prisma:generate
npm run prisma:push
```

Vercel/CI上で実行する場合も、Production用の `DATABASE_URL` と `DIRECT_URL` が読める状態で `npm run prisma:push` を実行します。現在のリポジトリはPrisma migrationディレクトリを持たないため、納品前のDB反映は `schema.prisma` を正本にした `prisma db push` で行います。

## 初期Owner登録

本番DBへ初期Ownerを登録する場合:

```bash
vercel env pull .env.production.local --environment=production --yes
set -a && source .env.production.local && set +a
SEED_ADMIN_EMAIL="owner@example.com" SEED_ADMIN_NAME="東京リーグ管理者" node ./scripts/seed-admin.mjs
```

確認事項:

- `SEED_ADMIN_EMAIL` はGoogleログインに使うメールアドレスと完全一致させる
- 初期Owner登録後、`/admin/assignments` からEditorを追加する
- 本番環境に `E2E_TEST_MODE=1` を設定しない。誤設定されても `NODE_ENV=production` ではアプリ側でE2Eバイパスを無効化する

## Google OAuth設定

本番OAuth Clientの承認済みリダイレクトURIに以下を登録します。

```text
https://<production-domain>/api/auth/callback/google
```

確認事項:

- Preview URLを本番OAuth Clientへ無制限に追加しない
- Production / Previewを分ける場合はOAuth Clientも分ける
- Google OAuthの公開ステータス、テストユーザー制限、組織制限を納品前に確認する

## 本番確認チェック

公開サイト:

- `/` でトップページが表示される
- `/competitions` から大会詳細、リーグ詳細へ遷移できる
- `/news` で公開ニュースが表示される
- `/teams` で公開チームが表示される
- `/downloads` で公開資料が表示される
- `/contact` で問い合わせ先が表示される

管理者ツール:

- `/admin` 未ログインアクセスで `/login?callbackUrl=/admin` へ遷移する
- 登録済みOwnerメールでGoogleログインできる
- 未登録または無効化済みGoogleアカウントでは管理画面へ入れない
- Ownerでニュース、チーム、資料、担当割当を操作できる
- Ownerで退任者を無効化でき、無効化済み担当者は管理画面へ入れない
- Editorで割当済みリーグの結果管理だけ操作できる
- 画像・資料アップロードがVercel Blobへ保存される

セキュリティ:

- `Content-Security-Policy` が付与されている
- `Strict-Transport-Security` が付与されている
- `X-Content-Type-Options: nosniff` が付与されている
- `Permissions-Policy` で不要なデバイス権限が無効化されている
- Vercel Production Environmentに `E2E_TEST_MODE` が存在しない。存在してもproductionではE2Eバイパスが無効化される

## 納品PDF生成

仕様書:

```bash
npm run docs:spec
```

出力:

- `docs/output/tokyo-league-renewal-spec.pdf`

管理者ツール説明書:

```bash
npm run docs:admin
```

出力:

- `docs/admin-manual/output/tokyo-league-admin-manual.pdf`

管理者ツール説明書のQA画像:

```bash
npm run docs:admin:qa
```

出力:

- `docs/admin-manual/output/qa-pages/`

## ロールバック

本番反映後に重大な問題が出た場合:

1. Vercel Dashboardで直前の安定Deploymentを確認する
2. Production aliasを直前Deploymentへ戻す、またはVercel CLIでrollbackする
3. DB migrationを伴う変更の場合は、データ互換性と復旧手順を確認してから切り戻す
4. Google OAuth、環境変数、Blobの変更が原因の場合はDashboard設定も合わせて戻す

## 納品前の最終証跡

納品直前に以下を保存・共有します。

- Vercel Production Deployment URL
- `npm run build` の成功ログ
- `npm run test:e2e` の成功ログ
- 仕様書PDF
- 管理者ツール説明書PDF
- 初期Ownerメールアドレス
- 本番環境変数の設定有無チェック結果。値そのものは共有しない
