import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const inputPath = path.resolve("docs/data-model-and-admin-spec.md");
const outputDir = path.resolve("docs/output");
const htmlPath = path.join(outputDir, "tokyo-league-renewal-spec.html");
const pdfPath = path.join(outputDir, "tokyo-league-renewal-spec.pdf");

const markdown = await fs.readFile(inputPath, "utf8");
const html = renderDocument(markdown);

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(htmlPath, html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1240, height: 1754 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });
await page.pdf({
  path: pdfPath,
  format: "A4",
  printBackground: true,
  margin: {
    top: "14mm",
    right: "12mm",
    bottom: "14mm",
    left: "12mm",
  },
});
await browser.close();

console.log(`Wrote ${pdfPath}`);

function renderDocument(source) {
  const body = renderMarkdown(source);

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>東京リーグ リニューアル仕様書</title>
  <style>
    :root {
      color: #172033;
      background: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", "YuGothic", "Noto Sans JP", sans-serif;
      line-height: 1.72;
    }
    body {
      margin: 0;
      background: #ffffff;
    }
    main {
      box-sizing: border-box;
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 18mm 16mm;
      background: #ffffff;
    }
    h1 {
      margin: 0 0 8mm;
      padding-bottom: 5mm;
      border-bottom: 2px solid #d72027;
      color: #111827;
      font-size: 28px;
      line-height: 1.35;
      letter-spacing: 0;
    }
    h2 {
      break-after: avoid;
      margin: 12mm 0 4mm;
      padding: 2.5mm 3mm;
      border-left: 4px solid #d72027;
      background: #f7f8fa;
      color: #111827;
      font-size: 19px;
      line-height: 1.45;
      letter-spacing: 0;
    }
    h3 {
      break-after: avoid;
      margin: 8mm 0 3mm;
      color: #25324a;
      font-size: 15px;
      line-height: 1.5;
      letter-spacing: 0;
    }
    p {
      margin: 0 0 3mm;
      font-size: 10.5px;
    }
    ul,
    ol {
      margin: 0 0 4mm 5mm;
      padding: 0;
    }
    li {
      margin: 0 0 1.5mm;
      padding-left: 1mm;
      font-size: 10.2px;
    }
    table {
      width: 100%;
      margin: 3mm 0 6mm;
      border-collapse: collapse;
      break-inside: avoid;
      font-size: 9px;
    }
    th,
    td {
      border: 1px solid #d9dee8;
      padding: 2mm;
      vertical-align: top;
    }
    th {
      background: #eef1f5;
      color: #182235;
      font-weight: 700;
    }
    code {
      padding: 0.2mm 1mm;
      border-radius: 3px;
      background: #f0f2f5;
      color: #8a1f28;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      font-size: 0.92em;
    }
    hr {
      border: 0;
      border-top: 1px solid #e5e7eb;
      margin: 8mm 0;
    }
    @page {
      size: A4;
    }
    @media print {
      html,
      body {
        background: #ffffff;
      }
      main {
        width: auto;
        min-height: auto;
        margin: 0;
        padding: 0;
        background: #ffffff;
      }
    }
  </style>
</head>
<body>
  <main>${body}</main>
</body>
</html>`;
}

function renderMarkdown(source) {
  const lines = source.split(/\r?\n/);
  const blocks = [];

  for (let index = 0; index < lines.length; ) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      blocks.push(`<h${heading[1].length}>${renderInline(heading[2])}</h${heading[1].length}>`);
      index += 1;
      continue;
    }

    if (isTableStart(lines, index)) {
      const tableLines = [];
      while (index < lines.length && lines[index].includes("|")) {
        tableLines.push(lines[index]);
        index += 1;
      }
      blocks.push(renderTable(tableLines));
      continue;
    }

    if (/^-\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^-\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^-\s+/, ""));
        index += 1;
      }
      blocks.push(`<ul>${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\d+\.\s+/, ""));
        index += 1;
      }
      blocks.push(`<ol>${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ol>`);
      continue;
    }

    const paragraph = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,3})\s+/.test(lines[index]) &&
      !/^-\s+/.test(lines[index]) &&
      !/^\d+\.\s+/.test(lines[index]) &&
      !isTableStart(lines, index)
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
  }

  return blocks.join("\n");
}

function isTableStart(lines, index) {
  return (
    index + 1 < lines.length &&
    lines[index].includes("|") &&
    /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1])
  );
}

function renderTable(lines) {
  const rows = lines
    .filter((line, index) => index !== 1)
    .map((line) =>
      line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => renderInline(cell.trim())),
    );

  const [header, ...body] = rows;
  return `<table><thead><tr>${header.map((cell) => `<th>${cell}</th>`).join("")}</tr></thead><tbody>${body
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
}

function renderInline(value) {
  return escapeHtml(value).replace(/`([^`]+)`/g, "<code>$1</code>");
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
