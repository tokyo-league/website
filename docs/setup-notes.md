# セットアップメモ

最終更新: 2026-06-01 JST

## 現在の構成

- フロントエンド: Next.js App Router
- スタイリング: CSS
- データ層: Prisma + PostgreSQL 想定

## ローカルセットアップ

1. `.env.example` を `.env.local` か `.env.dev` に反映
2. `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `BLOB_READ_WRITE_TOKEN` を設定
3. `npm install`
4. `npm run prisma:generate`
5. `npm run prisma:validate`
6. `npm run dev`

補足:

- 実行ラッパーが `.env.local` -> `.env.dev` -> `.env` の順で読み込む
- Next.js 本体は通常どおり `.env.local` を優先する
- 本番デプロイと運用開始の詳細は `docs/production-runbook.md` を参照する

## 本番導入の要点

1. Vercel Production環境に必須環境変数を設定する
2. Google Cloud Consoleで本番ドメインのOAuth Clientを設定する
3. `npx prisma migrate deploy` でDB schemaを反映する
4. `SEED_ADMIN_EMAIL` を指定して `npm run prisma:seed-admin` を実行する
5. `/admin` でOwnerログインとEditor割当を確認する
6. `docs/delivery-checklist.md` の納品前確認を消化する

## 備考

- Googleログインのみ実装対象
- 管理者テーブルに存在しないメールアドレスはログイン不可
- 管理者への初期登録は現状 `npm run prisma:seed-admin` か DB 直接投入のみで、管理画面UIはまだない
- `npm run prisma:seed-admin` 実行時は `SEED_ADMIN_EMAIL` が必要
- Neon を使う場合、`DATABASE_URL` は pooled 接続、`DIRECT_URL` は direct 接続を使う
- チーム画像アップロードには Vercel Blob の `BLOB_READ_WRITE_TOKEN` が必要
- 更新系サーバアクションでは、入力の正規化、形式検証、長さ制限を必須にする
- React の自動エスケープ前提で `dangerouslySetInnerHTML` は使わない
