import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve("docs/admin-manual");
const assetsDir = path.join(root, "assets");
const outputDir = path.join(root, "output");
const htmlPath = path.join(outputDir, "tokyo-league-result-management-howto.html");
const pdfPath = path.join(outputDir, "tokyo-league-result-management-howto.pdf");

const today = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const pages = [
  {
    title: "1. 対象リーグを選択する",
    image: "results-top.png",
    markers: [
      ["①", 34, 35],
      ["②", 59, 35],
      ["③", 84, 35],
      ["④", 36, 62],
    ],
    lead: "結果を登録する前に、更新対象の年度・大会・リーグを必ず選択します。選択を誤ると、別リーグの結果を更新してしまいます。",
    simpleSteps: [
      "①「年度」で、結果を登録する年度を選択します。",
      "②「大会」で、対象となる大会を選択します。",
      "③「リーグ」で、結果を登録するリーグを選択します。",
      "④ 選択後、「入稿方法を選ぶ」エリアが表示されていることを確認します。",
    ],
    remember: [
      "登録前に、年度・大会・リーグ名が手元の資料と一致しているか確認してください。",
      "Editor権限の場合、割り当てられているリーグのみ選択できます。",
    ],
  },
  {
    title: "2. 入稿方法を選択する",
    image: "results-import-guide.png",
    markers: [
      ["①", 30, 96],
      ["②", 67, 96],
    ],
    lead: "手元に結果管理表のExcelファイルがあるかどうかで、進む手順が変わります。該当する方法のボタンを選択します。",
    simpleSteps: [
      "① Excelファイルがある場合は、「Excel入稿へ進む」を押します。",
      "② Excelファイルがない場合は、「手入力へ進む」を押します。",
      "過去大会で試合スコアを編集しない場合は、結果画像の登録を行います。",
      "いずれの方法でも、登録後は順位表の内容を確認します。",
    ],
    remember: [
      "Excel入稿は、複数試合をまとめて追加・更新する場合に使用します。",
      "手入力は、Excelがない場合や一部の試合だけを追加する場合に使用します。",
      "過去大会は、結果画像を正本として扱う運用があります。",
    ],
  },
  {
    title: "3. Excelファイルから試合結果を入稿する",
    image: "results-excel.png",
    markers: [
      ["①", 27, 56],
      ["②", 60, 77],
    ],
    lead: "Excel入稿では、「管理表」シートを読み取り、画面上で内容を確認してから試合結果へ反映します。",
    simpleSteps: [
      "①「Excelを選択」を押し、「管理表」シートが入った .xlsx ファイルを選択します。",
      "②「Excelの内容を読み取る」を押します。",
      "読み取り結果の確認画面で、チーム名・試合日・得点・会場・新規／更新の区分を確認します。",
      "エラーが表示された場合はExcelファイルを修正し、再度読み取ります。",
      "エラーがないことを確認してから、試合結果へ反映します。",
    ],
    remember: [
      "対応形式は .xlsx、ファイルサイズは5MB以下です。",
      "既存の同一対戦カードは更新され、新しい対戦カードは追加されます。",
      "Excelに存在しない既存試合は、自動削除されません。",
    ],
  },
  {
    title: "4. 結果画像を登録し、必要に応じて試合結果を手入力する",
    image: "results-middle.png",
    markers: [
      ["①", 27, 80],
      ["②", 49, 80],
      ["③", 79, 29],
      ["④", 80, 60],
    ],
    lead: "結果画像は公開ページで参照される画像です。Excelがない場合や一部試合を追加する場合は、右側の入力欄から試合結果を手入力します。",
    simpleSteps: [
      "① 生成済みの星取表画像を確認する場合は、「星取表画像を開く」を押します。",
      "② 生成済みの星取表を公開用の結果画像にする場合は、「この星取表を結果画像にする」を押します。",
      "③ 手入力する場合は、試合日を入力します。",
      "④ ホーム・アウェイ・得点・会場を入力し、「試合結果を追加」を押します。",
    ],
    remember: [
      "ホームとアウェイに同じチームは選択できません。",
      "ホーム得点とアウェイ得点が両方入力された試合は、実施済みとして扱われます。",
      "結果画像をアップロードする場合は、JPG / PNG / WebP、10MB以下のファイルを使用します。",
    ],
  },
  {
    title: "5. 順位表を作成・更新する",
    image: "results-standings.png",
    markers: [
      ["①", 90, 9],
      ["②", 54, 31],
      ["③", 91, 31],
      ["④", 52, 65],
    ],
    lead: "試合結果の登録後、順位表を再計算または手入力で更新します。保存後の順位表は公開ページにも反映されます。",
    simpleSteps: [
      "① 登録済み試合から順位表を作る場合は、「試合結果から再計算」を押します。",
      "② 順位表にチームを追加する場合は、追加するチームを選択します。",
      "③「行を追加」を押し、順位表の入力行を追加します。",
      "④ 順位・試合数・勝敗・得失点・勝点を確認し、必要に応じて修正します。",
      "内容を確認したら、「順位表をまとめて保存」を押します。",
    ],
    remember: [
      "同じチームを順位表に重複登録することはできません。",
      "順位も重複できません。保存前に順位の重複がないか確認してください。",
      "「入力をクリア」は画面上の入力値を消す操作です。保存するまで登録済みデータは変更されません。",
    ],
  },
  {
    title: "6. 登録済み順位表を確認する",
    image: "results-registered-standings.png",
    markers: [
      ["①", 36, 45],
      ["②", 36, 68],
      ["③", 75, 68],
      ["④", 93, 68],
    ],
    lead: "順位表を保存した後は、登録済み順位表の一覧で、順位・チーム名・試合数・得失点差・勝点を確認します。",
    simpleSteps: [
      "①「登録済み順位表の確認」エリアを表示します。",
      "② 順位とチーム名が正しいことを確認します。",
      "③ 試合数・得失点差・勝点が正しいことを確認します。",
      "④ 不要な行がある場合は「削除」を押し、確認ダイアログで承認します。",
    ],
    remember: [
      "数値に誤りがある場合は、試合結果または順位表入力へ戻って修正します。",
      "狭い画面では、表を横スクロールして全列を確認します。",
      "削除操作は元に戻せないため、対象行を確認してから実行してください。",
    ],
  },
];

