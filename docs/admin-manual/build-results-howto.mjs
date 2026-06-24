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
    title: "1. まず、どのリーグを直すか選ぶ",
    image: "results-top.png",
    markers: [
      ["①", 48, 28],
      ["②", 49, 47],
      ["③", 34, 72],
      ["④", 73, 72],
    ],
    lead: "結果管理は、最初に「場所」を決めます。ノートの何ページ目に書くかを選ぶイメージです。",
    simpleSteps: [
      "年度を選びます。",
      "大会を選びます。",
      "リーグを選びます。",
      "下の確認欄で、選んだリーグが合っているか見ます。",
    ],
    remember: [
      "ここを間違えると、別のリーグに結果が入ってしまいます。",
      "迷ったら、年度・大会・リーグ名を声に出して確認します。",
    ],
  },
  {
    title: "2. Excelがあるか、ないかを決める",
    image: "results-import-guide.png",
    markers: [
      ["①", 49, 18],
      ["②", 31, 48],
      ["③", 69, 48],
      ["④", 31, 73],
    ],
    lead: "ここは分かれ道です。手元に結果のExcelがあるなら左、ないなら右へ進みます。",
    simpleSteps: [
      "Excelがある: 「Excel入稿へ進む」を押します。",
      "Excelがない: 「手入力へ進む」を押します。",
      "過去大会でスコアを直さない場合: 「結果画像の登録へ進む」を使います。",
      "どの道でも、あとで順位表を確認します。",
    ],
    remember: [
      "Excelありは、まとめて入れられる近道です。",
      "Excelなしは、1試合ずつていねいに入れる道です。",
      "過去大会は、画像を正しい結果として残すことがあります。",
    ],
  },
  {
    title: "3. Excelでまとめて入れる",
    image: "results-excel.png",
    markers: [
      ["①", 48, 20],
      ["②", 49, 42],
      ["③", 49, 66],
      ["④", 22, 88],
    ],
    lead: "Excel入稿は、たくさんの試合を一度に読む方法です。読む前に、ファイルとリーグ名を確認します。",
    simpleSteps: [
      "「Excelファイルを選択」を押します。",
      "「管理表」シートが入った .xlsx ファイルを選びます。",
      "「Excelの内容を読み取る」を押します。",
      "確認画面で、チーム名・日付・点数・会場を見ます。",
      "エラーがなければ「試合を反映する」を押します。",
    ],
    remember: [
      "ファイルは5MB以下の .xlsx です。",
      "同じ対戦カードは更新、新しい対戦カードは追加されます。",
      "エラーが出たら、画面の説明を見てExcelを直してからやり直します。",
    ],
  },
  {
    title: "4. 画像を登録する・1試合ずつ入れる",
    image: "results-middle.png",
    markers: [
      ["①", 49, 21],
      ["②", 47, 61],
      ["③", 77, 33],
      ["④", 77, 72],
    ],
    lead: "結果画像は、紙の結果表を写真で残すようなものです。手入力は、試合を1つずつカードに書くイメージです。",
    simpleSteps: [
      "結果画像を使う場合は「結果画像を選択」で画像を選びます。",
      "説明を書き、「結果画像を保存」を押します。",
      "手入力する場合は、試合日、ホーム、アウェイ、点数、会場を入れます。",
      "「試合結果を追加」を押して、成功メッセージを見ます。",
    ],
    remember: [
      "ホームとアウェイに同じチームは選べません。",
      "点数が両方入っている試合は、実施済みとして扱います。",
      "結果画像はJPG / PNG / WebP、10MB以下です。",
    ],
  },
  {
    title: "5. 順位表を作る・直す",
    image: "results-standings.png",
    markers: [
      ["①", 48, 26],
      ["②", 88, 18],
      ["③", 48, 56],
      ["④", 20, 86],
    ],
    lead: "試合を入れたら、順位表を作ります。点数から自動で作る方法と、自分で数字を直す方法があります。",
    simpleSteps: [
      "試合結果から作る場合は「試合結果から再計算」を押します。",
      "手で直す場合は、順位・試合数・勝敗・得失点・勝点を入力します。",
      "チーム行が足りない場合は、チームを選んで「行を追加」を押します。",
      "最後に「順位表をまとめて保存」を押します。",
    ],
    remember: [
      "順位とチームは重複できません。",
      "「入力をクリア」は画面の入力を消すだけで、保存するまでは登録済みデータは変わりません。",
      "保存後は、下の登録済み順位表で確認します。",
    ],
  },
  {
    title: "6. 登録済み順位表で最後に確認する",
    image: "results-registered-standings.png",
    markers: [
      ["①", 46, 28],
      ["②", 45, 45],
      ["③", 31, 64],
      ["④", 26, 79],
    ],
    lead: "ここがゴール前の確認です。保存した順位表が、表として正しく並んでいるか見ます。",
    simpleSteps: [
      "順位が1位から順番に並んでいるか見ます。",
      "チーム名が合っているか見ます。",
      "試合数、得失点差、勝点が変ではないか見ます。",
      "不要な行があれば「削除」を押し、確認して削除します。",
    ],
    remember: [
      "確認が終わるまでが結果管理です。",
      "おかしい数字を見つけたら、試合結果か順位表入力に戻って直します。",
      "狭い画面では横にスクロールして全部見ます。",
    ],
  },
];

