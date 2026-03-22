# 東京リーグ データ設計・管理画面仕様

最終更新: 2026-03-22 JST

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
| status | text | `draft`, `published` |
| last_updated_at | timestamptz nullable | 結果更新日表示用 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

推奨制約:

- unique `(competition_id, slug)`

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
| status | text | `draft`, `published` |
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

## 入力バリデーション方針

- スラッグは英数字とハイフンのみ
- 公開中データは必須項目の欠落を禁止
- 試合結果で同一チーム対戦は不可
- 順位表の順位重複は不可
- PDFや画像の拡張子と MIME type を検証する

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
