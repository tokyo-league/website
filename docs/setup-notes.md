# セットアップメモ

最終更新: 2026-03-22 JST

## 現在の構成

- フロントエンド: Next.js App Router
- スタイリング: CSS
- データ層: Prisma + PostgreSQL 想定

## ローカルセットアップ

1. `.env.example` を `.env.local` か `.env.dev` に反映
2. `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` を設定
3. `npm install`
4. `npm run prisma:generate`
5. `npm run prisma:validate`
6. `npm run dev`

補足:

- 実行ラッパーが `.env.local` -> `.env.dev` -> `.env` の順で読み込む
- Next.js 本体は通常どおり `.env.local` を優先する

## 今後の導入順

1. Prisma migration の作成
2. `admins` 初期データ投入
3. Google Cloud Console で OAuth クライアント作成
4. 管理画面の大会・リーグ・チーム CRUD
5. 試合結果 / 順位表 CRUD
6. ニュース CRUD

## 備考

- Googleログインのみ実装対象
- `admins` テーブルに存在しないメールアドレスはログイン不可
- `npm run prisma:seed-admin` 実行時は `SEED_ADMIN_EMAIL` が必要
- Neon を使う場合、`DATABASE_URL` は pooled 接続、`DIRECT_URL` は direct 接続を使う