const routes = [
  {
    label: "Excelファイルあり",
    summary: "結果管理表を読み取り、確認後に複数試合をまとめて反映します。",
    steps: ["対象リーグ選択", "Excel入稿", "内容読み取り", "内容確認", "試合へ反映", "順位表確認"],
  },
  {
    label: "Excelファイルなし",
    summary: "試合日、対戦チーム、得点、会場を1試合ずつ入力します。",
    steps: ["対象リーグ選択", "手入力", "試合を追加", "登録済み試合確認", "順位表保存", "登録済み順位表確認"],
  },
  {
    label: "過去大会・結果画像管理",
    summary: "試合スコアを編集せず、結果画像を正本として登録・確認します。",
    steps: ["対象リーグ選択", "結果画像", "画像を登録", "補足説明を入力", "保存", "公開ページ確認"],
  },
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
    .map(([, left, top], index) => `<span class="marker" style="left:${left}%;top:${top}%">${index + 1}</span>`)
    .join("");
}

function listItems(items) {
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function pageHtml(page) {
  const imgSrc = pathToFileURL(path.join(assetsDir, page.image)).href;

  return `
    <section class="page lesson-page">
      <div class="lesson-layout">
        <div class="lesson-copy">
          <p class="kicker">Result Management HowTo</p>
          <h2>${escapeHtml(page.title)}</h2>
          <p class="lead">${escapeHtml(page.lead)}</p>
          <h3>操作手順</h3>
          <ol>${listItems(page.simpleSteps)}</ol>
          <h3>確認ポイント</h3>
          <ul>${listItems(page.remember)}</ul>
        </div>
        <figure class="mock">
          <img src="${imgSrc}" alt="${escapeHtml(page.title)}">
          ${markerHtml(page.markers)}
        </figure>
      </div>
    </section>
  `;
}

const html = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>東京リーグ 結果管理 HowTo</title>
  <style>
    @page { size: A4 landscape; margin: 0; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #18212f;
      font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", "Noto Sans JP", Arial, sans-serif;
      line-height: 1.55;
      background: #eff5f8;
    }
    .page {
      width: 297mm;
      height: 210mm;
      break-after: page;
      background: #fff;
      overflow: hidden;
    }
    .page:last-child {
      break-after: auto;
    }
    .cover {
      display: grid;
      grid-template-columns: 1.05fr .95fr;
      gap: 14mm;
      align-items: center;
      padding: 18mm;
      background: radial-gradient(circle at 82% 18%, rgba(255,255,255,.28), transparent 22%), linear-gradient(135deg, #0d3b66, #0b6b75 58%, #d08b18);
      color: #fff;
    }
    .cover h1 {
      margin: 0;
      font-size: 35pt;
      line-height: 1.12;
      letter-spacing: -.02em;
    }
    .cover p {
      margin: 0;
      font-size: 13pt;
    }
    .cover-card {
      display: grid;
      gap: 10px;
      padding: 14mm;
      border-radius: 24px;
      background: rgba(255,255,255,.14);
      border: 1px solid rgba(255,255,255,.3);
    }
    .cover-card strong {
      font-size: 17pt;
    }
    .meta {
      margin-top: 12mm;
      color: rgba(255,255,255,.86);
      display: grid;
      gap: 5px;
      font-size: 10.5pt;
    }
    .map-page {
      padding: 12mm 14mm;
    }
    .map-page h2, .lesson-copy h2, .check-page h2 {
      margin: 0;
      font-size: 22pt;
      line-height: 1.25;
    }
    .map-lead {
      margin: 5mm 0 6mm;
      max-width: 220mm;
      font-size: 12.2pt;
      color: #3d4a5c;
    }
    .route-grid {
      display: grid;
      gap: 6mm;
    }
    .route-card {
      display: grid;
      grid-template-columns: 50mm 1fr;
      gap: 6mm;
      align-items: center;
      padding: 5mm;
      border: 1px solid #d9e3ec;
      border-radius: 18px;
      background: #f7fafc;
    }
    .route-card__header {
      display: grid;
      gap: 2mm;
    }
    .route-card__header h3 {
      margin: 0;
      color: #0d3b66;
      font-size: 13.5pt;
    }
    .route-card__header p {
      margin: 0;
      color: #4b596b;
      font-size: 9.3pt;
      line-height: 1.45;
    }
    .route-card__steps {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 4px;
      align-items: center;
    }
    .route-step {
      display: grid;
      place-items: center;
      min-height: 17mm;
      padding: 5px;
      text-align: center;
      border-radius: 14px;
      background: #fff;
      border: 1px solid #ccd9e5;
      font-weight: 700;
      font-size: 8.8pt;
      position: relative;
    }
    .route-step:first-child {
      background: #0d3b66;
      color: #fff;
      border-color: #0d3b66;
    }
    .route-step:not(:last-child)::after {
      content: "→";
      position: absolute;
      right: -7px;
      color: #0d3b66;
      font-weight: 900;
      z-index: 1;
    }
    .lesson-page {
      padding: 10mm 11mm;
    }
    .lesson-layout {
      display: grid;
      grid-template-columns: 92mm 1fr;
      gap: 8mm;
      align-items: start;
    }
    .kicker {
      margin: 0 0 4px;
      color: #0b6b75;
      text-transform: uppercase;
      letter-spacing: .08em;
      font-size: 8.5pt;
      font-weight: 800;
    }
    .lead {
      margin: 5mm 0;
      padding: 5mm;
      border-radius: 18px;
      background: #eef8f8;
      border-left: 5px solid #0b6b75;
      font-size: 11.3pt;
      font-weight: 700;
    }
    .lesson-copy h3 {
      margin: 5mm 0 2mm;
      color: #0d3b66;
      font-size: 13pt;
    }
    ol, ul {
      margin: 0;
      padding-left: 19px;
      font-size: 10.2pt;
    }
    li {
      margin-bottom: 4px;
    }
    .mock {
      position: relative;
      margin: 0;
      width: 100%;
      aspect-ratio: 1440 / 520;
      overflow: hidden;
      border-radius: 18px;
      border: 2px solid #d3dde8;
      background: #eef2f6;
      box-shadow: 0 12px 30px rgba(11, 36, 54, .14);
    }
    .mock img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: top left;
      display: block;
    }
    .marker {
      position: absolute;
      transform: translate(-50%, -50%);
      display: grid;
      place-items: center;
      width: 31px;
      height: 31px;
      border-radius: 50%;
      background: #d08b18;
      color: #fff;
      border: 3px solid #fff;
      box-shadow: 0 2px 10px rgba(0,0,0,.3);
      font-weight: 900;
      font-size: 12pt;
    }
    .check-page {
      padding: 13mm 14mm;
    }
    .check-grid {
      margin-top: 9mm;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 9mm;
    }
    .check-card {
      padding: 8mm;
      border-radius: 20px;
      background: #f6f9fb;
      border: 1px solid #d9e3ec;
      min-height: 62mm;
    }
    .check-card h3 {
      margin: 0 0 4mm;
      color: #0d3b66;
      font-size: 15pt;
    }
    .done {
      margin-top: 8mm;
      padding: 8mm;
      border-radius: 20px;
      background: #0b6b75;
      color: #fff;
      font-size: 13pt;
      font-weight: 800;
    }
  </style>
</head>
<body>
  <section class="page cover">
    <div>
      <p>別冊・結果管理専用 操作手順書</p>
      <h1>東京リーグ<br>結果管理 操作手順書</h1>
      <p>管理画面の「結果管理」で、対象リーグの選択、Excel入稿、手入力、結果画像登録、順位表確認を行うための手順を整理した資料です。</p>
      <div class="meta">
        <span>作成日: ${escapeHtml(today)} JST</span>
        <span>対象: Tokyo League 管理画面 / 結果管理</span>
        <span>形式: 画面モック付きPDF手順書</span>
      </div>
    </div>
    <div class="cover-card">
      <strong>この資料の目的</strong>
      <p>結果管理で必要な操作を、画面上の入力欄・ボタン・確認箇所に対応させて正確に理解できるようにすることです。</p>
      <strong>対象となる作業</strong>
      <p>年度・大会・リーグの選択、Excel入稿、試合結果の手入力、結果画像の登録、順位表の作成・確認を対象にします。</p>
    </div>
  </section>

  <section class="page map-page">
    <h2>結果管理の全体手順</h2>
    <p class="map-lead">結果管理は、手元の資料の種類によって3つの進め方に分かれます。下の各カードは、左側の説明を確認してから、右側の手順を左から右へ順番に進めます。</p>
    <div class="route-grid">
      ${routes
        .map(
          (route) => `<article class="route-card">
            <div class="route-card__header">
              <h3>${escapeHtml(route.label)}</h3>
              <p>${escapeHtml(route.summary)}</p>
            </div>
            <div class="route-card__steps">
              ${route.steps.map((step) => `<span class="route-step">${escapeHtml(step)}</span>`).join("")}
            </div>
          </article>`,
        )
        .join("")}
    </div>
  </section>

  ${pages.map(pageHtml).join("")}

  <section class="page check-page">
    <h2>最後のチェックリスト</h2>
    <div class="check-grid">
      <article class="check-card">
        <h3>保存前</h3>
        <ul>
          <li>年度・大会・リーグは、手元の資料と一致していますか。</li>
          <li>選択したExcelまたは画像ファイルは、対象リーグのものですか。</li>
          <li>チーム名、試合日、得点、会場に誤りはありませんか。</li>
          <li>過去大会で、不要なスコア手入力を行おうとしていませんか。</li>
        </ul>
      </article>
      <article class="check-card">
        <h3>保存後</h3>
        <ul>
          <li>画面上部に成功メッセージが表示されましたか。</li>
          <li>登録済み試合数は想定どおりですか。</li>
          <li>順位表の順位・試合数・得失点差・勝点は正しいですか。</li>
          <li>公開ページに表示したい内容になっていますか。</li>
        </ul>
      </article>
    </div>
    <div class="done">不明点がある場合は、最初の「対象リーグ」まで戻り、年度・大会・リーグの選択から確認し直してください。</div>
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
  margin: { top: "0", right: "0", bottom: "0", left: "0" },
});
await browser.close();

console.log(pdfPath);
