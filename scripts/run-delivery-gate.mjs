import { spawnSync } from "node:child_process";

const options = parseArgs(process.argv.slice(2));

const steps = [
  ["仕様書PDF生成", ["run", "docs:spec"]],
  ["管理者ツール説明書PDF生成", ["run", "docs:admin"]],
  ["管理者ツール説明書QA画像生成", ["run", "docs:admin:qa"]],
  ["納品物自動チェック", ["run", "docs:delivery:check"]],
  ["セキュリティ基準チェック", ["run", "security:baseline"]],
  ["秘密情報管理チェック", ["run", "security:secrets"]],
  ...(options.skipBuild ? [] : [["本番ビルド", ["run", "build"]]]),
  ...(options.skipE2e ? [] : [["E2Eテスト", ["run", "test:e2e"]]]),
];

console.log("Tokyo League delivery gate");
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

console.log("納品ゲートはすべて通過しました。");

function parseArgs(args) {
  const parsed = {
    skipBuild: false,
    skipE2e: false,
  };

  for (const arg of args) {
    if (arg === "--skip-build") {
      parsed.skipBuild = true;
      continue;
    }

    if (arg === "--skip-e2e") {
      parsed.skipE2e = true;
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

function printHelpAndExit(code = 0) {
  console.log(`Usage:
  npm run delivery:gate
  npm run delivery:gate -- --skip-build
  npm run delivery:gate -- --skip-e2e

Options:
  --skip-build  npm run build を省略する
  --skip-e2e    npm run test:e2e を省略する`);
  process.exit(code);
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}
