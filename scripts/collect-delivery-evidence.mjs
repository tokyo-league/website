import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const manualCheckItems = [
  "本番公開サイト主要導線",
  "本番管理者ログイン",
  "Owner操作",
  "Editor操作",
  "Google OAuthリダイレクトURI",
  "初期Owner",
  "PDF目視確認",
  "Runbook共有",
];

const options = parseArgs(process.argv.slice(2));
assertFinalEvidenceOptions(options);
const generatedAt = new Date();
const outputPath =
  options.outputPath ??
  path.join("docs", "output", `delivery-evidence-${formatJstTimestampForFile(generatedAt)}.md`);

const sections = [];
const commandResults = [];
const manualChecksContent = loadManualChecksContent(options.manualChecksFile);

const gitCommit = runCommand("git", ["rev-parse", "--short", "HEAD"], { collectOnly: true });
const gitStatus = runCommand("git", ["status", "--short"], { collectOnly: true });
const gitUpstream = getGitUpstream();
const gitUpstreamSync = getGitUpstreamSync(gitUpstream);

sections.push(`## 基本情報

| 項目 | 値 |
| --- | --- |
| 生成日時 | ${formatJstDateTime(generatedAt)} JST |
| Git commit | ${inlineValue(gitCommit.stdout.trim() || "取得失敗")} |
| Git status | ${inlineValue(gitStatus.stdout.trim() || "clean")} |
| Git upstream | ${inlineValue(gitUpstream.name ?? "未設定")} |
| Git upstream sync | ${inlineValue(gitUpstreamSync.summary)} |
| Production URL | ${inlineValue(options.productionUrl ?? "未指定")} |
| Production env file | ${inlineValue(options.envFile ?? "未指定")} |
| Final evidence mode | ${inlineValue(options.final ? "enabled" : "disabled")} |`);

sections.push(`## 納品物

| 納品物 | パス | 状態 |
| --- | --- | --- |
${artifactRows().join("\n")}`);

runAndCollect("納品物自動チェック", npmArgs("run", "docs:delivery:check"));
runAndCollect("Prismaスキーマ検証", npmArgs("run", "prisma:validate"));
runAndCollect("セキュリティ基準チェック", npmArgs("run", "security:baseline"));
runAndCollect("管理Server Action認可チェック", npmArgs("run", "security:admin-actions"));
runAndCollect("秘密情報管理チェック", npmArgs("run", "security:secrets"));
runAndCollect("依存関係供給網チェック", npmArgs("run", "security:supply-chain"));

if (options.includeBuild) {
  runAndCollect("本番ビルド", npmArgs("run", "build"));
}

if (options.includeE2e) {
  runAndCollect("E2Eテスト", npmArgs("run", "test:e2e"));
}

if (options.productionUrl) {
  if (!options.skipPublicRoutes) {
    runAndCollect("本番公開サイト主要導線", npmArgs("run", "public:routes", "--", options.productionUrl));
  } else {
    sections.push(skippedSection("本番公開サイト主要導線", "一時検証オプション --skip-public-routes により省略しました。納品前証跡では省略しないでください。"));
  }

  if (!options.skipAdminRoutes) {
    runAndCollect("本番管理者ツール到達確認", npmArgs("run", "admin:routes", "--", options.productionUrl));
  } else {
    sections.push(skippedSection("本番管理者ツール到達確認", "一時検証オプション --skip-admin-routes により省略しました。納品前証跡では省略しないでください。"));
  }

  runAndCollect("本番セキュリティヘッダー", npmArgs("run", "security:headers", "--", options.productionUrl));
} else {
  sections.push(`## 本番公開サイト主要導線

未実行です。本番URL確定後に以下で証跡を保存します。

\`\`\`bash
npm run delivery:evidence -- --production-url https://<production-domain>
\`\`\`

最終納品証跡では以下を使い、本番URL、Production env、build、E2E、公開/管理導線を必須確認します。

\`\`\`bash
npm run delivery:evidence -- --final --production-url https://<production-domain> --production-env-file .env.production.local --manual-checks-file docs/output/manual-checks-YYYYMMDD.md --include-build --include-e2e
\`\`\``);

  sections.push(`## 本番セキュリティヘッダー

未実行です。本番URL確定後に以下で証跡を保存します。

\`\`\`bash
npm run delivery:evidence -- --production-url https://<production-domain>
\`\`\`

最終納品証跡では以下を使い、本番URL、Production env、build、E2E、公開/管理導線を必須確認します。

\`\`\`bash
npm run delivery:evidence -- --final --production-url https://<production-domain> --production-env-file .env.production.local --manual-checks-file docs/output/manual-checks-YYYYMMDD.md --include-build --include-e2e
\`\`\``);

  sections.push(`## 本番管理者ツール到達確認

未実行です。本番URL確定後に以下で証跡を保存します。

\`\`\`bash
npm run delivery:evidence -- --production-url https://<production-domain>
\`\`\`

最終納品証跡では以下を使い、本番URL、Production env、build、E2E、公開/管理導線を必須確認します。

\`\`\`bash
npm run delivery:evidence -- --final --production-url https://<production-domain> --production-env-file .env.production.local --manual-checks-file docs/output/manual-checks-YYYYMMDD.md --include-build --include-e2e
\`\`\``);
}

