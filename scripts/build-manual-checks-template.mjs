import fs from "node:fs";
import path from "node:path";
import { manualChecksTemplate, validateManualChecksContent } from "./delivery-manual-checks.mjs";

const generatedAt = new Date();
const options = parseArgs(process.argv.slice(2));
const outputPath =
  options.outputPath ?? path.join("docs", "output", `manual-checks-${formatJstDateForFile(generatedAt)}.md`);

if (options.checkPath) {
  checkManualChecksFile(options.checkPath);
} else {
  writeManualChecksTemplate(outputPath, options.force);
}

function writeManualChecksTemplate(filePath, force) {
  const absolutePath = path.resolve(filePath);

  if (fs.existsSync(absolutePath) && !force) {
    console.error(`[error] 既存ファイルがあります。上書きする場合は --force を指定してください: ${filePath}`);
    process.exit(1);
  }

  const report = `# 東京リーグ 本番手動確認メモ

| 項目 | 値 |
| --- | --- |
| 生成日時 | ${formatJstDateTime(generatedAt)} JST |

## 記入ルール

- 本番URL、Production env、Google OAuth、Owner/Editor操作、PDF目視確認を納品直前に確認する
- すべて確認後、状態を \`実施済み\` に変更する
- OAuth Client Secret、DB URL、Blob token、初期Owner以外の管理者メール一覧は書かない
- 最終証跡では \`npm run delivery:manual-checks -- --check ${filePath}\` と \`npm run delivery:evidence -- --final ...\` の両方で確認する

## 手動確認

${manualChecksTemplate()}
`;

  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, report, "utf8");
  console.log(`Wrote ${absolutePath}`);
}

function checkManualChecksFile(filePath) {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    console.error(`[error] 手動確認メモファイルが見つかりません: ${filePath}`);
    process.exit(1);
  }

  const errors = validateManualChecksContent(fs.readFileSync(absolutePath, "utf8"));
  console.log("Tokyo League manual checks validation");
  console.log("");

  if (errors.length > 0) {
    for (const error of errors) {
      console.log(`[error] ${error}`);
    }
    process.exit(1);
  }

  console.log("手動確認メモは最終証跡に利用できます。");
}

function parseArgs(args) {
  const parsed = {
    outputPath: undefined,
    checkPath: undefined,
    force: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--output") {
      parsed.outputPath = requiredValue(args, (index += 1), arg);
      continue;
    }

    if (arg === "--check") {
      parsed.checkPath = requiredValue(args, (index += 1), arg);
      continue;
    }

    if (arg === "--force") {
      parsed.force = true;
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
  npm run delivery:manual-checks
  npm run delivery:manual-checks -- --output docs/output/manual-checks-YYYYMMDD.md
  npm run delivery:manual-checks -- --check docs/output/manual-checks-YYYYMMDD.md

Options:
  --output <path>  手動確認メモテンプレートの出力先を指定する
  --check <path>   手動確認メモが最終証跡に利用できる状態か確認する
  --force          既存テンプレートを上書きする`);
  process.exit(code);
}

function formatJstDateForFile(date) {
  const parts = getJstParts(date);
  return `${parts.year}${parts.month}${parts.day}`;
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
