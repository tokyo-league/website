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
checkFile({
  label: "納品ハンドオフ",
  filePath: "docs/delivery-handoff.md",
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
checkTextDoesNotContain({
  label: "管理者マニュアルの古い順位表行追加文",
  filePath: "docs/admin-manual/output/tokyo-league-admin-manual.html",
  forbiddenText: "任意行追加は追加実装候補",
});

checkTextContains({
  label: "本番env安全確認手順",
  filePath: "docs/production-runbook.md",
  requiredText: "npm run security:prod-env -- .env.production.local --production-url https://<production-domain>",
});
checkTextContains({
  label: "本番DB/Blob疎通確認手順",
  filePath: "docs/production-runbook.md",
  requiredText: "npm run security:prod-services -- .env.production.local",
});
checkTextContains({
  label: "セキュリティ基準チェック手順",
  filePath: "docs/production-runbook.md",
  requiredText: "npm run security:baseline",
});
checkTextContains({
  label: "管理Server Action認可チェック手順",
  filePath: "docs/production-runbook.md",
  requiredText: "npm run security:admin-actions",
});
checkTextContains({
  label: "秘密情報管理チェック手順",
  filePath: "docs/production-runbook.md",
  requiredText: "npm run security:secrets",
});
checkTextContains({
  label: "依存関係供給網チェック手順",
  filePath: "docs/production-runbook.md",
  requiredText: "npm run security:supply-chain",
});
checkTextContains({
  label: "納品前証跡レポート手順",
  filePath: "docs/production-runbook.md",
  requiredText: "npm run delivery:evidence -- --final --production-url https://<production-domain> --production-env-file .env.production.local --manual-checks-file",
});
checkTextContains({
  label: "管理者説明書QA画像品質確認手順",
  filePath: "docs/production-runbook.md",
  requiredText: "npm run docs:admin:qa:check",
});
checkTextContains({
  label: "本番手動確認メモ生成手順",
  filePath: "docs/production-runbook.md",
  requiredText: "npm run delivery:manual-checks -- --output docs/output/manual-checks-YYYYMMDD.md",
});
checkTextContains({
  label: "本番手動確認メモ完了チェック手順",
  filePath: "docs/production-runbook.md",
  requiredText: "npm run delivery:manual-checks -- --check docs/output/manual-checks-YYYYMMDD.md",
});
checkTextContains({
  label: "納品前証跡final前提",
  filePath: "docs/production-runbook.md",
  requiredText: "手動確認メモ",
});
checkTextContains({
  label: "納品前証跡手動確認完了条件",
  filePath: "docs/production-runbook.md",
  requiredText: "状態が `実施済み`",
});
checkTextContains({
  label: "納品前証跡Git同期条件",
  filePath: "docs/production-runbook.md",
  requiredText: "Git upstream同期",
});
checkTextContains({
  label: "納品前証跡GitHub remote HEAD条件",
  filePath: "docs/production-runbook.md",
  requiredText: "GitHub remote HEAD一致",
});
checkTextContains({
  label: "納品パッケージManifest手順",
  filePath: "docs/production-runbook.md",
  requiredText: "npm run delivery:package",
});
checkTextContains({
  label: "納品パッケージManifest確認手順",
  filePath: "docs/production-runbook.md",
  requiredText: "npm run delivery:package -- --check",
});
checkTextContains({
  label: "本番公開導線確認手順",
  filePath: "docs/production-runbook.md",
  requiredText: "npm run public:routes -- https://<production-domain>",
});
checkTextContains({
  label: "本番管理者到達確認手順",
  filePath: "docs/production-runbook.md",
  requiredText: "npm run admin:routes -- https://<production-domain>",
});
checkTextContains({
  label: "納品ゲート手順",
  filePath: "docs/production-runbook.md",
  requiredText: "npm run delivery:gate",
});
checkTextContains({
  label: "Prismaスキーマ検証手順",
  filePath: "docs/production-runbook.md",
  requiredText: "npm run prisma:validate",
});
checkTextContains({
  label: "納品ハンドオフ: 納品ゲート",
  filePath: "docs/delivery-handoff.md",
  requiredText: "npm run delivery:gate",
});
checkTextContains({
  label: "納品ハンドオフ: 本番証跡",
  filePath: "docs/delivery-handoff.md",
  requiredText: "npm run delivery:evidence -- --final --production-url https://<production-domain> --production-env-file .env.production.local --manual-checks-file",
});
checkTextContains({
  label: "納品ハンドオフ: 本番手動確認メモ",
  filePath: "docs/delivery-handoff.md",
  requiredText: "npm run delivery:manual-checks -- --check docs/output/manual-checks-YYYYMMDD.md",
});
checkTextContains({
  label: "納品ハンドオフ: QA画像品質確認",
  filePath: "docs/delivery-handoff.md",
  requiredText: "npm run docs:admin:qa:check",
});
checkTextContains({
  label: "納品ハンドオフ: 共有注意",
  filePath: "docs/delivery-handoff.md",
  requiredText: ".env.production.local",
});
checkTextContains({
  label: "納品ハンドオフ: 本番DB/Blob疎通確認",
  filePath: "docs/delivery-handoff.md",
  requiredText: "npm run security:prod-services -- .env.production.local",
});
checkTextContains({
  label: "CSPレポートAPI手順",
  filePath: "docs/production-runbook.md",
  requiredText: "report-uri /api/security/csp-report",
});
checkTextContains({
  label: "CSPレポートAPI POST確認",
  filePath: "docs/production-runbook.md",
  requiredText: "CSPレポートAPIのPOST 204",
});
checkTextContains({
  label: "CSPレポートログ秘匿記載",
  filePath: "docs/production-runbook.md",
  requiredText: "URL query/hashと秘密値を除去・redact",
});
checkTextContains({
  label: "管理画面CSRF対策記載",
  filePath: "docs/delivery-checklist.md",
  requiredText: "管理画面CSRF対策",
});
checkTextContains({
  label: "管理画面Origin検証記載",
  filePath: "docs/data-model-and-admin-spec.md",
  requiredText: "管理画面Origin検証",
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
