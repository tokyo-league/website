import fs from "node:fs";
import path from "node:path";

const requiredEnv = [
  "AUTH_SECRET",
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "DATABASE_URL",
  "DIRECT_URL",
  "BLOB_READ_WRITE_TOKEN",
];

const options = parseArgs(process.argv.slice(2));
const envFilePath = options.envFilePath ?? ".env.production.local";
const explicitEnvFile = Boolean(options.envFilePath);
const resolvedEnvFilePath = path.resolve(envFilePath);
const fileEnv = loadEnvFile(resolvedEnvFilePath, explicitEnvFile);
const env = { ...process.env, ...fileEnv };
const productionUrl = options.productionUrl ? parseProductionUrl(options.productionUrl) : null;
const errors = [];
const warnings = [];

if (options.productionUrl && !productionUrl) {
  errors.push("--production-url は本番ドメインの https URL を指定してください。");
}

for (const key of requiredEnv) {
  if (!env[key]) {
    errors.push(`${key} が未設定です。`);
  }
}

if (env.E2E_TEST_MODE) {
  errors.push("E2E_TEST_MODE は本番環境に設定しないでください。");
}

if (env.AUTH_SECRET && env.AUTH_SECRET.length < 32) {
  errors.push("AUTH_SECRET は32文字以上のランダム文字列にしてください。");
}

if (env.AUTH_GOOGLE_ID && !env.AUTH_GOOGLE_ID.endsWith(".apps.googleusercontent.com")) {
  errors.push("AUTH_GOOGLE_ID は Google OAuth Client ID の形式を確認してください。");
}

if (env.AUTH_GOOGLE_SECRET && env.AUTH_GOOGLE_SECRET.length < 16) {
  errors.push("AUTH_GOOGLE_SECRET が短すぎます。Google OAuth Client Secret を確認してください。");
}

if (env.DATABASE_URL && !isPostgresUrl(env.DATABASE_URL)) {
  errors.push("DATABASE_URL は postgres/postgresql URL を設定してください。");
}

if (env.DIRECT_URL && !isPostgresUrl(env.DIRECT_URL)) {
  errors.push("DIRECT_URL は postgres/postgresql URL を設定してください。");
}

if (env.BLOB_READ_WRITE_TOKEN && !env.BLOB_READ_WRITE_TOKEN.startsWith("vercel_blob_rw_")) {
  errors.push("BLOB_READ_WRITE_TOKEN は Vercel Blob の read/write token を設定してください。");
}

if (env.DATABASE_URL && env.DIRECT_URL && env.DATABASE_URL === env.DIRECT_URL) {
  warnings.push("DATABASE_URL と DIRECT_URL が同一です。Neonのpooled/direct接続を分けているか確認してください。");
}

for (const key of ["AUTH_URL", "NEXTAUTH_URL"]) {
  if (!env[key]) {
    continue;
  }

  const authUrl = parseProductionUrl(env[key]);

  if (!authUrl) {
    errors.push(`${key} は本番ドメインの https URL か未設定にしてください。`);
    continue;
  }

  if (productionUrl && authUrl.origin !== productionUrl.origin) {
    errors.push(`${key} は --production-url と同じoriginにしてください。`);
  }
}

console.log("Tokyo League production environment security check");
console.log(`Source: ${fs.existsSync(resolvedEnvFilePath) ? resolvedEnvFilePath : "process.env"}`);
if (productionUrl) {
  console.log(`Production URL origin: ${productionUrl.origin}`);
  console.log(`Expected Google OAuth callback: ${productionUrl.origin}/api/auth/callback/google`);
}
console.log("");

if (errors.length === 0) {
  console.log("[ok] 必須環境変数と主要な形式チェックは通過しました。");
} else {
  for (const error of errors) {
    console.log(`[error] ${error}`);
  }
}

for (const warning of warnings) {
  console.log(`[warn] ${warning}`);
}

console.log("");
console.log("値そのものは表示していません。チェック結果だけを納品前証跡として共有してください。");

if (errors.length > 0) {
  process.exit(1);
}

function parseArgs(args) {
  const parsed = {
    envFilePath: undefined,
    productionUrl: undefined,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--production-url") {
      parsed.productionUrl = requiredValue(args, (index += 1), arg);
      continue;
    }

    if (arg === "--help") {
      printHelpAndExit();
    }

    if (arg.startsWith("--")) {
      console.log(`[error] 未対応のオプションです: ${arg}`);
      printHelpAndExit(1);
    }

    if (parsed.envFilePath) {
      console.log(`[error] envファイルは1つだけ指定してください: ${arg}`);
      printHelpAndExit(1);
    }

    parsed.envFilePath = arg;
  }

  return parsed;
}

function requiredValue(args, index, optionName) {
  const value = args[index];
  if (!value || value.startsWith("--")) {
    console.log(`[error] ${optionName} の値を指定してください。`);
    printHelpAndExit(1);
  }
  return value;
}

function printHelpAndExit(code = 0) {
  console.log(`Usage:
  npm run security:prod-env
  npm run security:prod-env -- .env.production.local
  npm run security:prod-env -- .env.production.local --production-url https://example.com

Options:
  --production-url <url>  AUTH_URL / NEXTAUTH_URL が設定されている場合に本番URL origin と一致するか確認する`);
  process.exit(code);
}

function loadEnvFile(filePath, required) {
  if (!fs.existsSync(filePath)) {
    if (required) {
      console.log(`[error] ${filePath} が見つかりません。`);
      process.exit(1);
    }

    return {};
  }

  const content = fs.readFileSync(filePath, "utf8");
  const parsed = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);

    if (!match) {
      continue;
    }

    parsed[match[1]] = stripQuotes(match[2].trim());
  }

  return parsed;
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function isPostgresUrl(value) {
  try {
    const url = new URL(value);

    return url.protocol === "postgres:" || url.protocol === "postgresql:";
  } catch {
    return false;
  }
}

function parseProductionUrl(value) {
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
