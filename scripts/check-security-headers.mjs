const baseUrl = parseBaseUrl(process.argv[2]);
const checks = [];

await checkRoute({
  label: "公開トップ",
  path: "/",
  requiredHeaders: [
    ["content-security-policy", "default-src 'self'"],
    ["content-security-policy", "object-src 'none'"],
    ["content-security-policy", "frame-ancestors 'self'"],
    ["content-security-policy", "report-uri /api/security/csp-report"],
    ["referrer-policy", "strict-origin-when-cross-origin"],
    ["x-content-type-options", "nosniff"],
    ["x-frame-options", "SAMEORIGIN"],
    ["permissions-policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()"],
  ],
  forbiddenHeaders: ["x-robots-tag"],
});

await checkRoute({
  label: "ログイン画面",
  path: "/login",
  requiredHeaders: [
    ["content-security-policy", "default-src 'self'"],
    ["x-robots-tag", "noindex, nofollow, noarchive"],
    ["cache-control", "no-store"],
  ],
});

await checkRoute({
  label: "認証API",
  path: "/api/auth/session",
  requiredHeaders: [
    ["x-robots-tag", "noindex, nofollow, noarchive"],
    ["cache-control", "no-store"],
  ],
});

await checkRoute({
  label: "CSPレポートAPI",
  path: "/api/security/csp-report",
  requiredHeaders: [
    ["x-robots-tag", "noindex, nofollow, noarchive"],
    ["cache-control", "no-store"],
  ],
});

await checkRobotsTxt();

console.log("Tokyo League security header check");
console.log(`Base URL: ${baseUrl.origin}`);
console.log("");

for (const check of checks) {
  console.log(`${check.ok ? "[ok]" : "[error]"} ${check.label}: ${check.message}`);
}

const failed = checks.filter((check) => !check.ok);

console.log("");

if (failed.length > 0) {
  console.log(`${failed.length}件のセキュリティヘッダーチェックが未達です。`);
  process.exit(1);
}

console.log("セキュリティヘッダーチェックはすべて通過しました。");

function parseBaseUrl(value) {
  if (!value) {
    console.log("[error] 検査対象URLを指定してください。例: npm run security:headers -- https://example.com");
    process.exit(1);
  }

  try {
    return new URL(value);
  } catch {
    console.log(`[error] URLを確認してください: ${value}`);
    process.exit(1);
  }
}

async function checkRoute({ label, path, requiredHeaders, forbiddenHeaders = [] }) {
  const response = await fetchUrl(path);
  if (!response) {
    return;
  }

  const messages = [];

  if (response.status < 200 || response.status >= 400) {
    messages.push(`${path} が ${response.status} を返しました。`);
  }

  for (const [headerName, expectedValue] of requiredHeaders) {
    const actualValue = response.headers.get(headerName);

    if (!actualValue?.includes(expectedValue)) {
      messages.push(`${headerName} に ${expectedValue} がありません。`);
    }
  }

  for (const headerName of forbiddenHeaders) {
    if (response.headers.has(headerName)) {
      messages.push(`${headerName} が不要に付与されています。`);
    }
  }

  checks.push({
    ok: messages.length === 0,
    label,
    message: messages.length === 0 ? `${path} ok` : messages.join(" "),
  });
}

async function checkRobotsTxt() {
  const response = await fetchUrl("/robots.txt");
  if (!response) {
    return;
  }

  const body = await response.text();
  const missing = ["/admin", "/login", "/api/auth", "/api/security"].filter((path) => !body.includes(`Disallow: ${path}`));

  checks.push({
    ok: response.ok && missing.length === 0,
    label: "robots.txt",
    message:
      response.ok && missing.length === 0
        ? "/robots.txt ok"
        : `robots.txt を確認してください。missing=${missing.join(", ") || "-"} status=${response.status}`,
  });
}

async function fetchUrl(path) {
  try {
    return await fetch(new URL(path, baseUrl), {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    checks.push({
      ok: false,
      label: path,
      message: `接続できませんでした: ${error instanceof Error ? error.message : String(error)}`,
    });
    return null;
  }
}
