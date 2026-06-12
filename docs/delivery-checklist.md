# 東京リーグ リニューアル納品チェックリスト

最終更新: 2026-06-10 JST

## 納品物

| 納品物 | 現在の成果物 | 生成・確認コマンド | 状態 |
| --- | --- | --- | --- |
| サイト | `app/`, `components/`, `public/site-assets/` | `npm run build`, `npm run test:e2e` | ローカル検証済み |
| 管理者ツール | `app/admin/`, `components/admin-*`, `lib/admin-access.ts` | `npm run test:e2e` | E2Eモードで検証済み |
| 仕様書PDF | `docs/output/tokyo-league-renewal-spec.pdf` | `npm run docs:spec` | 生成済み |
| 管理者ツール説明書PDF | `docs/admin-manual/output/tokyo-league-admin-manual.pdf` | `npm run docs:admin` | 生成済み |
| 管理者説明書QA画像 | `docs/admin-manual/output/qa-pages/` | `npm run docs:admin:qa`, `npm run docs:admin:qa:check` | 20ページ生成・品質確認済み |
| 本番デプロイRunbook | `docs/production-runbook.md` | 手順確認 | 作成済み |
| 納品ハンドオフ | `docs/delivery-handoff.md` | 手順確認 | 作成済み |
| 納品物自動チェック | PDF、QA画像、Runbook、古い文言混入 | `npm run docs:delivery:check` | 実装済み |
| 本番手動確認メモ | `docs/output/manual-checks-*.md` | `npm run delivery:manual-checks` / `npm run delivery:manual-checks -- --check docs/output/manual-checks-YYYYMMDD.md` | 実装済み |
| 納品前証跡レポート | `docs/output/delivery-evidence-*.md` | `npm run delivery:evidence -- --final --production-url https://<production-domain> --production-env-file .env.production.local --manual-checks-file docs/output/manual-checks-YYYYMMDD.md --include-build --include-e2e` | 実装済み |
| 納品パッケージManifest | `docs/output/delivery-package-manifest-*.md` | `npm run delivery:package` / `npm run delivery:package -- --check` | 実装済み |
| 納品ゲート | PDF生成、QA画像生成、納品物チェック、納品パッケージManifest、セキュリティ基準、秘密情報管理、依存関係供給網、ビルド、E2E | `npm run delivery:gate` | 実装済み |
| 本番公開導線確認 | 公開トップ、試合情報、大会詳細、リーグ詳細、ニュース、チーム、資料、問い合わせ | `npm run public:routes -- https://<production-domain>` | 実装済み |
| 本番管理者到達確認 | ログイン画面、未ログイン管理画面redirect、認証session API、Google provider | `npm run admin:routes -- https://<production-domain>` | 実装済み |

## 非機能要件: セキュリティ

| 項目 | 実装・証跡 | 状態 |
| --- | --- | --- |
| 管理画面認証 | NextAuth + Google OIDC、Google検証済みメール、DB有効登録メールのみ許可 | 実装済み |
| 権限管理 | `OWNER` / `EDITOR`、担当リーグ割当、担当者無効化 | 実装済み |
| 既存セッション再検証 | JWT確認時にDB上の有効状態とロールを再反映し、無効化済み担当者の既存トークンを破棄 | 実装済み |
| 更新履歴 | Owner専用 `/admin/audit` でニュース、大会、試合、資料等の直近作成・更新履歴を日本時間で確認 | 実装済み |
| 管理/認証レート制限 | `/login`, `/admin`, `/api/auth/*` の短時間大量アクセスに共通セキュリティヘッダー付きの `429` と `Retry-After` を返す | 実装済み |
| 管理画面CSRF対策 | `/admin` 配下のPOST等は外部Originまたは `Sec-Fetch-Site: cross-site` を共通セキュリティヘッダー付き `403` で拒否 | 実装済み |
| サーバー側認可 | `requireOwner`, `getAdminScope` をサーバーアクションで使用 | 実装済み |
| 管理Server Action認可チェック | `npm run security:admin-actions` でexport済みServer ActionのOwner認可・リーグスコープ認可を静的確認 | 実装済み |
| Production環境変数検出 | Productionで必須環境変数の欠落を起動時検出 | 実装済み |
| 本番env安全確認 | `npm run security:prod-env -- .env.production.local --production-url https://<production-domain>` で必須項目、E2E誤設定、OAuth/DB/Blob形式、AUTH_URL/NEXTAUTH_URLの本番URL一致を値非表示で確認 | 実装済み |
| 秘密情報管理チェック | `npm run security:secrets` で追跡済みenv、納品証跡Markdown、秘密鍵、実トークンらしき値の混入を確認 | 実装済み |
| 依存関係供給網チェック | `npm run security:supply-chain` でlockfile、依存取得元、integrity、root install hookを確認 | 実装済み |
| E2Eバイパス本番無効化 | `lib/test-mode.ts`、`tests/e2e/security.spec.ts` | 実装済み |
| 入力サニタイズ | `lib/security.ts` と各管理アクション | 実装済み |
| 外部URL制限 | 公式サイトURL、画像パスは `http` / `https` または安全な相対パスのみ許可 | 実装済み |
| アップロード制限 | 画像・資料のMIME type、拡張子、ファイル内容、サイズ制限 | 実装済み |
| HTTPセキュリティヘッダー | `next.config.ts` | 実装済み |
| セキュリティ基準チェック | `npm run security:baseline` でCSP、private routeヘッダー、レート制限、管理画面Origin検証、本番env検査、E2E本番無効化を静的確認 | 実装済み |
| CSP違反レポート受信 | `Content-Security-Policy` の `report-uri /api/security/csp-report` とPOST受信API。noindex/no-store、レート制限、本文サイズ制限、ログ出力前のquery/hash除去・秘密値redaction付き | 実装済み |
| 本番ヘッダー確認 | `npm run security:headers -- https://<production-domain>` で公開/ログイン/認証API/CSPレポートPOST/robotsを確認 | 実装済み |
| 本番公開導線確認 | `npm run public:routes -- https://<production-domain>` で主要公開ページの200応答、見出し、主要リンクを確認 | 実装済み |
| 本番管理者到達確認 | `npm run admin:routes -- https://<production-domain>` で未ログイン時の管理画面保護とGoogle認証Providerを確認 | 実装済み |
| 管理画面noindex/no-store | `/admin`, `/login`, `/api/auth/*` に `X-Robots-Tag` と `Cache-Control` | 実装済み |
| robots.txt | `/admin`, `/login`, `/api/auth`, `/api/security` のクロール禁止 | 実装済み |
| ヘッダー回帰テスト | `tests/e2e/security.spec.ts` | E2E通過 |
| 非機能仕様書記載 | `docs/data-model-and-admin-spec.md` | 記載済み |

