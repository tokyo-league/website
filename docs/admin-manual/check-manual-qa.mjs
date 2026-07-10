import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { imageSize } from "image-size";

const qaDir = path.resolve("docs/admin-manual/output/qa-pages");
const expectedCount = 26;
const minWidth = 1100;
const minHeight = 760;
const maxHeight = 830;
const minNonWhiteRatio = 0.04;
const minDarkRatio = 0.005;
const minColorBuckets = 20;

const checks = [];

if (!fs.existsSync(qaDir)) {
  checks.push({ ok: false, label: "QA画像ディレクトリ", message: `${qaDir} が見つかりません。` });
} else {
  const pages = fs
    .readdirSync(qaDir)
    .filter((filename) => /^page-\d+\.png$/.test(filename))
    .sort();

  checks.push({
    ok: pages.length === expectedCount,
    label: "QA画像ページ数",
    message: `${pages.length} pages / expected ${expectedCount}`,
  });

  for (const page of pages) {
    checks.push(...checkPage(path.join(qaDir, page), page));
  }
}

console.log("Tokyo League admin manual QA image check");
console.log("");

for (const check of checks) {
  const prefix = check.ok ? "[ok]" : "[error]";
  console.log(`${prefix} ${check.label}: ${check.message}`);
}

const failed = checks.filter((check) => !check.ok);
console.log("");

if (failed.length > 0) {
  console.log(`${failed.length}件の管理者説明書QA画像チェックが未達です。`);
  process.exit(1);
}

console.log("管理者説明書QA画像チェックはすべて通過しました。");

function checkPage(filePath, pageLabel) {
  const buffer = fs.readFileSync(filePath);
  const dimensions = imageSize(buffer);
  const stats = samplePngPixels(buffer);
  const pageChecks = [];

  pageChecks.push({
    ok: dimensions.width >= minWidth && dimensions.height >= minHeight && dimensions.height <= maxHeight,
    label: `${pageLabel} 寸法`,
    message: `${dimensions.width}x${dimensions.height}`,
  });

  pageChecks.push({
    ok: stats.nonWhiteRatio >= minNonWhiteRatio,
    label: `${pageLabel} 非白紙率`,
    message: formatPercent(stats.nonWhiteRatio),
  });

  pageChecks.push({
    ok: stats.darkRatio >= minDarkRatio,
    label: `${pageLabel} 文字/濃色ピクセル`,
    message: formatPercent(stats.darkRatio),
  });

  pageChecks.push({
    ok: stats.colorBuckets >= minColorBuckets,
    label: `${pageLabel} 色バケット`,
    message: String(stats.colorBuckets),
  });

  return pageChecks;
}

function samplePngPixels(buffer) {
  const png = parsePng(buffer);
  const raw = zlib.inflateSync(Buffer.concat(png.idatChunks));
  const bytesPerPixel = png.colorType === 6 ? 4 : 3;
  const stride = png.width * bytesPerPixel;
  const rows = [];
  let offset = 0;
  let previousRow = Buffer.alloc(stride);

  for (let y = 0; y < png.height; y += 1) {
    const filterType = raw[offset];
    offset += 1;
    const row = Buffer.from(raw.subarray(offset, offset + stride));
    offset += stride;
    unfilterRow(row, previousRow, bytesPerPixel, filterType);
    rows.push(row);
    previousRow = row;
  }

  let sampled = 0;
  let nonWhite = 0;
  let dark = 0;
  const colors = new Set();

  for (let y = 0; y < png.height; y += 16) {
    const row = rows[y];

    for (let x = 0; x < png.width; x += 16) {
      const index = x * bytesPerPixel;
      const red = row[index];
      const green = row[index + 1];
      const blue = row[index + 2];
      const alpha = bytesPerPixel === 4 ? row[index + 3] : 255;

      sampled += 1;
      if (alpha > 0 && !(red > 248 && green > 248 && blue > 248)) {
        nonWhite += 1;
      }
      if (alpha > 0 && red < 120 && green < 120 && blue < 120) {
        dark += 1;
      }
      colors.add(`${Math.round(red / 16)},${Math.round(green / 16)},${Math.round(blue / 16)},${Math.round(alpha / 16)}`);
    }
  }

  return {
    nonWhiteRatio: nonWhite / sampled,
    darkRatio: dark / sampled,
    colorBuckets: colors.size,
  };
}

function parsePng(buffer) {
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") {
    throw new Error("PNG signatureが不正です。");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idatChunks = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const bitDepth = data[8];
      colorType = data[9];
      const interlace = data[12];

      if (bitDepth !== 8 || ![2, 6].includes(colorType) || interlace !== 0) {
        throw new Error("QA画像は8-bit RGB/RGBA non-interlaced PNGである必要があります。");
      }
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }

    offset += length + 12;
  }

  if (!width || !height || idatChunks.length === 0) {
    throw new Error("PNG画像データを読み取れません。");
  }

  return { width, height, colorType, idatChunks };
}

function unfilterRow(row, previousRow, bytesPerPixel, filterType) {
  for (let index = 0; index < row.length; index += 1) {
    const left = index >= bytesPerPixel ? row[index - bytesPerPixel] : 0;
    const up = previousRow[index] ?? 0;
    const upLeft = index >= bytesPerPixel ? previousRow[index - bytesPerPixel] : 0;

    if (filterType === 1) {
      row[index] = (row[index] + left) & 255;
    } else if (filterType === 2) {
      row[index] = (row[index] + up) & 255;
    } else if (filterType === 3) {
      row[index] = (row[index] + Math.floor((left + up) / 2)) & 255;
    } else if (filterType === 4) {
      row[index] = (row[index] + paethPredictor(left, up, upLeft)) & 255;
    } else if (filterType !== 0) {
      throw new Error(`未対応のPNG filter typeです: ${filterType}`);
    }
  }
}

function paethPredictor(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const distanceLeft = Math.abs(estimate - left);
  const distanceUp = Math.abs(estimate - up);
  const distanceUpLeft = Math.abs(estimate - upLeft);

  if (distanceLeft <= distanceUp && distanceLeft <= distanceUpLeft) {
    return left;
  }

  return distanceUp <= distanceUpLeft ? up : upLeft;
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}