if (options.envFile) {
  const productionEnvArgs = options.productionUrl
    ? npmArgs("run", "security:prod-env", "--", options.envFile, "--production-url", options.productionUrl)
    : npmArgs("run", "security:prod-env", "--", options.envFile);

  runAndCollect("本番env安全確認", productionEnvArgs);
} else {
  sections.push(`## 本番env安全確認

未実行です。Vercel Production環境変数をpull後に以下で証跡を保存します。

\`\`\`bash
npm run delivery:evidence -- --production-env-file .env.production.local
\`\`\`

最終納品証跡では以下を使い、本番URL、Production env、build、E2E、公開/管理導線を必須確認します。

\`\`\`bash
npm run delivery:evidence -- --final --production-url https://<production-domain> --production-env-file .env.production.local --manual-checks-file docs/output/manual-checks-YYYYMMDD.md --include-build --include-e2e
\`\`\``);
}

sections.push(`## 手動確認チェック

${manualChecksContent ?? manualChecksTemplate()}`);

if (commandResults.length > 0) {
  sections.push(`## コマンド結果

${commandResults.join("\n\n")}`);
}

const report = `# 東京リーグ 納品前証跡

${sections.join("\n\n")}
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, report, "utf8");

const failed = commandResults.some((section) => section.includes("status: failed"));

console.log(`Wrote ${path.resolve(outputPath)}`);

if (failed) {
  process.exit(1);
}

function parseArgs(args) {
  const parsed = {
    productionUrl: undefined,
    envFile: undefined,
    manualChecksFile: undefined,
    outputPath: undefined,
    includeBuild: false,
    includeE2e: false,
    final: false,
    skipPublicRoutes: false,
    skipAdminRoutes: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--production-url") {
      parsed.productionUrl = requiredValue(args, (index += 1), arg);
      continue;
    }

    if (arg === "--env-file" || arg === "--production-env-file") {
      parsed.envFile = requiredValue(args, (index += 1), arg);
      continue;
    }

    if (arg === "--output") {
      parsed.outputPath = requiredValue(args, (index += 1), arg);
      continue;
    }

    if (arg === "--manual-checks-file") {
      parsed.manualChecksFile = requiredValue(args, (index += 1), arg);
      continue;
    }

    if (arg === "--include-build") {
      parsed.includeBuild = true;
      continue;
    }

    if (arg === "--include-e2e") {
      parsed.includeE2e = true;
      continue;
    }

    if (arg === "--final") {
      parsed.final = true;
      continue;
    }

    if (arg === "--skip-public-routes") {
      parsed.skipPublicRoutes = true;
      continue;
    }

    if (arg === "--skip-admin-routes") {
      parsed.skipAdminRoutes = true;
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

function assertFinalEvidenceOptions(options) {
  if (!options.final) {
    return;
  }

  const missing = [];

  if (!options.productionUrl) missing.push("--production-url");
  if (!options.envFile) missing.push("--production-env-file");
  if (!options.manualChecksFile) missing.push("--manual-checks-file");
  if (!options.includeBuild) missing.push("--include-build");
  if (!options.includeE2e) missing.push("--include-e2e");
  if (options.skipPublicRoutes) missing.push("remove --skip-public-routes");
  if (options.skipAdminRoutes) missing.push("remove --skip-admin-routes");

  if (missing.length > 0) {
    console.error(`[error] --final では次の条件が必須です: ${missing.join(", ")}`);
    printHelpAndExit(1);
  }

  const errors = [];
  const productionUrl = parseFinalProductionUrl(options.productionUrl);

  if (!productionUrl) {
    errors.push("--production-url は有効なURLを指定してください。");
  } else if (productionUrl.protocol !== "https:") {
    errors.push("--production-url は https URL を指定してください。");
  } else if (["localhost", "127.0.0.1", "::1"].includes(productionUrl.hostname)) {
    errors.push("--production-url はlocalhostではなく本番ドメインを指定してください。");
  } else if (productionUrl.hostname.includes("<") || productionUrl.hostname.includes(">")) {
    errors.push("--production-url のプレースホルダーを本番ドメインに置き換えてください。");
  }

  if (!fs.existsSync(path.resolve(options.envFile))) {
    errors.push(`--production-env-file が見つかりません: ${options.envFile}`);
  }

  validateFinalManualChecksFile(options.manualChecksFile, errors);

  validateFinalGitState(errors);

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`[error] ${error}`);
    }
    process.exit(1);
  }
}

function validateFinalGitState(errors) {
  const gitStatus = runCommand("git", ["status", "--short"], { collectOnly: true });
  if (gitStatus.status !== 0) {
    errors.push("git status を確認できませんでした。");
  } else if (gitStatus.stdout.trim()) {
    errors.push("--final はclean worktreeで実行してください。未コミット差分があります。");
  }

  const upstream = getGitUpstream();
  if (!upstream.name) {
    errors.push("--final はGit upstreamが設定されたブランチで実行してください。");
    return;
  }

  const sync = getGitUpstreamSync(upstream);

  if (!sync.ok) {
    errors.push(`--final はGit upstreamと同期した状態で実行してください。${sync.summary}`);
  }
}

function validateFinalManualChecksFile(filePath, errors) {
  if (!filePath) {
    return;
  }

  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    errors.push(`--manual-checks-file が見つかりません: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(absolutePath, "utf8").trim();
  if (content.length < 160) {
    errors.push("--manual-checks-file の内容が短すぎます。各手動確認の結果を記録してください。");
  }

  const missingItems = manualCheckItems.filter((item) => !content.includes(item));
  if (missingItems.length > 0) {
    errors.push(`--manual-checks-file に手動確認項目が不足しています: ${missingItems.join(", ")}`);
  }

  const manualRows = parseManualCheckRows(content);
  const incompleteItems = manualCheckItems.filter((item) => manualRows.get(item) !== "実施済み");

  if (incompleteItems.length > 0) {
    errors.push(`--manual-checks-file の状態は必ず「実施済み」にしてください: ${incompleteItems.join(", ")}`);
  }

  if (/(未記入|未実行|TODO|TBD)/i.test(content)) {
    errors.push("--manual-checks-file に未記入/未実行/TODOが残っています。");
  }
}

