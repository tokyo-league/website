# 東京リーグ データ設計・管理画面仕様

最終更新: 2026-06-03 JST

## 設計方針

- 更新頻度の高い「ニュース」と「試合結果」を中心に管理画面を設計する
- 既存 WordPress のページ構造は踏襲せず、データ中心に再構成する
- 公開画面で再利用できるように、PDFや画像の貼り付け前提ではなく構造化データを優先する
- 管理者が少人数でも運用できるよう、入力項目は必要最小限にする

## エンティティ一覧

- admins
- pages
- news_categories
- news_posts
- assets
- seasons
- competitions
- competition_files
- divisions
- division_editor_assignments
- teams
- division_teams
- venues
- matches
- standings
- downloads
- contact_settings

## テーブル設計

以下は PostgreSQL 前提の初期設計案です。

### admins

管理者ユーザー

| column | type | notes |
| --- | --- | --- |
| id | uuid pk | |
| email | text unique | ログインID |
| name | text | 表示名 |
| role | text | `owner`, `editor` |
| is_active | boolean | 無効化した管理者はログイン不可 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### pages

固定ページ本文

| column | type | notes |
| --- | --- | --- |
| id | uuid pk | |
| slug | text unique | `about`, `contact` など |
| title | text | |
| body | text | リッチテキストまたは markdown |
| status | text | `draft`, `published` |
| published_at | timestamptz nullable | |
| updated_by | uuid fk admins.id | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### news_categories

ニュースカテゴリ

| column | type | notes |
| --- | --- | --- |
| id | uuid pk | |
| name | text | |
| slug | text unique | |
| sort_order | integer | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### news_posts

ニュース記事

| column | type | notes |
| --- | --- | --- |
| id | uuid pk | |
| slug | text unique | |
| title | text | |
| excerpt | text nullable | 一覧用抜粋 |
| body | text | 本文 |
| eyecatch_asset_id | uuid fk assets.id nullable | |
| category_id | uuid fk news_categories.id nullable | |
| related_competition_id | uuid fk competitions.id nullable | 大会関連ニュース用 |
| status | text | `draft`, `published`, `archived` |
| published_at | timestamptz nullable | |
| created_by | uuid fk admins.id | |
| updated_by | uuid fk admins.id | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### assets

画像やPDFの共通管理

| column | type | notes |
| --- | --- | --- |
| id | uuid pk | |
| kind | text | `image`, `pdf`, `file` |
| title | text | |
| storage_key | text | オブジェクトストレージ上のキー |
| original_filename | text | |
| mime_type | text | |
| file_size | bigint | |
| created_by | uuid fk admins.id nullable | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### seasons

年度

| column | type | notes |
| --- | --- | --- |
| id | uuid pk | |
| year | integer unique | 2026 など |
| label | text | `2026年度` |
| is_current | boolean | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### competitions

大会単位

| column | type | notes |
| --- | --- | --- |
| id | uuid pk | |
| season_id | uuid fk seasons.id | |
| name | text | `第103回東京リーグ` |
| slug | text unique | |
| competition_type | text | `league`, `cup`, `other` |
| edition | integer nullable | 第103回の数値部分 |
| summary | text nullable | |
| start_date | date nullable | |
| end_date | date nullable | |
| status | text | `draft`, `published`, `closed` |
| published_at | timestamptz nullable | |
| sort_order | integer | |
| created_by | uuid fk admins.id | |
| updated_by | uuid fk admins.id | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### competition_files

大会関連ファイル

| column | type | notes |
| --- | --- | --- |
| id | uuid pk | |
| competition_id | uuid fk competitions.id | |
| asset_id | uuid fk assets.id | |
| label | text | `要項`, `組み合わせ` など |
| sort_order | integer | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### divisions

大会内リーグ

| column | type | notes |
| --- | --- | --- |
| id | uuid pk | |
| competition_id | uuid fk competitions.id | |
| name | text | `Aリーグ` |
| slug | text | 大会内で一意想定 |
| description | text nullable | |
| sort_order | integer | |
| status | text | `draft`, `published`, `archived` |
| last_updated_at | timestamptz nullable | 結果更新日表示用 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

推奨制約:

- unique `(competition_id, slug)`

### division_editor_assignments

リーグ単位の入稿担当者割り当て

| column | type | notes |
| --- | --- | --- |
| id | uuid pk | |
| user_id | uuid fk admins.id | |
| division_id | uuid fk divisions.id | |
| permission | text | `results_editor`, `standings_editor`, `division_manager` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

推奨制約:

- unique `(user_id, division_id, permission)`
- index `(user_id)`
- index `(division_id)`

### teams

参加チーム

| column | type | notes |
| --- | --- | --- |
| id | uuid pk | |
| name | text unique | |
| slug | text unique | |
| short_name | text nullable | |
| profile | text nullable | |
| region | text nullable | |
| representative_name | text nullable | |
| head_coach_name | text nullable | |
| website_url | text nullable | |
| instagram_url | text nullable | |
| logo_asset_id | uuid fk assets.id nullable | |
| status | text | `draft`, `published` |
| sort_order | integer | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### division_teams

大会リーグとチームの所属関係

| column | type | notes |
| --- | --- | --- |
| id | uuid pk | |
| division_id | uuid fk divisions.id | |
| team_id | uuid fk teams.id | |
| sort_order | integer | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

推奨制約:

- unique `(division_id, team_id)`

### venues

会場マスタ

| column | type | notes |
| --- | --- | --- |
| id | uuid pk | |
| name | text unique | |
| address | text nullable | |
| note | text nullable | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### matches

個別試合結果

| column | type | notes |
| --- | --- | --- |
| id | uuid pk | |
| division_id | uuid fk divisions.id | |
| match_date | date | |
| kickoff_time | time nullable | |
| venue_id | uuid fk venues.id nullable | |
| home_team_id | uuid fk teams.id | |
| away_team_id | uuid fk teams.id | |
| home_score | integer nullable | |
| away_score | integer nullable | |
| status | text | `scheduled`, `played`, `cancelled`, `postponed` |
| note | text nullable | |
| sort_order | integer | 同日表示順 |
| created_by | uuid fk admins.id | |
| updated_by | uuid fk admins.id | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

推奨制約:

- check `home_team_id <> away_team_id`

### standings

順位表

| column | type | notes |
| --- | --- | --- |
| id | uuid pk | |
| division_id | uuid fk divisions.id | |
| team_id | uuid fk teams.id | |
| rank | integer | |
| played | integer default 0 | |
| won | integer default 0 | |
| drawn | integer default 0 | |
| lost | integer default 0 | |
| goals_for | integer default 0 | |
| goals_against | integer default 0 | |
| goal_difference | integer default 0 | |
| points | integer default 0 | |
| note | text nullable | |
| updated_at | timestamptz | |

推奨制約:

- unique `(division_id, team_id)`
- unique `(division_id, rank)`

備考:

- 初期は手入力更新でよい
- 将来的に `matches` から自動集計へ移行可能

### downloads

資料ダウンロード一覧

| column | type | notes |
| --- | --- | --- |
| id | uuid pk | |
| title | text | |
| slug | text unique | |
| category | text | `regulation`, `guideline`, `document`, `other` |
| description | text nullable | |
| asset_id | uuid fk assets.id | |
| published_at | timestamptz nullable | |
| status | text | `draft`, `published`, `archived` |
| sort_order | integer | |
| created_by | uuid fk admins.id | |
| updated_by | uuid fk admins.id | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### contact_settings

問い合わせ情報

| column | type | notes |
| --- | --- | --- |
| id | uuid pk | シングルトン運用 |
| email | text nullable | |
| body | text nullable | |
| updated_by | uuid fk admins.id | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

## 管理画面メニュー構成

1. ダッシュボード
2. ニュース
3. 大会
4. リーグ
5. 試合結果
6. 順位表
7. チーム
8. 資料
9. 固定ページ
10. 設定

## 画面仕様

### ダッシュボード

目的:
更新対象を一目で確認する

表示内容:

- 下書きニュース件数
- 公開中大会件数
- 最近更新した試合結果
- 最近更新したニュース
- よく使う操作へのショートカット

### ニュース管理

一覧:

- 公開状態
- 公開日
- カテゴリ
- タイトル
- 更新者

作成・編集項目:

- タイトル
- スラッグ
- カテゴリ
- 抜粋
- 本文
- アイキャッチ画像
- 関連大会
- 公開状態
- 公開日時
- 添付ファイル

操作要件:

- 下書き保存
- 公開予約は初期スコープ外でもよい
- 並び順は公開日時降順

### 大会管理

一覧:

- 年度
- 大会名
- 種別
- 開催期間
- 状態

作成・編集項目:

- 所属年度
- 大会名
- スラッグ
- 種別
- 回次
- 概要
- 開催期間
- 公開状態
- 関連ファイル

### リーグ管理

一覧:

- 所属大会
- リーグ名
- 参加チーム数
- 最終更新日
- 状態

作成・編集項目:

- 所属大会
- リーグ名
- スラッグ
- 説明
- 表示順
- 公開状態
- 参加チーム割当

### 試合結果管理

一覧:

- 所属大会
- リーグ
- 試合日
- 対戦カード
- スコア
- 会場
- 状態

作成・編集項目:

- 所属リーグ
- 試合日
- 開始時刻
- 会場
- ホームチーム
- アウェイチーム
- ホーム得点
- アウェイ得点
- 状態
- 備考

操作要件:

- リーグ単位で絞り込めること
- 同一リーグで続けて入力しやすいこと
- 試合終了登録でリーグの `last_updated_at` を更新すること

### 順位表管理

一覧:

- 所属大会
- リーグ
- 最終更新日時

編集方式:

- リーグごとに表形式で一括編集

編集項目:

- 順位
- チーム
- 試合数
- 勝
- 分
- 敗
- 得点
- 失点
- 得失点
- 勝点
- 備考

運用方針:

- 初期は手入力更新
- 将来、自動計算ボタンを追加可能な設計にする

### チーム管理

一覧:

- チーム名
- 地域
- 状態

作成・編集項目:

- チーム名
- スラッグ
- 略称
- 紹介文
- 地域
- 代表者
- 監督
- Webサイト
- Instagram
- ロゴ
- 公開状態

### 資料管理

一覧:

- タイトル
- カテゴリ
- ファイル名
- 公開URL確認リンク
- 公開状態
- 更新日

作成・編集項目:

- タイトル
- スラッグ
- カテゴリ
- 説明
- ファイル
- 公開状態

### 固定ページ管理

対象:

- 東京リーグについて
- お問い合わせ

編集項目:

- タイトル
- 本文
- 公開状態

補足:

- About ページ内の規約リンクは `downloads` 参照でもよい

### 設定

対象:

- 問い合わせ先メールアドレス
- フッター文言
- SNSリンク

## 権限仕様

初期ロール:

- `owner`
  - すべて編集可能
  - 管理者追加可能
- `editor`
  - コンテンツ編集可能
  - 管理者設定は不可

リーグ担当権限:

- `results_editor`
  - 担当リーグの試合結果を更新可能
- `standings_editor`
  - 担当リーグの順位表を更新可能
- `division_manager`
  - 担当リーグの所属チーム、試合結果、順位表を更新可能

運用方針:

- `owner` は全リーグ横断で編集可能
- `editor` は `division_editor_assignments` に紐づくリーグのみ更新可能
- ニュース、固定ページ、資料のようなリーグ非依存コンテンツは、当面 `owner` または全体編集担当のみ更新可能にする
- 管理者の表示名・ロール変更は `owner` のみ実行可能とし、ロール変更時は確認ダイアログを挟む
- 管理者の有効化・無効化は `owner` のみ実行可能とし、無効化した管理者は管理画面へログイン不可とする
- ログイン中 `owner` の自己降格、最後の `owner` の `editor` 変更はサーバー側で禁止する
- ログイン中 `owner` の自己無効化、最後の有効な `owner` の無効化はサーバー側で禁止する
- `editor` を `owner` へ変更した場合、リーグ担当割当は不要になるため解除する

## 入力バリデーション方針

- スラッグは英数字とハイフンのみ
- 公開中データは必須項目の欠落を禁止
- 試合結果で同一チーム対戦は不可
- 順位表の順位重複は不可
- PDF、Word、Excel、画像の拡張子、MIME type、ファイル内容シグネチャを検証する

## 非機能要件: セキュリティ

納品時点で最低限満たすセキュリティ基準は以下とする。

### 認証・認可

- 管理画面は Google OIDC + NextAuth による認証を必須とする
- Google側で検証済みのメールアドレスで、かつ `User` テーブルに事前登録され、有効なメールアドレスのみログイン可能とする
- 管理者ロールは `OWNER` / `EDITOR` の2段階とする
- `OWNER` は全管理機能を利用可能とし、`EDITOR` は割り当て済みリーグの結果更新に限定する
- サーバーアクションは画面表示だけに依存せず、実行時にも `requireOwner` / `getAdminScope` で権限確認する
- 管理者ロール変更は自己降格とOwner不在を禁止し、権限喪失による運用停止を防ぐ
- 管理者無効化は自己無効化と有効Owner不在を禁止し、退任者のアクセス遮断と運用継続を両立する
- JWTセッションは確認時にDB上の管理者有効状態を再検証し、無効化済み・削除済み担当者の既存トークンを破棄する
- `/login`, `/admin`, `/api/auth/*` は短時間の大量アクセスをアプリ側でレート制限し、上限超過時も共通セキュリティヘッダーを付けた `429 Too Many Requests` と `Retry-After` を返す
- E2Eテスト用バイパスは `E2E_TEST_MODE=1` かつ非production環境でのみ有効とし、本番環境では強制的に無効化する

