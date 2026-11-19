# セキュリティ更新記録

確認日: 2026-11-19 JST

## 適用範囲

東京リーグのNext.jsアプリと依存パッケージ。GitHubの既存コミットのVercelステータスから `knakamura128s-projects/tokyo-league` への連携を確認済み。nginxの設定・コンテナ・接続先はリポジトリに存在せず、配信基盤の更新はVercelの管理範囲となる。

## 更新内容

| 対象 | 更新前 | 更新後 |
| --- | --- | --- |
| Next.js | 15.2.8 | 15.5.29 |
| React / React DOM | 19.0.0 | 19.0.9 |
| NextAuth | 5.0.0-beta.30 | 5.0.0-beta.32 |
| Auth Prisma Adapter | 2.11.1 | 2.11.3 |
| Auth Core | 0.41.0 / 0.41.1 | 0.41.3 |
| SheetJS | 0.18.5 | 0.20.3（公式CDN） |
| image-size | 2.0.2 | 2.1.0 |
| sharp | 0.33.5 | 0.35.5 |
| PostCSS | 8.4.31 | 8.5.33 |
| xmldom | 0.9.10 | 0.9.12 |
| undici | 6.24.1 | 6.29.1 |
| nanoid | 3.3.11 | 3.3.20 |
| source-map-js | 1.2.1 | 1.2.3 |
| esbuild | 0.27.4 | 0.28.2 |
| Playwright Test | 1.59.1 | 1.65.1 |

間接依存はlockfileを更新。Next.js 15がPostCSSを旧版に固定するため、Next.js配下に限定したoverrideで同じ8系の修正版を指定した。Next.jsはメジャーを維持してセキュリティリリースへ更新した。

Node.jsはVercel用に `engines.node: 24.x` を明示。ローカルは `.nvmrc` の24.22.3を指定し、Playwrightの旧Node.js絶対パス固定を削除した。CIは既存のNode.js 24系指定を維持。検証には公式Node.jsアーカイブをSHA-256照合して一時フォルダへ展開したものを使用し、既存のグローバルNode.jsは変更していない。

SheetJSは公式の案内に従って0.20.3を使用。供給網チェックで外部URL全般を許可せず、当該パッケージのURL・バージョン・SHA-512がすべて一致する場合に限定した。公式配布の許可、不正URL・ハッシュ変更・旧版の拒否を一時fixtureで検証した。

## 検証

- npm監査: 更新前13件（critical 4 / high 8 / low 1）から更新後0件。開発依存も含む。
- Node.js 24.22.3でE2Eテスト45件すべて成功（公開・管理・セキュリティ・Excel読込）。
- Node.js 24.22.3で本番ビルド成功（型チェック・静的ページ生成を含む）。
- 供給網・セキュリティ基準・秘密情報管理チェック: 成功。
- 管理Server Actionの既存の文字列解析チェック: 4件を未達と判定。手動確認では `reconcileExcelTeamAliases` のOwner以外の早期return、`useGeneratedStarTableAsResultImage` の関数内認証・リーグ認可、順位表再計算2関数の委譲先 `rebuildStandingsFromMatches` の認証・リーグ認可を確認。このチェックの解析改善は今回のパッケージ更新には含めていない。
- ビルド時にAuth.js依存のjoseがEdge RuntimeのCompressionStream / DecompressionStream警告を出す。ビルド自体は成功。
- E2Eの古い見出し・ラベルを現行UIへ同期。総会/納会は保存済み設定を読むため、初期文言の完全一致から値の存在確認へ変更した。
- `.xls` / `.xlsx` の日本語チーム名・日本語形式の試合日・得点・未消化行・更新判定の回帰テストを追加。
- GitHubのOAuth認証にworkflowスコープがないため、CIへの監査ステップ追加はpush時に拒否された。ワークフロー変更を除外し、`npm run security:audit` は手動実行用として追加した。
- GitHub Actionsの `ubuntu-latest` がUbuntu 26.04へ移行しており、旧Playwright 1.59.1ではブラウザーを導入できなかった。Ubuntu 26.04対応の安定版1.65.1へ更新した。

## デプロイ確認

アプリ更新コミット `210717c` をmainへpushし、GitHub DeploymentのProduction環境で `success`、Vercelステータスも `success` を確認した。デプロイURLへのHTTPアクセスはVercelのSSO保護へリダイレクトされるため、このURLから認証なしの画面内容確認は行っていない。

## 参照

- [NGINX公式アドバイザリ](https://nginx.org/en/security_advisories.html)
- [Next.js公式アドバイザリ](https://github.com/vercel/next.js/security/advisories)
- [SheetJS公式インストール手順](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/)
- [Node.js 2026年11月セキュリティリリース](https://nodejs.org/en/blog/vulnerability/november-2026-security-releases)
- [Vercelの責任分界](https://vercel.com/docs/security/shared-responsibility)
- [VercelのNode.jsセキュリティ情報](https://vercel.com/kb/bulletin/node-js-security-advisory)
- [Playwrightの公式対応環境](https://playwright.dev/docs/intro)
