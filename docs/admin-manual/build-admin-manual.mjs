import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve("docs/admin-manual");
const assetsDir = path.join(root, "assets");
const outputDir = path.join(root, "output");
const htmlPath = path.join(outputDir, "tokyo-league-admin-manual.html");
const pdfPath = path.join(outputDir, "tokyo-league-admin-manual.pdf");

const today = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const sections = [
  {
    title: "1. ログイン仕様と手順",
    image: "login.png",
    markers: [
      ["①", 48, 48],
      ["②", 49, 72],
    ],
    callouts: [
      "① Googleアカウントでログインします。ログイン済みの場合は「管理画面へ進む」から入ります。",
      "② 管理者メール登録と環境変数設定が前提です。未設定時はGoogleログインボタンが利用できません。",
    ],
    steps: [
      "管理画面URL `/admin` にアクセスします。未ログインの場合は `/login?callbackUrl=/admin` へ遷移します。",
      "「Googleでログイン」を押し、登録済みのGoogleメールアドレスで認証します。",
      "`Admin` テーブルに同じメールアドレスが有効登録されている場合だけ管理画面へ入れます。未登録・無効化済みメールはログイン不可です。",
      "作業終了時は右上の「ログアウト」を押します。共有端末では必ずログアウトしてください。",
    ],
    notes: [
      "認証方式: NextAuth + Google OIDC。セッションはJWT方式です。",
      "必須環境変数: `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `DATABASE_URL`。",
      "初期Ownerは `SEED_ADMIN_EMAIL` を設定して `npm run prisma:seed-admin` で登録できます。",
      "サイト上の日時表示・公開日時の扱いは日本時間です。",
    ],
  },
  {
    title: "2. ダッシュボード",
    image: "dashboard.png",
    markers: [
      ["①", 10, 35],
      ["②", 78, 10],
      ["③", 56, 42],
    ],
    callouts: [
      "① 左メニューから各管理機能へ移動します。Editorは権限範囲に応じて表示メニューが絞られます。",
      "② ログイン中の管理者名、ロール、ログアウトボタンです。",
      "③ よく使う操作へのショートカットです。",
    ],
    steps: [
      "ログイン後、最初に表示される画面です。",
      "担当リーグ数、公開中ニュースなどの概況を確認します。",
      "更新したい対象に合わせて、左メニューまたはショートカットから移動します。",
    ],
    notes: [
      "Ownerは全リーグと全グローバルコンテンツを扱えます。",
      "Editorは割当済みリーグを中心に操作します。",
    ],
  },
  {
    title: "3. 権限と担当割当",
    image: "assignments.png",
    markers: [
      ["①", 34, 26],
      ["②", 74, 26],
      ["③", 45, 55],
      ["④", 45, 75],
      ["⑤", 18, 91],
    ],
    callouts: [
      "① 担当者を追加します。同じメールアドレスで保存すると既存担当者を更新できます。",
      "② Editorに担当リーグを割り当てます。",
      "③ 割当一覧です。「解除」で担当リーグを外します。",
      "④ 登録済み担当者です。表示名・ロールを編集できます。",
      "⑤ OwnerとEditorの権限概要です。",
    ],
    steps: [
      "「担当者を追加」でGoogleメールアドレス、表示名、ロールを入力し「担当者を保存」を押します。",
      "担当者情報を更新したい場合は、「登録済み担当者」で表示名またはロールを変更し「担当者を更新」を押します。",
      "ロール変更を含む更新は確認ダイアログで権限範囲の変更を承認します。",
      "「担当リーグを割り当て」でEditorとリーグを選び「割当を追加」を押します。",
      "割当を外す場合は「現在の割当一覧」の「解除」を押し、確認ダイアログで承認します。",
      "担当者を削除する場合は「登録済み担当者」の「削除」を押します。",
    ],
    notes: [
      "Owner: 全リーグ、ニュース、チーム、資料、担当割当を操作できます。",
      "Editor: 割当済みリーグの結果画像、試合結果、順位表を編集できます。ニュース、チーム、資料、担当割当は操作できません。",
      "ログイン中Ownerの自己降格、最後のOwnerのEditor変更はできません。",
      "EditorをOwnerへ変更すると、不要になった担当リーグ割当は解除されます。",
      "Owner本人、Ownerロールの担当者、更新履歴に紐づく担当者は管理画面から削除できません。",
      "現行UIでは担当権限は「担当リーグ編集」としてまとめて扱います。",
    ],
  },
  {
    title: "4. 権限と担当割当: 担当者編集・削除",
    image: "assignments-users.png",
    markers: [
      ["①", 47, 20],
      ["②", 36, 45],
      ["③", 47, 66],
      ["④", 22, 81],
    ],
    callouts: [
      "① 登録済み担当者の編集エリアです。",
      "② 表示名、メール、ロール、有効状態を確認します。",
      "③ 「担当者を更新」で変更を保存します。",
      "④ 退任者は無効化できます。削除可能なEditorは削除できます。",
    ],
    steps: [
      "「登録済み担当者」で対象担当者のカードを確認します。",
      "表示名またはロールを変更します。メールアドレスはGoogle認証のキーとして固定表示です。",
      "「担当者を更新」を押し、確認ダイアログで承認します。",
      "ログインを止めたい場合は「無効化」を押し、確認ダイアログで承認します。",
      "削除する場合は「削除」を押し、確認ダイアログで承認します。",
    ],
    notes: [
      "ロール変更は権限範囲が変わるため、必ず確認ダイアログを挟みます。",
      "無効化した担当者は管理画面へログインできません。有効化すると再びログイン可能になります。",
      "ログイン中Ownerの自己降格、最後のOwnerのEditor変更はできません。",
      "ログイン中Ownerの自己無効化、最後の有効なOwnerの無効化はできません。",
      "EditorをOwnerへ変更すると、不要になった担当リーグ割当は解除されます。",
      "Owner、ログイン中ユーザー、更新履歴に紐づく担当者は削除できません。",
    ],
  },
  {
    title: "5. 大会・年度・リーグ・所属チーム管理",
    image: "competitions.png",
    markers: [
      ["①", 24, 31],
      ["②", 61, 31],
      ["③", 25, 70],
      ["④", 61, 70],
      ["⑤", 83, 91],
    ],
    callouts: [
      "① 年度を追加します。現在年度にすると他年度の現在フラグは外れます。",
      "② 大会を追加します。東京リーグ、山藤杯、その他を選択できます。",
      "③ 大会配下のリーグを追加します。",
      "④ リーグへ所属チームを追加します。",
      "⑤ 所属済みチームは一覧から解除できます。",
    ],
    steps: [
      "新年度を作る場合は「年度を追加」で年度、表示名、必要に応じて「現在の年度にする」を入力して保存します。",
      "「大会を追加」で年度、大会名、大会種別、回次、補足、状態を入力し「大会を保存」を押します。",
      "「リーグを追加」で大会とリーグ名を選び「リーグを保存」を押します。URL用識別子はリーグ名から自動生成されます。",
      "「リーグ所属チームを追加」でリーグ、チーム、表示順を選び「所属チームを追加」を押します。",
      "所属を外す場合は「リーグ所属チーム一覧」の「解除」を押します。",
    ],
    notes: [
      "大会状態: 下書き、公開、終了。",
      "リーグは作成時点では下書きです。結果画像を保存すると公開状態になります。",
      "現行管理画面では年度・大会・リーグ自体の編集、削除UIはありません。修正が必要な場合は開発者によるデータメンテナンス対象です。",
      "チームそのものの追加・編集・削除は「チーム管理」で行います。",
    ],
  },
  {
    title: "6. 結果管理: 対象選択・登録状況確認",
    image: "results-top.png",
    markers: [
      ["①", 48, 28],
      ["②", 50, 47],
      ["③", 34, 72],
      ["④", 73, 72],
    ],
    callouts: [
      "① 年度、大会、リーグを選択します。",
      "② 選択中リーグの登録状況を確認します。",
      "③ 所属チームや結果画像の有無を確認します。",
      "④ 登録試合数や順位表行数を確認します。",
    ],
    steps: [
      "「結果管理」を開き、年度、大会、リーグを選択します。",
      "選択中リーグの登録試合数、順位表行数、所属チーム数、結果画像有無を確認します。",
      "この画面で編集対象を間違えていないか確認してから、下の結果画像・試合・順位表入力へ進みます。",
    ],
    notes: [
      "Editorは割当済みリーグのみ選択・編集できます。",
    ],
  },
  {
    title: "7. 結果管理: 結果画像・試合追加",
    image: "results-middle.png",
    markers: [
      ["①", 49, 21],
      ["②", 47, 61],
      ["③", 77, 33],
      ["④", 77, 72],
    ],
    callouts: [
      "① 結果画像と補足説明を管理します。",
      "② 登録済み結果画像のプレビューです。",
      "③ 試合結果を追加します。",
      "④ 得点、会場、備考を入力します。",
    ],
    steps: [
      "結果画像を新規登録・差し替えする場合は「結果画像を選択」で画像を選びます。",
      "補足説明を入力または更新し「結果画像を保存」を押します。",
      "試合を追加する場合は試合日、ホーム、アウェイ、得点、会場、備考を入力します。",
      "「試合結果を追加」を押し、成功メッセージを確認します。",
    ],
    notes: [
      "結果画像はJPG / PNG / WebPのみ、10MB以下です。アップロード時にMIME typeと画像内容を確認します。",
      "ホームとアウェイに同じチームは登録できません。",
      "得点が両方入力されている試合は実施済み、得点未入力を含む試合は予定扱いです。",
    ],
  },
  {
    title: "8. 結果管理: 順位表入力・試合更新",
    image: "results-standings.png",
    markers: [
      ["①", 48, 26],
      ["②", 88, 18],
      ["③", 48, 56],
      ["④", 20, 86],
    ],
    callouts: [
      "① 順位表の入力エリアです。",
      "② 登録済み試合から順位表を自動再計算します。",
      "③ チームごとに順位・試合数・勝敗・得失点・勝点を入力します。",
      "④ 入力後、下部の保存ボタンでまとめて保存します。保存前は登録値への復帰・入力クリアもできます。",
    ],
    steps: [
      "順位、試合、勝、分、負、得点、失点、勝点を入力し「順位表をまとめて保存」を押します。",
      "入力中の内容を破棄する場合は「登録値に戻す」を押します。初期値から入力し直す場合は「入力をクリア」を押します。",
      "試合結果から作る場合は「試合結果から再計算」を押します。勝点、得失点差、得点、チーム名順で順位が作成されます。",
      "登録済み試合を更新する場合は該当試合の入力欄を直し「試合結果を更新」を押します。",
      "試合を削除する場合は該当試合の「削除」を押し、確認ダイアログで承認します。",
      "保存後、「登録済み順位表の確認」で順位・勝点・試合数・得失点差を確認します。",
    ],
    notes: [
      "順位表はチーム単位で重複不可、順位も重複不可です。",
      "過去大会は結果画像を正本として扱い、スコア入力と再計算は今年度大会のみです。",
      "登録値に戻す・入力クリアは画面上の入力値だけを変更します。保存するまで登録済み順位表は変わりません。",
      "所属チーム分を再登録したい場合は、順位表をまとめて保存するか試合結果から再計算します。",
    ],
  },
  {
    title: "9. 結果管理: 登録済み順位表の確認・削除",
    image: "results-registered-standings.png",
    markers: [
      ["①", 46, 28],
      ["②", 45, 45],
      ["③", 31, 64],
      ["④", 26, 79],
    ],
    callouts: [
      "① 登録済み順位表の確認欄です。",
      "② チームごとの順位を確認します。",
      "③ 勝点、試合数、得失点差を確認します。",
      "④ 個別行を削除します。",
    ],
    steps: [
      "順位表を保存または再計算したあと、「登録済み順位表の確認」を確認します。",
      "順位、チーム名、勝点、試合数、得失点差が想定どおりか確認します。",
      "不要な順位表行がある場合は該当行の「削除」を押します。",
      "確認ダイアログで承認し、成功メッセージと一覧の更新を確認します。",
    ],
    notes: [
      "個別行削除は選択中リーグに属する順位表行だけが対象です。",
      "削除後に再登録したい場合は、順位表をまとめて保存するか試合結果から再計算します。",
      "順位表行の追加は追加実装候補です。入力クリアは順位表入力エリアで対応済みです。",
    ],
  },
  {
    title: "10. お知らせ管理: 一覧・新規作成・更新・削除",
    image: "news-list.png",
    markers: [
      ["①", 84, 25],
      ["②", 80, 43],
      ["③", 61, 43],
    ],
    callouts: [
      "① 新規作成画面へ移動します。",
      "② 既存記事の編集・削除操作です。",
      "③ 公開日時、区分、タイトル、状態を確認します。",
    ],
    steps: [
      "新規作成は「新規作成」を押して作成画面へ進みます。",
      "更新は一覧の「編集」を押し、入力内容を変更して「更新を保存」を押します。",
      "削除は一覧の「削除」を押し、確認ダイアログで承認します。",
      "削除後は公開サイトのニュース一覧とトップページが再検証されます。",
    ],
    notes: [
      "ニュース管理はOwnerのみ操作できます。",
      "削除は元に戻せないため、公開停止だけでよい場合は状態を「非公開」にします。",
    ],
  },
  {
    title: "11. お知らせ管理: 入力項目",
    image: "news-form.png",
    markers: [
      ["①", 47, 32],
      ["②", 47, 42],
      ["③", 47, 61],
      ["④", 40, 75],
      ["⑤", 20, 85],
    ],
    callouts: [
      "① タイトルを入力します。",
      "② 本文を入力します。",
      "③ 任意でアイキャッチ画像を選択します。",
      "④ 公開状態と公開日時を指定します。",
      "⑤ 保存ボタンです。",
    ],
    steps: [
      "タイトルと本文を入力します。どちらも必須です。",
      "必要に応じてアイキャッチ画像を選びます。編集時に新しい画像を選ぶと差し替わります。",
      "公開状態を「下書き」「公開」「非公開」から選びます。",
      "公開する場合は公開日時を指定します。空欄で公開保存すると保存時点の日時が入ります。",
      "「ニュースを保存」または「更新を保存」を押し、成功メッセージを確認します。",
    ],
    notes: [
      "アイキャッチ画像はJPG / PNG / WebPのみ、10MB以下です。アップロード時にMIME typeと画像内容を確認します。",
      "公開日時入力は管理画面の日時として日本時間で扱います。",
      "URLスラッグは新規作成時にタイトルから自動生成されます。",
    ],
  },
  {
    title: "12. チーム管理: 一覧・新規・更新・削除",
    image: "teams-list.png",
    markers: [
      ["①", 83, 25],
      ["②", 79, 43],
    ],
    callouts: [
      "① 新規追加画面へ移動します。",
      "② チームごとの編集・削除操作です。",
    ],
    steps: [
      "新規追加は「新規追加」を押します。",
      "更新は該当チームの「編集」を押し、入力内容を変更して「更新を保存」を押します。",
      "削除は該当チームの「削除」を押し、確認ダイアログで承認します。",
    ],
    notes: [
      "チーム管理はOwnerのみ操作できます。",
      "リーグ所属、試合、順位表に紐づくチームは削除できません。先に関連付けを整理してください。",
    ],
  },
  {
    title: "13. チーム管理: 入力項目",
    image: "teams-form.png",
    markers: [
      ["①", 47, 31],
      ["②", 47, 59],
      ["③", 47, 82],
      ["④", 20, 92],
    ],
    callouts: [
      "① チーム名、略称、紹介文を入力します。",
      "② ロゴ画像とチーム画像をアップロードします。",
      "③ 結成、地域、代表者、監督、公式サイトURL、Instagram URL、状態、表示順を入力します。",
      "④ 保存ボタンです。",
    ],
    steps: [
      "チーム名を入力します。チーム名は必須です。",
      "略称、紹介文、結成、地域、代表者、監督、公式サイトURL、Instagram URLを必要に応じて入力します。",
      "ロゴ画像、チーム画像を選択します。編集時は新しい画像を選ぶと差し替わります。",
      "状態を「下書き」「公開」「非公開」から選び、表示順を入力します。",
      "「チームを保存」または「更新を保存」を押します。",
    ],
    notes: [
      "ロゴ画像はJPG / PNG / WebPのみ、240x240px以上、5MB以下です。",
      "チーム画像はJPG / PNG / WebPのみ、1200x675px以上、横長、5MB以下です。",
      "画像アップロード時はMIME typeと画像内容を確認します。",
      "Instagram URLはURL、@アカウント名、アカウント名のみの入力に対応します。",
      "新規作成時のURLスラッグはチーム名から自動生成されます。更新時は既存スラッグを維持します。",
    ],
  },
  {
    title: "14. 資料管理: 新規・更新・削除・公開URL確認",
    image: "downloads.png",
    markers: [
      ["①", 46, 28],
      ["②", 47, 53],
      ["③", 48, 72],
      ["④", 78, 91],
    ],
    callouts: [
      "① タイトル、カテゴリ、説明を入力します。",
      "② 資料ファイルを選択します。編集時は差し替えできます。",
      "③ 公開状態、公開日、表示順を指定します。",
      "④ 公開資料一覧から公開URL確認、編集、削除を行います。",
    ],
    steps: [
      "新規追加は資料管理画面上部のフォームに入力し「資料を保存」を押します。",
      "更新は公開資料一覧の「編集」を押し、必要項目を変更して「変更を保存」を押します。",
      "ファイルだけ差し替えたい場合は編集画面で「資料を差し替える」から新ファイルを選びます。",
      "一覧の「公開URLを確認」からアップロード済み資料を別タブで開きます。",
      "削除は一覧の「削除」を押し、確認ダイアログで承認します。",
    ],
    notes: [
      "資料管理はOwnerのみ操作できます。",
      "カテゴリ: 規約、ガイドライン、資料、その他。",
      "対応ファイル: PDF, Excel（.xlsx/.xls）, Word（.doc/.docx）。20MB以下です。",
      "アップロード時は拡張子、MIME type、ファイル内容のシグネチャを確認します。",
      "公開状態が公開で公開日が空欄の場合は保存時点の日付が入ります。",
      "一覧にはアップロード済みファイル名も表示されるため、差し替え前後の確認に使えます。",
    ],
  },
];