function parseManualCheckRows(content) {
  const rows = new Map();

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line.startsWith("|") || !line.endsWith("|")) {
      continue;
    }

    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());

    if (cells.length < 2 || cells[0] === "項目" || /^:?-+:?$/.test(cells[0])) {
      continue;
    }

    rows.set(stripInlineMarkdown(cells[0]), stripInlineMarkdown(cells[1]));
  }

  return rows;
}

function stripInlineMarkdown(value) {
  return value.replaceAll("`", "").trim();
}

function loadManualChecksContent(filePath) {
  if (!filePath) {
    return null;
  }

  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    return `手動確認メモファイルが見つかりません: \`${filePath}\``;
  }

  return fs.readFileSync(absolutePath, "utf8").trim();
}

function parseFinalProductionUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function getGitUpstream() {
  const result = runCommand("git", ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], {
    collectOnly: true,
  });
  const name = result.status === 0 ? result.stdout.trim() : "";

  return {
    name: name || null,
  };
}

function getGitUpstreamSync(upstream) {
  if (!upstream.name) {
    return {
      ok: false,
      summary: "upstream未設定",
    };
  }

  const result = runCommand("git", ["rev-list", "--left-right", "--count", `HEAD...${upstream.name}`], {
    collectOnly: true,
  });

  if (result.status !== 0) {
    return {
      ok: false,
      summary: "upstream同期状態を確認できません",
    };
  }

  const [aheadText, behindText] = result.stdout.trim().split(/\s+/);
  const ahead = Number.parseInt(aheadText ?? "0", 10);
  const behind = Number.parseInt(behindText ?? "0", 10);

  if (ahead === 0 && behind === 0) {
    return {
      ok: true,
      summary: "synced",
    };
  }

  return {
    ok: false,
    summary: `ahead ${Number.isNaN(ahead) ? "?" : ahead}, behind ${Number.isNaN(behind) ? "?" : behind}`,
  };
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
  npm run delivery:evidence
  npm run delivery:evidence -- --production-url https://example.com --production-env-file .env.production.local
  npm run delivery:evidence -- --include-build --include-e2e
  npm run delivery:evidence -- --final --production-url https://example.com --production-env-file .env.production.local --manual-checks-file docs/output/manual-checks-YYYYMMDD.md --include-build --include-e2e

Options:
  --production-url <url>  本番URLのセキュリティヘッダーを確認する
  --production-env-file <path>
                          本番envファイルを値非表示で確認する
  --manual-checks-file <path>
                          本番ログイン、Owner/Editor操作、PDF目視などの手動確認メモを取り込む
  --include-build         npm run build の結果も保存する
  --include-e2e           npm run test:e2e の結果も保存する
  --final                 最終納品証跡としてclean worktree、Git upstream同期、https本番URL、env、build、E2E、公開・管理導線を必須化する
  --skip-public-routes    production-url指定時に公開導線チェックを省略する
  --skip-admin-routes     production-url指定時に管理者到達チェックを省略する
  --output <path>         出力先Markdownを指定する`);
  process.exit(code);
}

function manualChecksTemplate() {
  return `| 項目 | 状態 | メモ |
| --- | --- | --- |
| 本番公開サイト主要導線 | 未記入 | /, /competitions, /news, /teams, /downloads, /contact |
| 本番管理者ログイン | 未記入 | 登録済みOwnerメールでGoogleログイン |
| Owner操作 | 未記入 | ニュース、チーム、資料、担当割当、更新履歴 |
| Editor操作 | 未記入 | 割当済みリーグの結果管理 |
| Google OAuthリダイレクトURI | 未記入 | 本番ドメインのみ許可 |
| 初期Owner | 未記入 | メールアドレスを関係者へ共有。値は必要最小限 |
| PDF目視確認 | 未記入 | ページ欠け、画像欠け、文字切れ |
| Runbook共有 | 未記入 | 関係者へ共有 |`;
}

function artifactRows() {
  return [
    artifactRow("仕様書PDF", "docs/output/tokyo-league-renewal-spec.pdf"),
    artifactRow("管理者ツール説明書PDF", "docs/admin-manual/output/tokyo-league-admin-manual.pdf"),
    artifactRow("管理者説明書QA画像", "docs/admin-manual/output/qa-pages", qaPageSummary),
    artifactRow("本番Runbook", "docs/production-runbook.md"),
    artifactRow("納品チェックリスト", "docs/delivery-checklist.md"),
  ];
}

function artifactRow(label, filePath, summaryFn = fileSummary) {
  return `| ${label} | \`${filePath}\` | ${summaryFn(filePath)} |`;
}

