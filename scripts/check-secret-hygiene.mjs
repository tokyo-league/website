import { spawnSync } from "node:child_process";
import fs from "node:fs";

const checks = [];
const trackedFiles = getTrackedFiles();

checkGitignore();
checkForbiddenTrackedFiles();
checkTrackedTextForSecrets();

console.log("Tokyo League secret hygiene check");
console.log("");

for (const check of checks) {
  console.log(`${check.ok ? "[ok]" : "[error]"} ${check.label}: ${check.message}`);
}

const failed = checks.filter((check) => !check.ok);

console.log("");

if (failed.length > 0) {
  console.log(`${failed.length}件の秘密情報管理チェックが未達です。`);
  process.exit(1);
}

console.log("秘密情報管理チェックはすべて通過しました。");

function checkGitignore() {
  const content = readText(".gitignore");
  const required = [
    ".env",
    ".env.local",
    "docs/output/delivery-evidence-*.md",
    "docs/output/manual-checks-*.md",
    "docs/admin-manual/output/qa-pages/",
    "test-results",
  ];
  const missing = required.filter((entry) => !content.includes(entry));

  pushCheck({
    label: ".gitignore",
    ok: missing.length === 0,
    success: "秘密情報・生成証跡・QA出力の除外設定あり",
    failure: `不足: ${missing.join(", ") || "-"}`,
  });
}

function checkForbiddenTrackedFiles() {
  const forbidden = trackedFiles.filter((filePath) => {
    if (filePath === ".env.example") {
      return false;
    }

    return (
      /^\.env(?:\.|$)/.test(filePath) ||
      /^docs\/output\/delivery-evidence-\d{8}-\d{6}\.md$/.test(filePath) ||
      /^docs\/output\/manual-checks-.*\.md$/.test(filePath) ||
      /^docs\/admin-manual\/output\/qa-pages\//.test(filePath) ||
      /^test-results\//.test(filePath)
    );
  });

  pushCheck({
    label: "追跡禁止ファイル",
    ok: forbidden.length === 0,
    success: "追跡済みのenv/証跡/QA/test-resultsなし",
    failure: forbidden.join(", "),
  });
}

function checkTrackedTextForSecrets() {
  const findings = [];
  const patterns = [
    {
      label: "private key",
      pattern: /-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/,
    },
    {
      label: "Vercel Blob read/write token",
      pattern: /vercel_blob_rw_[A-Za-z0-9_-]{16,}/,
    },
    {
      label: "OpenAI API key",
      pattern: /sk-[A-Za-z0-9_-]{32,}/,
    },
    {
      label: "GitHub token",
      pattern: /gh[pousr]_[A-Za-z0-9_]{32,}/,
    },
    {
      label: "database URL with credentials",
      pattern: /postgres(?:ql)?:\/\/(?!USER:PASSWORD@)[^"'\s:@]+:[^"'\s:@]+@[^"'\s]+/i,
    },
  ];

  for (const filePath of trackedFiles) {
    if (!shouldScanText(filePath)) {
      continue;
    }

    const content = readText(filePath);

    for (const { label, pattern } of patterns) {
      if (pattern.test(content)) {
        findings.push(`${filePath} (${label})`);
      }
    }
  }

  pushCheck({
    label: "追跡ファイル秘密情報スキャン",
    ok: findings.length === 0,
    success: `${trackedFiles.length}件の追跡ファイルを確認`,
    failure: findings.join(", "),
  });
}

function getTrackedFiles() {
  const result = spawnSync("git", ["ls-files", "-z"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  if (result.status !== 0) {
    pushCheck({
      label: "git ls-files",
      ok: false,
      success: "",
      failure: result.stderr.trim() || "追跡ファイル一覧を取得できませんでした。",
    });
    return [];
  }

  return result.stdout.split("\0").filter(Boolean);
}

function shouldScanText(filePath) {
  if (filePath === ".env.example") {
    return true;
  }

  if (/\.(?:png|jpe?g|gif|webp|ico|pdf)$/i.test(filePath)) {
    return false;
  }

  return true;
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function pushCheck({ label, ok, success, failure }) {
  checks.push({
    label,
    ok,
    message: ok ? success : failure,
  });
}
