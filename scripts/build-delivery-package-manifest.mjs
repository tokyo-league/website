import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const generatedAt = new Date();
const options = parseArgs(process.argv.slice(2));
const outputPath =
  options.outputPath ??
  path.join("docs", "output", `delivery-package-manifest-${formatJstTimestampForFile(generatedAt)}.md`);

const deliverables = [
  {
    category: "公開サイト",
    label: "公開サイト実装",
    kind: "dir",
    filePath: "app",
    note: "App Router routes",
  },
  {
    category: "公開サイト",
    label: "共通コンポーネント",
    kind: "dir",
    filePath: "components",
    note: "public/admin shared UI",
  },
  {
    category: "公開サイト",
    label: "サイト画像素材",
    kind: "dir",
    filePath: "public/site-assets",
    note: "optimized public assets",
  },
  {
    category: "管理者ツール",
    label: "管理画面実装",
    kind: "dir",
    filePath: "app/admin",
    note: "Owner / Editor tool",
  },
  {
    category: "仕様書",
    label: "仕様書PDF",
    kind: "file",
    filePath: "docs/output/tokyo-league-renewal-spec.pdf",
    minBytes: 1_000_000,
    note: "deliverable PDF",
  },
  {
    category: "管理者説明書",
    label: "管理者ツール説明書PDF",
    kind: "file",
    filePath: "docs/admin-manual/output/tokyo-league-admin-manual.pdf",
    minBytes: 1_000_000,
    note: "deliverable PDF",
  },
  {
    category: "管理者説明書",
    label: "管理者説明書QA画像",
    kind: "qa-pages",
    filePath: "docs/admin-manual/output/qa-pages",
    expectedCount: 28,
    note: "PDF visual QA pages",
  },
  {
    category: "運用",
    label: "本番Runbook",
    kind: "file",
    filePath: "docs/production-runbook.md",
    minBytes: 4_000,
    note: "deploy and rollback",
  },
  {
    category: "運用",
    label: "納品チェックリスト",
    kind: "file",
    filePath: "docs/delivery-checklist.md",
    minBytes: 2_000,
    note: "delivery readiness",
  },
  {
    category: "運用",
    label: "納品ハンドオフ",
    kind: "file",
    filePath: "docs/delivery-handoff.md",
    minBytes: 2_000,
    note: "handoff index",
  },
  {
    category: "供給網",
    label: "依存関係定義",
    kind: "file",
    filePath: "package.json",
    note: "npm scripts and dependencies",
  },
  {
    category: "供給網",
    label: "依存関係lockfile",
    kind: "file",
    filePath: "package-lock.json",
    note: "resolved dependencies",
  },
];

const rows = [];
const errors = [];

for (const deliverable of deliverables) {
  rows.push(createDeliverableRow(deliverable, errors));
}

const gitCommit = runCommand("git", ["rev-parse", "--short", "HEAD"]);
const gitStatus = runCommand("git", ["status", "--short"]);
const report = `# 東京リーグ 納品パッケージManifest

| 項目 | 値 |
| --- | --- |
| 生成日時 | ${formatJstDateTime(generatedAt)} JST |
| Git commit | \`${gitCommit.stdout.trim() || "取得失敗"}\` |
| Git status | \`${gitStatus.stdout.trim().replaceAll(/\s*\n\s*/g, " / ") || "clean"}\` |

## 含める納品物

| 区分 | 成果物 | パス | 状態 | サイズ/件数 | SHA-256 | 備考 |
| --- | --- | --- | --- | --- | --- | --- |
${rows.join("\n")}

## 含めないもの

- \`.env.production.local\`, \`.env.local\`, OAuth Client Secret, DB URL, Blob token
- \`docs/output/manual-checks-*.md\` と \`docs/output/delivery-evidence-*.md\` に秘密情報を含めない
- 初期Owner以外の管理者メール一覧や個人情報を共有資料に含めない
`;

if (options.checkOnly) {
  console.log("Tokyo League delivery package manifest check");
  console.log("");
  for (const row of rows) {
    console.log(row);
  }
} else {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, report, "utf8");
  console.log(`Wrote ${path.resolve(outputPath)}`);
}

