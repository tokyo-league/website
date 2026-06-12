import { spawnSync } from "node:child_process";

const options = parseArgs(process.argv.slice(2));
const productionUrl = parseProductionUrl(options.productionUrl);

if (!productionUrl) {
  console.error("[error] --production-url は本番ドメインの https URL を指定してください。");
  printHelpAndExit(1);
}

if (!options.envFile) {
  console.error("[error] --production-env-file を指定してください。");
  printHelpAndExit(1);
}

const steps = [
  [
    "本番env安全確認",
    ["run", "security:prod-env", "--", options.envFile, "--production-url", productionUrl.href],
  ],
  [
    "本番DB/Blob疎通確認",
    [
      "run",
      "security:prod-services",
      "--",
      options.envFile,
      ...(options.writeProbe ? ["--write-probe"] : []),
    ],
  ],
  ["本番セキュリティヘッダー", ["run", "security:headers", "--", productionUrl.href]],
  ["本番公開サイト主要導線", ["run", "public:routes", "--", productionUrl.href]],
  ["本番管理者ツール到達確認", ["run", "admin:routes", "--", productionUrl.href]],
];

console.log("Tokyo League production readiness check");
console.log(`Production URL origin: ${productionUrl.origin}`);
console.log(`Expected Google OAuth callback: ${productionUrl.origin}/api/auth/callback/google`);
console.log(`Production env file: ${options.envFile}`);
console.log("");

for (const [label, args] of steps) {
  console.log(`==> ${label}: npm ${args.join(" ")}`);

  const result = spawnSync(npmCommand(), args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    console.log("");
    console.log(`[error] ${label} が失敗しました。`);
    process.exit(typeof result.status === "number" ? result.status : 1);
  }

  console.log("");
}

console.log("本番切替前チェックはすべて通過しました。");
console.log("値そのものは表示していません。成功ログを納品前証跡に含めてください。");

function parseArgs(args) {
  const parsed = {
    productionUrl: undefined,
    envFile: undefined,
    writeProbe: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--production-url") {
      parsed.productionUrl = requiredValue(args, (index += 1), arg);
      continue;
    }

    if (arg === "--production-env-file" || arg === "--env-file") {
      parsed.envFile = requiredValue(args, (index += 1), arg);
      continue;
    }

    if (arg === "--write-probe") {
      parsed.writeProbe = true;
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
  npm run production:readiness -- --production-url https://example.com --production-env-file .env.production.local
  npm run production:readiness -- --production-url https://example.com --production-env-file .env.production.local --write-probe

Options:
  --production-url <url>       本番デプロイURL
  --production-env-file <path> Production envをpullしたローカルファイル
  --write-probe                Blobへ小さな疎通ファイルを書き込み、すぐ削除する`);
  process.exit(code);
}

function parseProductionUrl(value) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    if (
      url.protocol !== "https:" ||
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "::1" ||
      url.hostname.includes("<") ||
      url.hostname.includes(">")
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}