function fileSummary(filePath) {
  if (!fs.existsSync(filePath)) {
    return "未生成";
  }

  const stats = fs.statSync(filePath);
  return `${formatBytes(stats.size)} / 更新 ${formatJstDateTime(stats.mtime)} JST`;
}

function qaPageSummary(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return "未生成";
  }

  const pages = fs.readdirSync(dirPath).filter((filename) => /^page-\d+\.png$/.test(filename));
  return `${pages.length}ページ`;
}

function runAndCollect(label, args) {
  const result = runCommand(args[0], args.slice(1));
  const status = result.status === 0 ? "passed" : "failed";
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();

  commandResults.push(`### ${label}

- command: \`${args.join(" ")}\`
- status: ${status}

\`\`\`text
${output || "(no output)"}
\`\`\``);
}

function runCommand(command, args, { collectOnly = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: process.env,
  });

  const normalized = {
    status: typeof result.status === "number" ? result.status : 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? (result.error ? String(result.error) : ""),
  };

  if (!collectOnly) {
    const prefix = normalized.status === 0 ? "[ok]" : "[error]";
    console.log(`${prefix} ${command} ${args.join(" ")}`);
  }

  return normalized;
}

function npmArgs(...args) {
  return [process.platform === "win32" ? "npm.cmd" : "npm", ...args];
}

function skippedSection(label, message) {
  return `## ${label}

${message}`;
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

function inlineValue(value) {
  return `\`${String(value).replaceAll("`", "'").replaceAll(/\s*\n\s*/g, " / ")}\``;
}
