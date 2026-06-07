import fs from "node:fs";
import path from "node:path";

const checks = [];

checkFile({
  label: "仕様書PDF",
  filePath: "docs/output/tokyo-league-renewal-spec.pdf",
  minBytes: 1_000_000,
});
checkFile({
  label: "管理者ツール説明書PDF",
  filePath: "docs/admin-manual/output/tokyo-league-admin-manual.pdf",
  minBytes: 1_000_000,
});
checkFile({
  label: "本番デプロイRunbook",
  filePath: "docs/production-runbook.md",
  minBytes: 4_000,
});
checkFile({
  label: "納品チェックリスト",
  filePath: "docs/delivery-checklist.md",
  minBytes: 2_000,
});

checkQaPages({
  label: "管理者説明書QA画像",
  dirPath: "docs/admin-manual/output/qa-pages",
  expectedCount: 20,
});

checkTextDoesNotContain({
  label: "管理者マニュアルの古い制限文",
  filePath: "docs/admin-manual/output/tokyo-league-admin-manual.html",
  forbiddenText: "単体の編集・削除UIはありません",
});

checkTextContains({
  label: "本番env安全確認手順",
  filePath: "docs/production-runbook.md",
  requiredText: "npm run security:prod-env -- .env.production.local",
});
checkTextContains({
  label: "納品前証跡レポート手順",
  filePath: "docs/production-runbook.md",
  requiredText: "npm run delivery:evidence -- --production-url https://<production-domain>",
});
checkTextContains({
  label: "本番公開導線確認手順",
  filePath: "docs/production-runbook.md",
  requiredText: "npm run public:routes -- https://<production-domain>",
});

console.log("Tokyo League delivery artifact check");
console.log("");

for (const check of checks) {
  const prefix = check.ok ? "[ok]" : "[error]";
  console.log(`${prefix} ${check.label}: ${check.message}`);
}

const failed = checks.filter((check) => !check.ok);

console.log("");

if (failed.length > 0) {
  console.log(`${failed.length}件の納品物チェックが未達です。`);
  process.exit(1);
}

console.log("納品物チェックはすべて通過しました。");

function checkFile({ label, filePath, minBytes }) {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    checks.push({ ok: false, label, message: `${filePath} が見つかりません。` });
    return;
  }

  const stats = fs.statSync(absolutePath);

  if (stats.size < minBytes) {
    checks.push({
      ok: false,
      label,
      message: `${filePath} が小さすぎます (${formatBytes(stats.size)} / minimum ${formatBytes(minBytes)})。`,
    });
    return;
  }

  checks.push({ ok: true, label, message: `${filePath} (${formatBytes(stats.size)})` });
}

function checkQaPages({ label, dirPath, expectedCount }) {
  const absoluteDirPath = path.resolve(dirPath);

  if (!fs.existsSync(absoluteDirPath)) {
    checks.push({ ok: false, label, message: `${dirPath} が見つかりません。` });
    return;
  }

  const pages = fs
    .readdirSync(absoluteDirPath)
    .filter((filename) => /^page-\d+\.png$/.test(filename))
    .sort();

  if (pages.length !== expectedCount) {
    checks.push({
      ok: false,
      label,
      message: `${dirPath} は ${pages.length}ページです。期待値は ${expectedCount}ページです。`,
    });
    return;
  }

  checks.push({ ok: true, label, message: `${expectedCount}ページ生成済み` });
}

function checkTextDoesNotContain({ label, filePath, forbiddenText }) {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    checks.push({ ok: false, label, message: `${filePath} が見つかりません。` });
    return;
  }

  const content = fs.readFileSync(absolutePath, "utf8");

  if (content.includes(forbiddenText)) {
    checks.push({ ok: false, label, message: `${filePath} に古い文言が残っています。` });
    return;
  }

  checks.push({ ok: true, label, message: "古い文言なし" });
}

function checkTextContains({ label, filePath, requiredText }) {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    checks.push({ ok: false, label, message: `${filePath} が見つかりません。` });
    return;
  }

  const content = fs.readFileSync(absolutePath, "utf8");

  if (!content.includes(requiredText)) {
    checks.push({ ok: false, label, message: `${filePath} に必要な手順がありません。` });
    return;
  }

  checks.push({ ok: true, label, message: "必要手順を記載済み" });
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}