### 入力・アップロード

- 文字列入力は制御文字を除去し、用途ごとに最大文字数を設ける
- ID類は UUID 形式、slug は英数字とハイフンのみ許可する
- 外部リンクURLは `http` / `https` のみ許可し、`javascript:` などの非HTTPスキームは保存しない
- 公開日時や大会日付は日本時間として扱い、表示・入力の基準を統一する
- 画像アップロードは JPG / PNG / WebP に限定し、許可拡張子、MIME type、画像内容シグネチャ、サイズ上限を検証する
- 資料アップロードは PDF / Excel / Word の許可拡張子、MIME type、ファイル内容シグネチャ、サイズ上限を検証する
- 資料一覧ではアップロード済みファイル名と公開URL確認リンクを表示し、公開前後のURL確認を管理画面内で行えるようにする
- ファイル名は保存前に安全な文字へ正規化し、Blob保存時はランダムサフィックスを付与する

### HTTPレスポンスヘッダー

全ルートで以下のセキュリティヘッダーを付与する。

| header | 方針 |
| --- | --- |
| Content-Security-Policy | `default-src 'self'` を基準に、Google認証・Vercel Blob・既存サイト画像のみ許可する |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| X-Content-Type-Options | `nosniff` |
| X-Frame-Options | `SAMEORIGIN` |
| X-Permitted-Cross-Domain-Policies | `none` |
| Permissions-Policy | camera / microphone / geolocation / payment / usb を無効化 |
| Strict-Transport-Security | HTTPS本番環境で長期HSTSを有効化 |
| X-Robots-Tag | 管理画面、ログイン画面、認証APIは `noindex, nofollow, noarchive` |
| Cache-Control | 管理画面、ログイン画面、認証APIは `no-store` |

`robots.txt` でも `/admin`, `/login`, `/api/auth` のクロールを禁止する。

納品前に `npm run security:headers -- https://<production-domain>` を実行し、公開トップ、ログイン画面、認証API、robots.txt の本番ヘッダーを確認する。

### 秘密情報・環境変数

- `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `DATABASE_URL`, `DIRECT_URL`, `BLOB_READ_WRITE_TOKEN` は環境変数で管理し、リポジトリへコミットしない
- Vercel Production Environmentでは上記必須環境変数の欠落と主要な形式不備をアプリ起動時に検出し、設定漏れや危険な値のまま本番運用しない
- 納品前に `npm run security:prod-env -- .env.production.local` を実行し、値を表示せずに必須項目、`E2E_TEST_MODE` 誤設定、OAuth/DB/Blob形式を確認する
- 初期管理者の登録は `SEED_ADMIN_EMAIL` を使った明示的なシード実行、またはDB管理画面での登録に限定する
- 本番環境のGoogle OAuthリダイレクトURIはデプロイドメインに限定する
- Vercel Production Environmentに `E2E_TEST_MODE` を設定しない。誤設定されてもproductionではアプリ側で無効化する

### 納品物検査

- 納品前に `npm run docs:delivery:check` を実行し、仕様書PDF、管理者ツール説明書PDF、QA画像、Runbook、納品チェックリストが揃っていることを確認する
- 管理者マニュアルHTMLに古い制限事項の文言が残っていないことを自動検査し、実装済み機能と説明書の齟齬を防ぐ

### 運用・監査

- 管理データは `createdById` / `updatedById` と `createdAt` / `updatedAt` を保持する
- 削除操作は参照中データを壊さないよう、関連データの存在確認を行う
- 納品後の改善候補として、監査ログ一覧、管理者招待フロー、Vercel WAF連携、CSPレポート収集を追加検討する

## 初期実装の範囲

必須:

- 管理者ログイン
- ニュース CRUD
- 大会 CRUD
- リーグ CRUD
- チーム CRUD
- 試合結果 CRUD
- 順位表編集
- 資料 CRUD
- 固定ページ編集

後回しでよい:

- 監査ログ
- 公開予約
- 試合結果CSV一括投入
- 順位表自動計算
- お問い合わせフォーム

## 推奨実装順

1. 認証
2. 大会 / リーグ / チームのマスタ管理
3. 試合結果入力
4. 順位表管理
5. ニュース管理
6. 固定ページと資料管理
7. 公開画面連携
