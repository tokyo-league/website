import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const sourceRoot = path.resolve("downloads/tokyo-league-images");
const manifestPath = path.join(sourceRoot, "manifest.json");
const publicRoot = path.resolve("public/site-assets");

const sizeSuffixPattern = /-(\d+)x(\d+)$/;
const resultsPattern =
  /(A|B|C|D|E|F|G|H)(リーグ|グループ)|[Ａ-Ｈ][リーグｸﾞループ]|山藤杯|最終|第\d+回|プレゼンテーション/i;
const logoPattern = /(logo|ロゴ|エンブレム|emblem)/i;

function decodeFileName(filePath) {
  return decodeURIComponent(path.basename(filePath));
}

function fileNameWithoutExtension(filePath) {
  return path.parse(decodeFileName(filePath)).name;
}

function normalizeBaseName(filePath) {
  return fileNameWithoutExtension(filePath).replace(sizeSuffixPattern, "");
}

function isSizedVariant(filePath) {
  return sizeSuffixPattern.test(fileNameWithoutExtension(filePath));
}

function scoreForChoice(filePath) {
  const decoded = decodeFileName(filePath);
  let score = 0;

  if (!isSizedVariant(filePath)) {
    score += 1000;
  }

  if (/^\d+[上下]段_/.test(decoded)) {
    score += 40;
  }

  if (logoPattern.test(decoded)) {
    score += 20;
  }

  return score + decoded.length;
}

function destinationGroup(filePath) {
  const relative = filePath.replace(/^downloads\/tokyo-league-images\//, "");
  const decoded = decodeFileName(relative);

  if (relative.includes("/assets/img/common/")) {
    return "common";
  }

  if (relative.includes("/assets/img/mv/")) {
    return "mv";
  }

  if (relative.includes("/plugins/")) {
    return "misc";
  }

  if (resultsPattern.test(decoded)) {
    return "results";
  }

  if (logoPattern.test(decoded)) {
    return "teams/logos";
  }

  return "teams/photos";
}

function safeTargetName(filePath) {
  const parsed = path.parse(decodeFileName(filePath));
  return `${normalizeBaseName(filePath)}${parsed.ext.toLowerCase()}`;
}

async function main() {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const filesByKey = new Map();

  for (const entry of manifest.files) {
    const relative = entry.path.replace(/^downloads\/tokyo-league-images\//, "");
    const key = `${destinationGroup(entry.path)}::${normalizeBaseName(relative)}`;
    const bucket = filesByKey.get(key) ?? [];
    bucket.push(relative);
    filesByKey.set(key, bucket);
  }

  await rm(publicRoot, { recursive: true, force: true });

  const organized = [];

  for (const [key, files] of filesByKey.entries()) {
    const [group] = key.split("::");
    const chosen = [...files].sort((a, b) => scoreForChoice(b) - scoreForChoice(a))[0];
    const destination = path.join(publicRoot, group, safeTargetName(chosen));

    await mkdir(path.dirname(destination), { recursive: true });
    await cp(path.join(sourceRoot, chosen), destination);

    organized.push({
      source: chosen,
      output: path.relative(process.cwd(), destination),
      group,
      variants: files.sort(),
    });
  }

  organized.sort((a, b) => a.output.localeCompare(b.output, "ja"));

  await writeFile(
    path.join(publicRoot, "manifest.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sourceManifest: path.relative(process.cwd(), manifestPath),
        assetCount: organized.length,
        files: organized,
      },
      null,
      2,
    ),
  );

  const counts = organized.reduce((acc, item) => {
    acc[item.group] = (acc[item.group] ?? 0) + 1;
    return acc;
  }, {});

  console.log(JSON.stringify({ assetCount: organized.length, counts }, null, 2));
}

await main();
