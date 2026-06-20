# 東京リーグ 本番デプロイ・運用開始Runbook

最終更新: 2026-06-10 JST

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
| `RESEND_API_KEY` | Production / Preview / Development | 問い合わせメール送信 | Resendの送信専用APIキー |
| `CONTACT_FROM_EMAIL` | Production / Preview / Development | 問い合わせメール送信元 | Resendで認証済みの送信元アドレス |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Production / Preview / Development | 問い合わせスパム対策 | Cloudflare Turnstileの公開キー |
| `TURNSTILE_SECRET_KEY` | Production / Preview / Development | 問い合わせスパム対策 | Cloudflare Turnstileの秘密キー |
| `SEED_ADMIN_EMAIL` | Local / one-off command | 初期Owner登録 | 本番常駐は不要。実行時だけ使う |
| `SEED_ADMIN_NAME` | Local / one-off command | 初期Owner表示名 | 未設定時は `Tokyo League Admin` |

Production環境では `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` の欠落をアプリ起動時に検出します。`DIRECT_URL` はPrisma schema反映などのDB運用コマンドで必要なため、納品前チェックで確認します。Preview / Development ではローカル検証や画面確認を優先し、未設定時はログイン画面に設定メモを表示します。

納品前にはVercel Production環境変数をpullし、値を表示せずに必須項目と主要な形式だけを検査します。

```bash
vercel env pull .env.production.local --environment=production --yes
npm run security:prod-env -- .env.production.local --production-url https://<production-domain>
npm run security:prod-services -- .env.production.local
```

このコマンドは `E2E_TEST_MODE` の誤設定、短すぎる `AUTH_SECRET`、Google OAuth Client ID形式、PostgreSQL URL形式、Vercel Blob read/write token形式、`AUTH_URL` / `NEXTAUTH_URL` が設定されている場合の本番URL origin一致を確認します。結果は値そのものを含まないため、納品前証跡として共有できます。

`security:prod-services` はProduction envを使ってNeon DBへ接続し、主要テーブルをread確認します。Vercel Blobは `list` でstore到達を確認し、値やBlob URLは表示しません。書き込みまで確認する場合だけ `npm run security:prod-services -- .env.production.local --write-probe` を実行します。この場合は `delivery-healthcheck/` 配下へ小さな疎通ファイルを書き込み、すぐ削除します。

リポジトリ側の秘密情報混入も納品前に確認します。

```bash
npm run security:secrets
```

このコマンドは追跡済みenv、納品証跡Markdown、秘密鍵、実トークンらしき値がリポジトリに含まれていないことを確認します。

依存関係の取得元とlockfileも納品前に確認します。

```bash
npm run security:supply-chain
```

このコマンドは `package-lock.json`、直接依存の取得元、lockfileのresolved URL、integrity、root install hookを確認します。

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
npm run prisma:validate
npm run prisma:push
```

Vercel/CI上で実行する場合も、Production用の `DATABASE_URL` と `DIRECT_URL` が読める状態で `npm run prisma:validate` と `npm run prisma:push` を実行します。現在のリポジトリはPrisma migrationディレクトリを持たないため、納品前のDB反映は `schema.prisma` を正本にした `prisma db push` で行います。

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

納品ゲート:

- `npm run delivery:gate` が成功している
- `npm run delivery:package -- --check` が成功し、納品パッケージManifestを生成できる
- `main` のHEADが `origin/main` と同期し、GitHub上のremote HEADとも一致しており、最終証跡の対象commitがGitHubに反映済みである
- `delivery:gate` で仕様書PDF生成、管理者ツール説明書PDF生成、QA画像生成、納品物チェック、納品パッケージManifest確認、セキュリティ基準チェック、秘密情報管理チェック、依存関係供給網チェック、ビルド、E2Eが実行されている

本番URL・Production env確定後の切替前チェック:

```bash
npm run production:readiness -- --production-url https://<production-domain> --production-env-file .env.production.local
```

このコマンドは `security:prod-env`、`security:prod-services`、`security:headers`、`public:routes`、`admin:routes` を順番に実行し、本番URL origin、Google OAuth callback、Production env、本番DB/Blob、公開導線、管理者ツール到達、セキュリティヘッダーをまとめて確認します。Blobの書き込みまで確認する場合は `--write-probe` を付けます。

公開サイト:

- `npm run public:routes -- https://<production-domain>` が成功している
- `/` でトップページが表示される
- `/competitions` から大会詳細、リーグ詳細へ遷移できる
- `/news` で公開ニュースが表示される
- `/teams` で公開チームが表示される
- `/downloads` で公開資料が表示される
- `/contact` で問い合わせフォームとTurnstile認証が表示される

管理者ツール:

- `npm run admin:routes -- https://<production-domain>` が成功している
- `/admin` 未ログインアクセスで `/login?callbackUrl=/admin` へ遷移する
- 登録済みOwnerメールでGoogleログインできる
- 未登録、無効化済み、またはGoogle側でメール未検証のGoogleアカウントでは管理画面へ入れない
- Ownerでニュース、チーム、資料、担当割当を操作できる
- Ownerで `/admin/audit` から直近更新履歴を確認できる
- Ownerで退任者を無効化でき、無効化済み担当者は管理画面へ入れない
- 無効化済み担当者の既存JWTセッションもDB再検証で破棄される
- Editorで割当済みリーグの結果管理だけ操作できる
- 画像・資料アップロードがVercel Blobへ保存される
- `/login`, `/admin`, `/api/auth/*` の短時間大量アクセスはアプリ側レート制限で `429 Too Many Requests` になる
- `/admin` 配下のPOST等は外部Originまたは `Sec-Fetch-Site: cross-site` の変更リクエストを `403 Forbidden` で拒否する

セキュリティ:

- `npm run security:baseline` が成功している
- `Content-Security-Policy` が付与されている
- `Strict-Transport-Security` が付与されている
- `X-Content-Type-Options: nosniff` が付与されている
- `Permissions-Policy` で不要なデバイス権限が無効化されている
- CSPに `report-uri /api/security/csp-report` が含まれている
- `/admin` と `/login` に `X-Robots-Tag: noindex, nofollow, noarchive` と `Cache-Control: no-store` が付与されている
- `/api/security/csp-report` はPOSTで `204` を返してCSPレポートを受け取り、noindex/no-storeで配信され、ログ出力前にURL query/hashと秘密値を除去・redactしている
- `/robots.txt` で `/admin`, `/login`, `/api/auth`, `/api/security` が `Disallow` されている
- `/login`, `/admin`, `/api/auth/*`, `/api/security/*` の上限超過レスポンスに `Retry-After` と共通セキュリティヘッダーが付与される
- 外部Originまたは `Sec-Fetch-Site: cross-site` の `/admin` 変更リクエストは共通セキュリティヘッダー付きで `403` になる
- 管理Server Actionは `requireOwner()` または `getAdminScope()` を必ず呼び、Editor操作は対象リーグ認可を確認している
- Production環境で必須環境変数がすべて設定されている
- `npm run security:baseline` が成功している
- `npm run security:admin-actions` が成功している
- `npm run security:secrets` が成功している
- `npm run security:supply-chain` が成功している
- `npm run security:prod-env -- .env.production.local --production-url https://<production-domain>` が成功している
- `npm run security:prod-services -- .env.production.local` が成功し、本番DBとBlob storeの疎通を値非表示で確認している
- `npm run production:readiness -- --production-url https://<production-domain> --production-env-file .env.production.local` が成功している
- `npm run security:headers -- https://<production-domain>` が成功し、CSPレポートAPIのPOST 204も確認している
- `npm run public:routes -- https://<production-domain>` が成功している
- `npm run admin:routes -- https://<production-domain>` が成功している
- `npm run delivery:evidence -- --final --production-url https://<production-domain> --production-env-file .env.production.local --manual-checks-file docs/output/manual-checks-YYYYMMDD.md --include-build --include-e2e` で納品前証跡レポートを生成している
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
npm run docs:admin:qa:check
```

出力:

- `docs/admin-manual/output/qa-pages/`

`docs:admin:qa:check` は20ページ分のPNGについて、ページ寸法、非白紙率、文字/濃色ピクセル、色数を確認し、白紙化や極端なレンダリング崩れを検出します。

納品物の自動チェック:

```bash
npm run docs:delivery:check
```

納品パッケージManifest:

```bash
npm run delivery:package
npm run delivery:package -- --check
```

出力:

- `docs/output/delivery-package-manifest-YYYYMMDD-HHMMSS.md`

納品ゲート:

```bash
npm run delivery:gate
```

セキュリティ基準チェック:

```bash
npm run prisma:validate
npm run security:baseline
```

管理Server Action認可チェック:

```bash
npm run docs:admin:qa:check
npm run security:admin-actions
```

秘密情報管理チェック:

```bash
npm run security:secrets
```

依存関係供給網チェック:

```bash
npm run security:supply-chain
```

納品前証跡レポート:

```bash
npm run delivery:manual-checks -- --output docs/output/manual-checks-YYYYMMDD.md
npm run delivery:manual-checks -- --check docs/output/manual-checks-YYYYMMDD.md
npm run delivery:evidence -- --final --production-url https://<production-domain> --production-env-file .env.production.local --manual-checks-file docs/output/manual-checks-YYYYMMDD.md --include-build --include-e2e
```

`delivery:manual-checks` は本番手動確認メモのテンプレートを生成し、`--check` で必須項目の不足、`未記入`、状態が `実施済み` ではない行を検出します。`delivery:evidence -- --final` は clean worktree、Git upstream同期、GitHub remote HEAD一致、HTTPSの本番URL、存在するProduction envファイル、手動確認メモ、build、E2E、公開導線、管理者到達確認を必須にします。手動確認メモは必須項目がすべて揃い、状態が `実施済み` の場合だけ最終証跡として通過します。

手動確認メモは値や秘密情報を含めず、以下のような表を `docs/output/manual-checks-YYYYMMDD.md` に保存します。このファイルは `.gitignore` 対象です。

```markdown
| 項目 | 状態 | メモ |
| --- | --- | --- |
| 本番公開サイト主要導線 | 実施済み | /, /competitions, /news, /teams, /downloads, /contact |
| 本番管理者ログイン | 実施済み | OwnerメールでGoogleログイン確認 |
| Owner操作 | 実施済み | ニュース、チーム、資料、担当割当、更新履歴 |
| Editor操作 | 実施済み | 割当済みリーグの結果管理のみ操作可能 |
| Google OAuthリダイレクトURI | 実施済み | 本番ドメインのみ許可 |
| 初期Owner | 実施済み | 関係者へ別経路で共有 |
| PDF目視確認 | 実施済み | ページ欠け、画像欠け、文字切れなし |
| Runbook共有 | 実施済み | 関係者へ共有 |
```

出力:

- `docs/output/delivery-evidence-YYYYMMDD-HHMMSS.md`

本番公開導線チェック:

```bash
npm run public:routes -- https://<production-domain>
```

本番管理者ツール到達チェック:

```bash
npm run admin:routes -- https://<production-domain>
```

確認内容:

- 仕様書PDFと管理者ツール説明書PDFが生成済みで、極端に小さいファイルではない
- 管理者ツール説明書のQA画像が20ページ分生成されている
- Runbookと納品チェックリストが存在する
- 納品ハンドオフが存在し、成果物、最終確認コマンド、本番で残る確認、共有時の注意を確認できる
- 納品パッケージManifestでPDFのSHA-256、サイズ、QAページ数、共有対象/除外対象を確認できる
- 管理者マニュアルHTMLに古い制限文が残っていない
- Runbookに本番env安全確認手順が記載されている
- 最終証跡がGit upstream同期済みかつGitHub remote HEAD一致済みcommitを対象にしている
- Prisma schemaをDB反映前に検証できる
- CSP、CSPレポートログ秘匿、private routeヘッダー、レート制限、管理画面Origin検証、本番env検査、E2E本番無効化の静的基準を確認できる
- 管理Server ActionのOwner認可・リーグスコープ認可を静的確認できる
- CSP違反レポート受信APIがnoindex/no-storeとレート制限付きで確認できる
- 追跡済みenv、納品証跡Markdown、秘密鍵、実トークンらしき値の混入がないことを確認できる
- lockfile、依存取得元、integrity、root install hookを確認できる
- 証跡レポートにコマンド結果、PDFサイズ、QAページ数、本番URL/env確認の実施有無が記録されている
- 公開トップ、試合情報、大会詳細、リーグ詳細、ニュース、チーム、資料、問い合わせの200応答、主要見出し、主要リンクを確認できる
- ログイン画面、未ログイン管理画面redirect、認証session API、Google providerを確認できる

## ロールバック

本番反映後に重大な問題が出た場合:

1. Vercel Dashboardで直前の安定Deploymentを確認する
2. Production aliasを直前Deploymentへ戻す、またはVercel CLIでrollbackする
3. DB migrationを伴う変更の場合は、データ互換性と復旧手順を確認してから切り戻す
4. Google OAuth、環境変数、Blobの変更が原因の場合はDashboard設定も合わせて戻す

## 納品前の最終証跡

納品直前に以下を保存・共有します。

- Vercel Production Deployment URL
- GitHub `origin/main` に反映済みのcommit hash
- `npm run delivery:gate` の成功ログ
- `npm run public:routes -- https://<production-domain>` の成功ログ
- `npm run admin:routes -- https://<production-domain>` の成功ログ
- `npm run build` の成功ログ
- `npm run test:e2e` の成功ログ
- `npm run docs:admin:qa:check` の成功ログ
- `npm run security:baseline` の成功ログ
- `npm run security:secrets` の成功ログ
- `npm run security:supply-chain` の成功ログ
- `npm run security:prod-services -- .env.production.local` の成功ログ
- `npm run production:readiness -- --production-url https://<production-domain> --production-env-file .env.production.local` の成功ログ
- `npm run security:headers -- https://<production-domain>` の成功ログ
- `npm run docs:delivery:check` の成功ログ
- `npm run delivery:manual-checks -- --check docs/output/manual-checks-YYYYMMDD.md` の成功ログ
- `npm run delivery:package` の出力Markdown
- `npm run delivery:evidence -- --final --production-url https://<production-domain> --production-env-file .env.production.local --manual-checks-file docs/output/manual-checks-YYYYMMDD.md --include-build --include-e2e` の出力Markdown
- 仕様書PDF
- 管理者ツール説明書PDF
- 納品ハンドオフ
- 初期Ownerメールアドレス
- `npm run security:prod-env -- .env.production.local --production-url https://<production-domain>` の成功結果。値そのものは共有しない
- `npm run security:prod-services -- .env.production.local` の成功結果。接続文字列、トークン、Blob URL、メールアドレスは共有しない
