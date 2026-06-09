# tokyo-league

東京リーグ リニューアルの設計メモです。

## 参照順

1. [公開画面ワイヤー案](./docs/site-wireframes.md)
2. [データ設計・管理画面仕様](./docs/data-model-and-admin-spec.md)
3. [納品チェックリスト](./docs/delivery-checklist.md)
4. [本番デプロイ・運用開始Runbook](./docs/production-runbook.md)
5. [納品ハンドオフ](./docs/delivery-handoff.md)
6. [UIモック比較](./mock/variants.html)

## 現在の決定事項

- 既存 WordPress は引き継がず、新サイトへ移行する
- 公開サイトと管理機能は新規構築する
- 運用の主対象はニュースと試合結果
- 配信基盤は Vercel を想定する

## 納品関連コマンド

- `npm run build`: 本番ビルド
- `npm run test:e2e`: 公開サイト・管理者ツール・セキュリティヘッダーのE2E確認
- `npm run security:baseline`: CSP、CSPレポートログ秘匿、private routeヘッダー、レート制限、本番env検査、E2E本番無効化の静的確認
- `npm run security:secrets`: env、納品証跡、秘密鍵、実トークンらしき値の混入確認
- `npm run security:supply-chain`: lockfile、依存取得元、integrity、root install hookの確認
- `npm run delivery:gate`: PDF生成、QA画像生成、納品物チェック、セキュリティ基準、秘密情報管理、依存関係供給網、ビルド、E2Eの一括確認
- `npm run prisma:push`: `schema.prisma` をDBへ反映
- `npm run docs:spec`: 仕様書PDF生成
- `npm run docs:admin`: 管理者ツール説明書PDF生成
- `npm run docs:admin:qa`: 管理者ツール説明書のQA確認画像生成
