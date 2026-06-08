import fs from "node:fs";

const checks = [];

const files = {
  envValidation: readText("lib/env-validation.ts"),
  middleware: readText("middleware.ts"),
  nextConfig: readText("next.config.ts"),
  securityHeaderCheck: readText("scripts/check-security-headers.mjs"),
  securityHeaders: readText("lib/security-headers.ts"),
  testMode: readText("lib/test-mode.ts"),
};

checkSecurityHeaders();
checkSecurityHeaderProbe();
checkPrivateRouteHeaders();
checkHeaderConfig();
checkRateLimitMiddleware();
checkProductionEnvValidation();
checkE2ETestModeGuard();

console.log("Tokyo League security baseline check");
console.log("");

for (const check of checks) {
  console.log(`${check.ok ? "[ok]" : "[error]"} ${check.label}: ${check.message}`);
}

const failed = checks.filter((check) => !check.ok);

console.log("");

if (failed.length > 0) {
  console.log(`${failed.length}件のセキュリティ基準チェックが未達です。`);
  process.exit(1);
}

console.log("セキュリティ基準チェックはすべて通過しました。");

function checkSecurityHeaders() {
  const required = [
    ["CSP default-src", "\"default-src 'self'\""],
    ["CSP script-src", "script-src 'self' 'unsafe-inline'"],
    ["CSP object-src", "\"object-src 'none'\""],
    ["CSP frame-ancestors", "\"frame-ancestors 'self'\""],
    ["CSP base-uri", "\"base-uri 'self'\""],
    ["CSP form-action", "\"form-action 'self'\""],
    ["CSP report-uri", "\"report-uri /api/security/csp-report\""],
    ["CSP upgrade-insecure-requests", "\"upgrade-insecure-requests\""],
    ["Google OAuth connect-src", "https://accounts.google.com"],
    ["Google OAuth token endpoint", "https://oauth2.googleapis.com"],
    ["Google OIDC endpoint", "https://openidconnect.googleapis.com"],
    ["Blob image/connect allowlist", "https://*.public.blob.vercel-storage.com"],
    ["Referrer-Policy", "strict-origin-when-cross-origin"],
    ["X-Content-Type-Options", "nosniff"],
    ["X-Frame-Options", "SAMEORIGIN"],
    ["X-Permitted-Cross-Domain-Policies", "none"],
    ["Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()"],
    ["Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload"],
  ];

  pushIncludesCheck({
    label: "共通セキュリティヘッダー",
    source: files.securityHeaders,
    required,
  });

  pushCheck({
    label: "本番CSP unsafe-eval禁止",
    ok: files.securityHeaders.includes("${isDevelopment ? \" 'unsafe-eval'\" : \"\"}"),
    success: "unsafe-eval はdevelopment時のみ許可",
    failure: "unsafe-eval のdevelopment限定条件を確認してください。",
  });
}

function checkPrivateRouteHeaders() {
  const required = [
    ["X-Robots-Tag", "noindex, nofollow, noarchive"],
    ["Cache-Control", "no-store, no-cache, must-revalidate"],
    ["rateLimitedRouteHeaders", "export const rateLimitedRouteHeaders"],
    ["rate limit private headers", "...privateRouteHeaders"],
  ];

  pushIncludesCheck({
    label: "管理/認証privateヘッダー",
    source: files.securityHeaders,
    required,
  });
}

function checkSecurityHeaderProbe() {
  const required = [
    ["CSP report POST path", "path: \"/api/security/csp-report\""],
    ["CSP report POST method", "method: \"POST\""],
    ["CSP report expected 204", "expectedStatus: 204"],
    ["CSP report content type", "\"content-type\": \"application/csp-report\""],
  ];

  pushIncludesCheck({
    label: "本番セキュリティヘッダー外部検査",
    source: files.securityHeaderCheck,
    required,
  });
}

function checkHeaderConfig() {
  const required = [
    ["全ルート共通ヘッダー", "source: \"/:path*\""],
    ["全ルート securityHeaders", "headers: securityHeaders"],
    ["管理画面 privateRouteHeaders", "source: \"/admin/:path*\""],
    ["ログイン privateRouteHeaders", "source: \"/login\""],
    ["認証API privateRouteHeaders", "source: \"/api/auth/:path*\""],
    ["CSP report privateRouteHeaders", "source: \"/api/security/:path*\""],
  ];

  pushIncludesCheck({
    label: "Next.jsヘッダー適用範囲",
    source: files.nextConfig,
    required,
  });
}

function checkRateLimitMiddleware() {
  const required = [
    ["middleware matcher admin", "\"/admin/:path*\""],
    ["middleware matcher auth", "\"/api/auth/:path*\""],
    ["middleware matcher security", "\"/api/security/:path*\""],
    ["middleware matcher login", "\"/login\""],
    ["adminRouteRateLimit", "adminRouteRateLimit"],
    ["authRouteRateLimit", "authRouteRateLimit"],
    ["loginRouteRateLimit", "loginRouteRateLimit"],
    ["securityRouteRateLimit", "securityRouteRateLimit"],
    ["Retry-After", "\"Retry-After\""],
    ["rate limited headers", "rateLimitedRouteHeaders"],
  ];

  pushIncludesCheck({
    label: "管理/認証レート制限middleware",
    source: files.middleware,
    required,
  });
}

function checkProductionEnvValidation() {
  const required = [
    ["AUTH_SECRET", "\"AUTH_SECRET\""],
    ["AUTH_GOOGLE_ID", "\"AUTH_GOOGLE_ID\""],
    ["AUTH_GOOGLE_SECRET", "\"AUTH_GOOGLE_SECRET\""],
    ["DATABASE_URL", "\"DATABASE_URL\""],
    ["DIRECT_URL", "\"DIRECT_URL\""],
    ["BLOB_READ_WRITE_TOKEN", "\"BLOB_READ_WRITE_TOKEN\""],
    ["Production判定", "env.NODE_ENV === \"production\" && env.VERCEL_ENV === \"production\""],
    ["E2E誤設定検出", "env.E2E_TEST_MODE"],
    ["AUTH_SECRET長さ検査", "env.AUTH_SECRET.length < 32"],
    ["Google ID形式検査", ".apps.googleusercontent.com"],
    ["Blob token形式検査", "vercel_blob_rw_"],
  ];

  pushIncludesCheck({
    label: "本番環境変数安全検査",
    source: files.envValidation,
    required,
  });
}

function checkE2ETestModeGuard() {
  pushCheck({
    label: "E2Eバイパス本番無効化",
    ok: files.testMode.includes("process.env.E2E_TEST_MODE === \"1\"") && files.testMode.includes("process.env.NODE_ENV !== \"production\""),
    success: "E2E_TEST_MODE は非productionのみ有効",
    failure: "lib/test-mode.ts のproduction無効化条件を確認してください。",
  });
}

function pushIncludesCheck({ label, source, required }) {
  const missing = required.filter(([, text]) => !source.includes(text)).map(([name]) => name);

  pushCheck({
    label,
    ok: missing.length === 0,
    success: "必要な基準を満たしています",
    failure: `不足: ${missing.join(", ") || "-"}`,
  });
}

function pushCheck({ label, ok, success, failure }) {
  checks.push({
    label,
    ok,
    message: ok ? success : failure,
  });
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    checks.push({
      label: filePath,
      ok: false,
      message: `ファイルを読めませんでした: ${error instanceof Error ? error.message : String(error)}`,
    });
    return "";
  }
}