if (errors.length > 0) {
  console.log("");
  for (const error of errors) {
    console.log(`[error] ${error}`);
  }
  process.exit(1);
}

if (options.checkOnly) {
  console.log("");
  console.log("納品パッケージManifest確認はすべて通過しました。");
}

function createDeliverableRow(deliverable, errors) {
  const absolutePath = path.resolve(deliverable.filePath);

  if (!fs.existsSync(absolutePath)) {
    errors.push(`${deliverable.label}: ${deliverable.filePath} が見つかりません。`);
    return tableRow(deliverable, "missing", "-", "-", deliverable.note);
  }

  const stats = fs.statSync(absolutePath);

  if (deliverable.kind === "dir") {
    const count = countFiles(absolutePath);
    const status = count > 0 ? "ok" : "empty";

    if (count === 0) {
      errors.push(`${deliverable.label}: ${deliverable.filePath} にファイルがありません。`);
    }

    return tableRow(deliverable, status, `${count} files`, "-", deliverable.note);
  }

  if (deliverable.kind === "qa-pages") {
    const pages = fs.readdirSync(absolutePath).filter((filename) => /^page-\d+\.png$/.test(filename));

    if (pages.length !== deliverable.expectedCount) {
      errors.push(`${deliverable.label}: ${pages.length}ページです。期待値は ${deliverable.expectedCount}ページです。`);
    }

    return tableRow(deliverable, pages.length === deliverable.expectedCount ? "ok" : "invalid", `${pages.length} pages`, "-", deliverable.note);
  }

  if (deliverable.minBytes && stats.size < deliverable.minBytes) {
    errors.push(`${deliverable.label}: ${deliverable.filePath} が小さすぎます。`);
  }

  return tableRow(
    deliverable,
    deliverable.minBytes && stats.size < deliverable.minBytes ? "too small" : "ok",
    formatBytes(stats.size),
    sha256File(absolutePath),
    deliverable.note,
  );
}

function tableRow(deliverable, status, sizeOrCount, sha256, note) {
  return `| ${deliverable.category} | ${deliverable.label} | \`${deliverable.filePath}\` | ${status} | ${sizeOrCount} | ${sha256} | ${note} |`;
}

function countFiles(dirPath) {
  let count = 0;

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (entry.name === ".DS_Store") {
      continue;
    }

    const entryPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      count += countFiles(entryPath);
    } else if (entry.isFile()) {
      count += 1;
    }
  }

  return count;
}

function sha256File(filePath) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function parseArgs(args) {
  const parsed = {
    checkOnly: false,
    outputPath: undefined,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--check") {
      parsed.checkOnly = true;
      continue;
    }

    if (arg === "--output") {
      parsed.outputPath = requiredValue(args, (index += 1), arg);
      continue;
    }

    if (arg === "--help") {
      printHelpAndExit();
    }

    console.error(`[error] 未対応のオプションです: ${arg}`);
    printHelpAndExit(1);
  }

  return parsed;
}

function requiredValue(args, index, optionName) {
  const value = args[index];
  if (!value || value.startsWith("--")) {
    console.error(`[error] ${optionName} の値を指定してください。`);
    printHelpAndExit(1);
  }
  return value;
}

function printHelpAndExit(code = 0) {
  console.log(`Usage:
  npm run delivery:package
  npm run delivery:package -- --check
  npm run delivery:package -- --output docs/output/delivery-package-manifest-YYYYMMDD.md

Options:
  --check          Manifestを出力せず、納品パッケージの必須項目だけ確認する
  --output <path>  出力先Markdownを指定する`);
  process.exit(code);
}

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  return {
    status: typeof result.status === "number" ? result.status : 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? (result.error ? String(result.error) : ""),
  };
}

function formatJstTimestampForFile(date) {
  const parts = getJstParts(date);
  return `${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}${parts.second}`;
}

function formatJstDateTime(date) {
  const parts = getJstParts(date);
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

function getJstParts(date) {
  const formatter = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}
