import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { del, list, put } from "@vercel/blob";

const options = parseArgs(process.argv.slice(2));
const envFilePath = options.envFilePath ?? ".env.production.local";
const resolvedEnvFilePath = path.resolve(envFilePath);
const fileEnv = loadEnvFile(resolvedEnvFilePath, Boolean(options.envFilePath));
const env = { ...process.env, ...fileEnv };
const checks = [];

for (const [key, value] of Object.entries(fileEnv)) {
  process.env[key] = value;
}

await checkDatabase();
await checkBlob();

console.log("Tokyo League production data services check");
console.log(`Source: ${fs.existsSync(resolvedEnvFilePath) ? resolvedEnvFilePath : "process.env"}`);
console.log("");

for (const check of checks) {
  const prefix = check.ok ? "[ok]" : "[error]";
  console.log(`${prefix} ${check.label}: ${check.message}`);
}

console.log("");
console.log("接続文字列、トークン、Blob URL、メールアドレスなどの値は表示していません。");

if (checks.some((check) => !check.ok)) {
  process.exit(1);
}

async function checkDatabase() {
  if (options.skipDb) {
    checks.push({ ok: true, label: "Neon DB", message: "--skip-db により省略" });
    return;
  }

  const missing = ["DATABASE_URL", "DIRECT_URL"].filter((key) => !env[key]);
  if (missing.length > 0) {
    checks.push({ ok: false, label: "Neon DB env", message: `${missing.join(", ")} が未設定です。` });
    return;
  }

  const invalid = ["DATABASE_URL", "DIRECT_URL"].filter((key) => !isPostgresUrl(env[key]));
  if (invalid.length > 0) {
    checks.push({ ok: false, label: "Neon DB env", message: `${invalid.join(", ")} はPostgreSQL URLではありません。` });
    return;
  }

  const placeholders = ["DATABASE_URL", "DIRECT_URL"].filter((key) => isPlaceholderEnvValue(env[key]));
  if (placeholders.length > 0) {
    checks.push({ ok: false, label: "Neon DB env", message: `${placeholders.join(", ")} はプレースホルダーです。` });
    return;
  }

  const prisma = new PrismaClient({
    log: ["error"],
  });

  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, "DATABASE_URL 接続確認");
    const [users, competitions, teams] = await withTimeout(
      Promise.all([prisma.user.count(), prisma.competition.count(), prisma.team.count()]),
      "主要テーブルread確認",
    );

    checks.push({
      ok: true,
      label: "Neon DB",
      message: `接続成功。主要テーブルread確認済み (users=${users}, competitions=${competitions}, teams=${teams})`,
    });
  } catch (error) {
    checks.push({ ok: false, label: "Neon DB", message: safeErrorMessage(error) });
  } finally {
    await prisma.$disconnect();
  }
}

async function checkBlob() {
  if (options.skipBlob) {
    checks.push({ ok: true, label: "Vercel Blob", message: "--skip-blob により省略" });
    return;
  }

  if (!env.BLOB_READ_WRITE_TOKEN) {
    checks.push({ ok: false, label: "Vercel Blob env", message: "BLOB_READ_WRITE_TOKEN が未設定です。" });
    return;
  }

  if (!env.BLOB_READ_WRITE_TOKEN.startsWith("vercel_blob_rw_") || isPlaceholderEnvValue(env.BLOB_READ_WRITE_TOKEN)) {
    checks.push({ ok: false, label: "Vercel Blob env", message: "BLOB_READ_WRITE_TOKEN の形式を確認してください。" });
    return;
  }

  try {
    const result = await withTimeout(
      list({
        limit: 1,
        token: env.BLOB_READ_WRITE_TOKEN,
      }),
      "Blob list確認",
    );

    const messages = [`list成功 (returned=${result.blobs.length}, hasMore=${result.hasMore})`];

    if (options.writeProbe) {
      const pathname = `delivery-healthcheck/${Date.now()}-${Math.random().toString(36).slice(2)}.txt`;
      const blob = await withTimeout(
        put(pathname, "tokyo-league delivery healthcheck\n", {
          access: "public",
          addRandomSuffix: false,
          contentType: "text/plain; charset=utf-8",
          token: env.BLOB_READ_WRITE_TOKEN,
        }),
        "Blob write確認",
      );
      await withTimeout(del(blob.url, { token: env.BLOB_READ_WRITE_TOKEN }), "Blob delete確認");
      messages.push("write/delete probe成功");
    }

    checks.push({ ok: true, label: "Vercel Blob", message: messages.join(" / ") });
  } catch (error) {
    checks.push({ ok: false, label: "Vercel Blob", message: safeErrorMessage(error) });
  }
}

function parseArgs(args) {
  const parsed = {
    envFilePath: undefined,
    skipDb: false,
    skipBlob: false,
    writeProbe: false,
    timeoutMs: 15_000,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--skip-db") {
      parsed.skipDb = true;
      continue;
    }

    if (arg === "--skip-blob") {
      parsed.skipBlob = true;
      continue;
    }

    if (arg === "--write-probe") {
      parsed.writeProbe = true;
      continue;
    }

    if (arg === "--timeout-ms") {
      parsed.timeoutMs = Number.parseInt(requiredValue(args, (index += 1), arg), 10);
      if (!Number.isFinite(parsed.timeoutMs) || parsed.timeoutMs < 1000) {
        console.log("[error] --timeout-ms は1000以上の数値を指定してください。");
        printHelpAndExit(1);
      }
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
  npm run security:prod-services
  npm run security:prod-services -- .env.production.local
  npm run security:prod-services -- .env.production.local --write-probe

Options:
  --skip-db       Neon DB確認を省略する
  --skip-blob     Vercel Blob確認を省略する
  --write-probe   Vercel Blobへ小さな疎通ファイルを書き込み、すぐ削除する
  --timeout-ms    各サービス確認のタイムアウト。default: 15000`);
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
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
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

function isPlaceholderEnvValue(value) {
  return /USER|PASSWORD|HOST|DIRECT_HOST|replace-with|vercel-blob-read-write-token|example/i.test(value);
}

async function withTimeout(promise, label) {
  let timeout;

  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`${label} がタイムアウトしました。`)), options.timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

function safeErrorMessage(error) {
  const message = error instanceof Error ? error.message : String(error);
  return redactSecretLikeValues(message).slice(0, 240);
}

function redactSecretLikeValues(value) {
  return value
    .replace(/postgres(?:ql)?:\/\/[^\s'"`]+/gi, "[redacted-postgres-url]")
    .replace(/vercel_blob_rw_[A-Za-z0-9_-]+/g, "[redacted-blob-token]")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[redacted-email]");
}