const routes = [
  ["Excelがある", "Excel入稿", "読み取り", "確認", "反映", "順位表再計算"],
  ["Excelがない", "手入力", "1試合ずつ追加", "登録済み試合確認", "順位表保存", "登録済み順位表確認"],
  ["過去大会", "結果画像", "画像を選択", "説明を書く", "保存", "公開ページ確認"],
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
          <h3>やること</h3>
          <ol>${listItems(page.simpleSteps)}</ol>
          <h3>おぼえておくこと</h3>
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
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #18212f;
      font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", "Noto Sans JP", Arial, sans-serif;
      line-height: 1.55;
      background: #eff5f8;
    }
    .page {
      page-break-after: always;
      min-height: 186mm;
      background: #fff;
      overflow: hidden;
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
      padding: 13mm 14mm;
    }
    .map-page h2, .lesson-copy h2, .check-page h2 {
      margin: 0;
      font-size: 22pt;
      line-height: 1.25;
    }
    .map-lead {
      margin: 6mm 0 8mm;
      max-width: 190mm;
      font-size: 13pt;
      color: #3d4a5c;
    }
    .route-grid {
      display: grid;
      gap: 9px;
    }
    .route {
      display: grid;
      grid-template-columns: 28mm repeat(5, 1fr);
      gap: 6px;
      align-items: stretch;
    }
    .route span {
      display: grid;
      place-items: center;
      min-height: 19mm;
      padding: 7px;
      text-align: center;
      border-radius: 14px;
      background: #f3f7fa;
      border: 1px solid #d9e3ec;
      font-weight: 700;
      font-size: 10.5pt;
    }
    .route span:first-child {
      background: #0d3b66;
      color: #fff;
      border-color: #0d3b66;
    }
    .route span:not(:last-child)::after {
      content: "→";
      position: absolute;
    }
    .mini-rule {
      margin-top: 10mm;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8mm;
    }
    .mini-rule article {
      padding: 8mm;
      border-radius: 20px;
      background: #fff8ec;
      border: 1px solid #f0d5a6;
      font-size: 11pt;
    }
    .mini-rule h3 {
      margin: 0 0 6px;
      color: #9a5b04;
      font-size: 14pt;
    }
    .lesson-page {
      padding: 10mm 11mm;
    }
    .lesson-layout {
      display: grid;
      grid-template-columns: 88mm 1fr;
      gap: 10mm;
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
      height: 157mm;
      overflow: hidden;
      border-radius: 18px;
      border: 2px solid #d3dde8;
      background: #eef2f6;
      box-shadow: 0 12px 30px rgba(11, 36, 54, .14);
    }
    .mock img {
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
      <p>別冊・結果管理だけのやさしい手順書</p>
      <h1>東京リーグ<br>結果管理 HowTo</h1>
      <p>Excelがあるとき、ないとき、結果画像で残すとき。画面モックを見ながら、どこを押せばよいかを順番に説明します。</p>
      <div class="meta">
        <span>作成日: ${escapeHtml(today)} JST</span>
        <span>対象: Tokyo League 管理画面 / 結果管理</span>
        <span>形式: 画面モック付きPDF HowTo</span>
      </div>
    </div>
    <div class="cover-card">
      <strong>この資料のゴール</strong>
      <p>「年度・大会・リーグを選ぶ」から「順位表を確認する」まで、ひとりで迷わず進めること。</p>
      <strong>合言葉</strong>
      <p>選ぶ → 入れる → 保存する → 確認する。結果管理はこの4つです。</p>
    </div>
  </section>

  <section class="page map-page">
    <h2>最初に見る地図</h2>
    <p class="map-lead">結果管理には3つの道があります。どの道を通っても、最後は「順位表を確認する」ところまで進みます。</p>
    <div class="route-grid">
      ${routes.map((route) => `<div class="route">${route.map((step) => `<span>${escapeHtml(step)}</span>`).join("")}</div>`).join("")}
    </div>
    <div class="mini-rule">
      <article>
        <h3>Excelがある</h3>
        <p>たくさんの試合をまとめて登録します。読み取り後の確認が大事です。</p>
      </article>
      <article>
        <h3>Excelがない</h3>
        <p>1試合ずつ入力します。時間はかかりますが、ゆっくり確認できます。</p>
      </article>
      <article>
        <h3>過去大会</h3>
        <p>点数を直さず、結果画像を正本として登録する場面があります。</p>
      </article>
    </div>
  </section>

  ${pages.map(pageHtml).join("")}

  <section class="page check-page">
    <h2>最後のチェックリスト</h2>
    <div class="check-grid">
      <article class="check-card">
        <h3>保存前</h3>
        <ul>
          <li>年度・大会・リーグは合っていますか。</li>
          <li>Excelや画像のファイルは正しいですか。</li>
          <li>チーム名、日付、点数、会場に変なところはありませんか。</li>
          <li>過去大会なのに、スコアを手入力しようとしていませんか。</li>
        </ul>
      </article>
      <article class="check-card">
        <h3>保存後</h3>
        <ul>
          <li>画面上部に成功メッセージは出ましたか。</li>
          <li>登録済み試合数は想定どおりですか。</li>
          <li>順位表の順位・勝点・試合数は合っていますか。</li>
          <li>公開ページに出したい内容になっていますか。</li>
        </ul>
      </article>
    </div>
    <div class="done">困ったら、あわてず「対象リーグ」まで戻って、選んだ場所から確認し直します。</div>
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