const globalChecklist = [
  ["ログイン", "Google認証、有効な管理者メール登録、ログアウト、未登録・無効化済みメール不可"],
  ["権限", "Owner / Editor、担当者編集、担当者無効化、担当リーグ割当、割当解除、担当者削除制限"],
  ["大会", "年度追加、大会追加、リーグ追加、所属チーム追加・解除"],
  ["試合", "対象リーグ選択、結果画像追加・差替、試合追加・更新・削除"],
  ["順位表", "まとめて保存、試合結果から再計算、登録内容確認、個別行削除、入力クリア"],
  ["お知らせ", "新規作成、編集、削除、下書き・公開・非公開、アイキャッチ"],
  ["チーム", "新規追加、編集、削除、画像条件、参照中削除不可"],
  ["資料", "新規追加、編集、ファイル差替、削除、カテゴリ・公開状態"],
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function markerHtml(markers) {
  return markers
    .map(([label, left, top]) => `<span class="marker" style="left:${left}%;top:${top}%">${label}</span>`)
    .join("");
}

function listItems(items) {
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function sectionHtml(section) {
  const imgSrc = pathToFileURL(path.join(assetsDir, section.image)).href;
  return `
    <section class="page section-page">
      <header class="section-header">
        <p>Tokyo League Admin Manual</p>
        <h2>${escapeHtml(section.title)}</h2>
      </header>
      <figure class="shot">
        <img src="${imgSrc}" alt="${escapeHtml(section.title)}">
        ${markerHtml(section.markers)}
      </figure>
      <div class="callout-grid">
        ${section.callouts.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
      </div>
      <div class="content-grid">
        <div>
          <h3>操作手順</h3>
          <ol>${listItems(section.steps)}</ol>
        </div>
        <div>
          <h3>仕様・注意点</h3>
          <ul>${listItems(section.notes)}</ul>
        </div>
      </div>
    </section>
  `;
}

const html = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>東京リーグ 管理画面 操作マニュアル</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #18212f;
      font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", "Noto Sans JP", Arial, sans-serif;
      line-height: 1.52;
      background: #f5f7fa;
    }
    .page {
      page-break-after: always;
      min-height: 186mm;
      padding: 0;
      background: #fff;
    }
    .cover {
      display: grid;
      align-content: center;
      gap: 16px;
      padding: 26mm;
      background: linear-gradient(135deg, #0d3b66, #0b6b75 58%, #d08b18);
      color: white;
    }
    .cover p { max-width: 720px; margin: 0; font-size: 13pt; }
    .cover h1 { margin: 0; font-size: 31pt; letter-spacing: 0; line-height: 1.2; }
    .cover .meta { margin-top: 18mm; display: grid; gap: 6px; color: rgba(255,255,255,.86); }
    .toc {
      padding: 12mm 14mm;
    }
    .toc h2, .section-header h2 { margin: 0; font-size: 18pt; letter-spacing: 0; }
    .toc-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px 18px;
      margin-top: 10mm;
    }
    .toc-item {
      border-left: 4px solid #0b6b75;
      padding: 6px 10px;
      background: #f3f7f8;
      font-size: 10.5pt;
    }
    .scope {
      padding: 12mm 14mm;
    }
    .scope h2 {
      margin: 0;
      font-size: 18pt;
    }
    .check-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8mm;
      font-size: 9.4pt;
    }
    .check-table th, .check-table td {
      border: 1px solid #d7dee8;
      padding: 7px 8px;
      vertical-align: top;
    }
    .check-table th {
      background: #edf4f6;
      text-align: left;
      width: 24%;
    }
    .section-page {
      padding: 0;
    }
    .section-header {
      display: flex;
      align-items: end;
      justify-content: space-between;
      padding-bottom: 6px;
      border-bottom: 2px solid #0b6b75;
    }
    .section-header p {
      margin: 0 0 3px;
      color: #667084;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: .05em;
    }
    .shot {
      position: relative;
      margin: 7mm 0 4mm;
      width: 100%;
      height: 88mm;
      overflow: hidden;
      border: 1px solid #cdd6e1;
      background: #eef2f6;
    }
    .shot img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top left;
      display: block;
    }
    .marker {
      position: absolute;
      transform: translate(-50%, -50%);
      display: grid;
      place-items: center;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: #d08b18;
      color: #fff;
      border: 2px solid #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,.28);
      font-weight: 800;
      font-size: 10pt;
    }
    .callout-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 4px 10px;
      margin: 0 0 4mm;
      font-size: 8.2pt;
    }
    .callout-grid p {
      margin: 0;
      padding: 4px 7px;
      background: #fff8ec;
      border-left: 3px solid #d08b18;
    }
    .content-grid {
      display: grid;
      grid-template-columns: 1.18fr .92fr;
      gap: 10mm;
      font-size: 8.7pt;
    }
    .content-grid h3 {
      margin: 0 0 4px;
      color: #0d3b66;
      font-size: 10.5pt;
    }
    ol, ul { margin: 0; padding-left: 18px; }
    li { margin: 0 0 3px; }
    code {
      font-family: "SFMono-Regular", Menlo, Consolas, monospace;
      background: #eef2f6;
      padding: 1px 4px;
      border-radius: 3px;
      font-size: .92em;
    }
    .limit-page {
      padding: 12mm 14mm;
      font-size: 10pt;
    }
    .limit-page h2 { margin-top: 0; font-size: 18pt; }
    .limit-page table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8mm;
      font-size: 9.2pt;
    }
    .limit-page th, .limit-page td {
      border: 1px solid #d7dee8;
      padding: 8px;
      vertical-align: top;
    }
    .limit-page th { background: #edf4f6; text-align: left; }
  </style>
</head>
<body>
  <section class="page cover">
    <p>納品用</p>
    <h1>東京リーグ<br>管理画面 操作マニュアル</h1>
    <p>ログイン、権限、担当割当、試合結果、お知らせ、チーム、資料、大会管理の運用手順をまとめた管理者向け手順書です。</p>
    <div class="meta">
      <span>作成日: ${escapeHtml(today)} JST</span>
      <span>対象: Tokyo League 管理画面</span>
      <span>形式: 画面番号付きPDFマニュアル</span>
    </div>
  </section>

  <section class="page toc">
    <h2>目次</h2>
    <div class="toc-grid">
      ${sections.map((section) => `<div class="toc-item">${escapeHtml(section.title)}</div>`).join("")}
    </div>
  </section>

  <section class="page scope">
    <h2>網羅範囲</h2>
    <table class="check-table">
      <thead><tr><th>対象</th><th>本マニュアルで扱う内容</th></tr></thead>
      <tbody>
        ${globalChecklist.map(([target, content]) => `<tr><th>${escapeHtml(target)}</th><td>${escapeHtml(content)}</td></tr>`).join("")}
      </tbody>
    </table>
  </section>

  <section class="page limit-page">
    <h2>共通ルール</h2>
    <table>
      <tbody>
        <tr><th>保存完了</th><td>各フォーム保存後は画面上部の成功メッセージを確認します。エラー時は入力内容、権限、ファイル条件を見直します。</td></tr>
        <tr><th>削除操作</th><td>削除・解除操作は確認ダイアログが表示されます。承認すると即時反映されます。</td></tr>
        <tr><th>公開状態</th><td>下書きは公開前、公開は公開サイト表示対象、非公開・アーカイブは公開停止用途です。</td></tr>
        <tr><th>時刻</th><td>管理画面で扱う公開日時・表示日時は日本時間を基準にします。</td></tr>
        <tr><th>ファイル</th><td>アップロードは種類・サイズ制限があります。画像や資料を差し替える場合は保存前に選択ファイル名を確認します。</td></tr>
        <tr><th>権限不足</th><td>メニューが表示されない、対象リーグが出ない、保存できない場合はOwnerへ担当割当を確認します。</td></tr>
      </tbody>
    </table>
  </section>

  ${sections.map(sectionHtml).join("")}

  <section class="page limit-page">
    <h2>現行管理画面の制限事項・追加実装候補</h2>
    <table>
      <tbody>
        <tr><th>年度・大会・リーグ</th><td>新規追加は可能ですが、単体の編集・削除UIはありません。編集、削除、表示順、期間、公開日の管理を追加実装候補とします。</td></tr>
        <tr><th>順位表行</th><td>登録済み順位表はまとめて保存で上書きできます。個別行削除と入力クリアは対応済みです。任意行追加は追加実装候補とします。</td></tr>
        <tr><th>担当権限の細分化</th><td>内部データには結果編集、順位編集、リーグ管理の種別がありますが、現行UIでは「担当リーグ編集」としてまとめて付与します。細分化UIを追加実装候補とします。</td></tr>
        <tr><th>担当者の無効化</th><td>担当者の表示名・ロール変更、無効化、削除に対応済みです。無効化した担当者は管理画面へログインできません。</td></tr>
        <tr><th>大会関連ファイル</th><td>要項、組み合わせ、結果PDFなどを大会に紐づける <code>CompetitionFile</code> モデルはありますが管理UIはありません。資料管理との使い分けを含めて追加実装候補とします。</td></tr>
        <tr><th>固定ページ・問い合わせ設定・会場</th><td>データモデルはありますが管理UIはありません。納品後の運用範囲に応じて追加実装候補とします。</td></tr>
        <tr><th>担当者削除</th><td>Owner、ログイン中ユーザー、更新履歴に紐づくユーザーは削除できません。退任時は必要に応じて割当解除を行います。</td></tr>
      </tbody>
    </table>
    <p style="margin-top:8mm;">詳細な実装候補は <code>docs/admin-manual/admin-ui-gap-list.md</code> に整理しています。</p>
  </section>
</body>
</html>`;

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(htmlPath, html, "utf8");

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
await page.pdf({
  path: pdfPath,
  format: "A4",
  landscape: true,
  printBackground: true,
  margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
});
await browser.close();

console.log(pdfPath);
