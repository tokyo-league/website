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

const envFilePath = process.argv[2] ?? ".env.production.local";
const explicitEnvFile = Boolean(process.argv[2]);
const resolvedEnvFilePath = path.resolve(envFilePath);
const fileEnv = loadEnvFile(resolvedEnvFilePath, explicitEnvFile);
const env = { ...process.env, ...fileEnv };
const errors = [];
const warnings = [];

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
  if (env[key] && !isHttpsProductionUrl(env[key])) {
    warnings.push(`${key} は本番ドメインの https URL か未設定にしてください。`);
  }
}

console.log("Tokyo League production environment security check");
console.log(`Source: ${fs.existsSync(resolvedEnvFilePath) ? resolvedEnvFilePath : "process.env"}`);
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

function isHttpsProductionUrl(value) {
  try {
    const url = new URL(value);

    return url.protocol === "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1";
  } catch {
    return false;
  }
}