## 直近の検証結果

- `npm run test:e2e`: 31件成功
- `npm run build`: 成功。公開トップとニュース一覧は動的レンダリング化し、ビルド時のDB接続エラーログなし
- `npm run docs:spec`: 成功
- `npm run docs:admin`: 成功
- `npm run docs:admin:qa`: 成功
- `npm run docs:admin:qa:check`: 成功
- `npm run docs:delivery:check`: 成功
- `npm run delivery:manual-checks`: 成功
- `npm run delivery:package`: 成功
- `npm run delivery:evidence`: 成功
- `npm run delivery:gate`: 成功
- `npm run security:baseline`: 成功
- `npm run security:admin-actions`: 成功
- `npm run security:secrets`: 成功
- `npm run security:supply-chain`: 成功
- `npm run public:routes`: ローカルE2Eモードで成功
- `npm run admin:routes`: ローカルGoogle設定あり・未ログイン状態で成功

## 納品前に残す確認

- 本番デプロイURLで `npm run public:routes -- https://<production-domain>` を実行し、公開サイトの主要導線証跡を保存する
- 本番デプロイURLで `npm run admin:routes -- https://<production-domain>` を実行し、管理者ツールの到達・保護状態証跡を保存する
- 本番デプロイURLで管理画面ログイン、Owner操作、Editor操作を確認する
- 納品直前に `npm run delivery:gate` を実行し、PDF生成、QA画像生成、納品物チェック、納品パッケージManifest、Prisma schema検証、セキュリティ基準、秘密情報管理、依存関係供給網、ビルド、E2Eを一括確認する
- `npm run docs:admin:qa:check` で管理者説明書QA画像の寸法、非白紙率、文字/濃色ピクセル、色数を確認する
- `npm run delivery:package` で納品パッケージManifestを生成し、PDFのSHA-256、サイズ、QAページ数、共有対象/除外対象を確認する
- `npm run prisma:validate` でDB反映前にPrisma schemaを確認する
- `npm run security:admin-actions` で管理Server Actionの認可ガードが維持されていることを確認する
- `npm run delivery:manual-checks -- --output docs/output/manual-checks-YYYYMMDD.md` で本番手動確認メモを生成し、確認後に `npm run delivery:manual-checks -- --check docs/output/manual-checks-YYYYMMDD.md` で全項目が `実施済み` になっていることを確認する
- clean worktree、Git upstream同期済み、GitHub remote HEAD一致済みの状態で、本番デプロイURLに対して `npm run delivery:evidence -- --final --production-url https://<production-domain> --production-env-file .env.production.local --manual-checks-file docs/output/manual-checks-YYYYMMDD.md --include-build --include-e2e` を実行し、手動確認メモの必須項目がすべて `実施済み` の証跡レポートを保存する
- 本番環境の `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `DATABASE_URL`, `DIRECT_URL`, `BLOB_READ_WRITE_TOKEN`, `AUTH_URL`, `NEXTAUTH_URL` を `npm run security:prod-env -- .env.production.local --production-url https://<production-domain>` で確認する
- `npm run security:secrets` でリポジトリに秘密情報や納品証跡Markdownが混入していないことを確認する
- Google OAuthのリダイレクトURIが本番ドメインだけに限定されていることを確認する
- 初期Ownerメールアドレスを確定し、`npm run prisma:seed-admin` またはDB管理画面で登録する
- Neon DB接続が本番ビルド・実行時に安定していることを確認する
- PDF納品物のページ欠け、画像欠け、文字切れを最終目視確認する
- `npm run docs:delivery:check` でPDF、QA画像、Runbook、古い文言混入の自動チェックを通す
- `docs/production-runbook.md` に沿って本番反映・ロールバック手順を関係者へ共有する
- `docs/delivery-handoff.md` に沿って納品物、証跡、共有時の注意を関係者へ共有する
