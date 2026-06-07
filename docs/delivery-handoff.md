# 東京リーグ リニューアル納品ハンドオフ

最終更新: 2026-06-07 JST

この資料は、6/20納品時に共有する成果物、最終確認コマンド、本番環境で残る確認を1か所にまとめたハンドオフ用メモです。時刻の扱いは日本時間を基準にします。

## 納品パッケージ

| 区分 | 成果物 | パス・確認先 | 確認 |
| --- | --- | --- | --- |
| 公開サイト | 東京リーグ公開サイト | `app/`, `components/`, `public/site-assets/` | `npm run build`, `npm run test:e2e`, `npm run public:routes -- https://<production-domain>` |
| 管理者ツール | Owner / Editor 管理画面 | `app/admin/`, `components/admin-*`, `lib/admin-access.ts` | `npm run test:e2e`, `npm run admin:routes -- https://<production-domain>` |
| 仕様書PDF | データ設計・管理画面仕様・非機能要件 | `docs/output/tokyo-league-renewal-spec.pdf` | `npm run docs:spec`, `npm run docs:delivery:check` |
| 管理者ツール説明書PDF | 操作説明・画面別手順 | `docs/admin-manual/output/tokyo-league-admin-manual.pdf` | `npm run docs:admin`, `npm run docs:admin:qa` |
| 管理者説明書QA画像 | PDF目視確認用20ページ画像 | `docs/admin-manual/output/qa-pages/` | `npm run docs:admin:qa` |
| 本番Runbook | デプロイ、DB反映、初期Owner、OAuth、ロールバック | `docs/production-runbook.md` | 手順共有 |
| 納品チェックリスト | 納品物、非機能要件、残確認 | `docs/delivery-checklist.md` | 手順共有 |
| 納品前証跡 | コマンド結果と本番確認結果 | `docs/output/delivery-evidence-*.md` | `npm run delivery:evidence -- --production-url https://<production-domain> --env-file .env.production.local --include-build --include-e2e` |

## 最終確認コマンド

納品直前のローカル総合ゲート:

```bash
npm run delivery:gate
```

本番URL確定後の公開・管理・ヘッダー確認:

```bash
npm run public:routes -- https://<production-domain>
npm run admin:routes -- https://<production-domain>
npm run security:headers -- https://<production-domain>
```

本番環境変数の値非表示チェック:

```bash
vercel env pull .env.production.local --environment=production --yes
npm run security:prod-env -- .env.production.local
```

納品前証跡レポート:

```bash
npm run delivery:evidence -- --production-url https://<production-domain> --env-file .env.production.local --include-build --include-e2e
```

## 本番で残る確認

- Vercel Production Deployment URL が確定している
- Google OAuth承認済みリダイレクトURIが `https://<production-domain>/api/auth/callback/google` に限定されている
- Production環境に `E2E_TEST_MODE` が設定されていない
- `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `BLOB_READ_WRITE_TOKEN` がProductionに設定されている
- 初期Ownerメールアドレスが確定し、Googleログインに使うメールアドレスと一致している
- 本番DBへschema反映済みで、初期Owner登録済み
- Ownerでニュース、チーム、資料、担当割当、更新履歴を確認できる
- Editorで割当済みリーグの結果管理だけ操作できる
- 画像・資料アップロードがVercel Blobへ保存される
- PDF納品物のページ欠け、画像欠け、文字切れを目視確認済み

## 共有時の注意

- `.env.production.local`、OAuth Client Secret、DB接続URL、Blob token、初期Owner以外の管理者メール一覧は共有資料に含めない
- `npm run security:prod-env` と `npm run security:secrets` の結果は値を含まないため、証跡として共有できる
- 初期Ownerメールアドレスは必要最小限の関係者にだけ共有する
- 納品後の変更は `docs/production-runbook.md` のロールバック手順を確認してから本番反映する
