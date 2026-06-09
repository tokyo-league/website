import { expect, test } from "@playwright/test";
import { applyAdminRecordToJwt, getAdminJwtLookupEmail } from "../../lib/admin-session";
import { assertDownloadFileAllowed } from "../../lib/download-file-validation";
import { assertProductionEnvReady, getInvalidProductionEnv, getMissingProductionEnv } from "../../lib/env-validation";
import { isVerifiedGoogleProfile } from "../../lib/google-profile";
import { assertImageFileAllowed } from "../../lib/image-file-validation";
import { checkRateLimit, createRateLimitStore, getRateLimitKey } from "../../lib/rate-limit";
import { rateLimitedRouteHeaders } from "../../lib/security-headers";
import { isE2ETestMode } from "../../lib/test-mode";
import { normalizeOptionalAssetPath, normalizeOptionalHttpUrl } from "../../lib/url-validation";

const requiredHeaders = [
  ["referrer-policy", "strict-origin-when-cross-origin"],
  ["x-content-type-options", "nosniff"],
  ["x-frame-options", "SAMEORIGIN"],
  ["x-permitted-cross-domain-policies", "none"],
  ["permissions-policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()"],
  ["strict-transport-security", "max-age=63072000; includeSubDomains; preload"],
] as const;

test("公開ページにセキュリティヘッダーが付与される", async ({ page }) => {
  const response = await page.goto("/");

  expect(response).not.toBeNull();
  const headers = response!.headers();
  const csp = headers["content-security-policy"];

  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("frame-ancestors 'self'");
  expect(csp).toContain("base-uri 'self'");
  expect(csp).toContain("form-action 'self'");
  expect(csp).toContain("report-uri /api/security/csp-report");
  expect(csp).toContain("https://accounts.google.com");
  expect(csp).toContain("https://*.public.blob.vercel-storage.com");
  expect(headers["x-robots-tag"]).toBeUndefined();

  for (const [header, value] of requiredHeaders) {
    expect(headers[header]).toBe(value);
  }
});

test("管理画面にも同じセキュリティヘッダーが付与される", async ({ page }) => {
  const response = await page.goto("/admin");

  expect(response).not.toBeNull();
  const headers = response!.headers();

  expect(headers["content-security-policy"]).toContain("default-src 'self'");
  expect(headers["content-security-policy"]).toContain("object-src 'none'");
  expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-robots-tag"]).toBe("noindex, nofollow, noarchive");
  expect(headers["cache-control"]).toContain("no-store");
});

test("管理画面の変更リクエストは外部Originを拒否する", async ({ request }) => {
  const response = await request.post("/admin", {
    headers: {
      Origin: "https://evil.example",
    },
  });
  const headers = response.headers();

  expect(response.status()).toBe(403);
  expect(headers["content-security-policy"]).toContain("default-src 'self'");
  expect(headers["x-robots-tag"]).toBe("noindex, nofollow, noarchive");
  expect(headers["cache-control"]).toContain("no-store");
});

test("管理画面の変更リクエストはcross-site Fetch Metadataを拒否する", async ({ request }) => {
  const response = await request.post("/admin", {
    headers: {
      "Sec-Fetch-Site": "cross-site",
    },
  });

  expect(response.status()).toBe(403);
});

test("ログイン画面はnoindexかつno-storeで配信される", async ({ page }) => {
  const response = await page.goto("/login");

  expect(response).not.toBeNull();
  const headers = response!.headers();

  expect(headers["x-robots-tag"]).toBe("noindex, nofollow, noarchive");
  expect(headers["cache-control"]).toContain("no-store");
});

test("認証APIはnoindexかつno-storeで配信される", async ({ request }) => {
  const response = await request.get("/api/auth/session");
  const headers = response.headers();

  expect(response.ok()).toBe(true);
  expect(headers["x-robots-tag"]).toBe("noindex, nofollow, noarchive");
  expect(headers["cache-control"]).toContain("no-store");
});

test("CSPレポートAPIはnoindexかつno-storeで受信できる", async ({ request }) => {
  const response = await request.post("/api/security/csp-report", {
    data: {
      "csp-report": {
        "blocked-uri": "https://example.com/script.js",
        "document-uri": "https://tokyo-league.example/",
        "effective-directive": "script-src",
      },
    },
  });
  const headers = response.headers();

  expect(response.status()).toBe(204);
  expect(headers["x-robots-tag"]).toBe("noindex, nofollow, noarchive");
  expect(headers["cache-control"]).toContain("no-store");
});

test("robots.txtで管理画面と認証・セキュリティAPIのクロールを禁止する", async ({ request }) => {
  const response = await request.get("/robots.txt");
  const body = await response.text();

  expect(response.ok()).toBe(true);
  expect(body).toContain("User-Agent: *");
  expect(body).toContain("Allow: /");
  expect(body).toContain("Disallow: /admin");
  expect(body).toContain("Disallow: /login");
  expect(body).toContain("Disallow: /api/auth");
  expect(body).toContain("Disallow: /api/security");
});

test("Production環境では必須環境変数の欠落を検出する", () => {
  const productionEnv = {
    NODE_ENV: "production",
    VERCEL_ENV: "production",
    AUTH_SECRET: "0123456789abcdef0123456789abcdef",
    AUTH_GOOGLE_ID: "tokyo-league.apps.googleusercontent.com",
    DATABASE_URL: "postgres://example",
    DIRECT_URL: "postgres://example-direct",
    BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_token",
  };

  expect(getMissingProductionEnv(productionEnv)).toEqual(["AUTH_GOOGLE_SECRET"]);
  expect(() => assertProductionEnvReady(productionEnv)).toThrow("AUTH_GOOGLE_SECRET");

  expect(() =>
    assertProductionEnvReady({
      NODE_ENV: "production",
      VERCEL_ENV: "preview",
    }),
  ).not.toThrow();
});

test("Production環境では危険な環境変数値を検出する", () => {
  const productionEnv = {
    NODE_ENV: "production",
    VERCEL_ENV: "production",
    AUTH_SECRET: "short",
    AUTH_GOOGLE_ID: "google-id",
    AUTH_GOOGLE_SECRET: "short",
    DATABASE_URL: "mysql://example",
    DIRECT_URL: "https://example.com",
    BLOB_READ_WRITE_TOKEN: "blob-token",
    E2E_TEST_MODE: "1",
    AUTH_URL: "http://localhost:3000",
    NEXTAUTH_URL: "not-a-url",
  };

  expect(getInvalidProductionEnv(productionEnv)).toEqual([
    "E2E_TEST_MODE",
    "AUTH_SECRET",
    "AUTH_GOOGLE_ID",
    "AUTH_GOOGLE_SECRET",
    "DATABASE_URL",
    "DIRECT_URL",
    "BLOB_READ_WRITE_TOKEN",
    "AUTH_URL",
    "NEXTAUTH_URL",
  ]);
  expect(() => assertProductionEnvReady(productionEnv)).toThrow("Invalid production environment variables");
});

test("E2E認証バイパスは本番環境では無効化される", () => {
  const originalE2ETestMode = process.env.E2E_TEST_MODE;
  const originalNodeEnv = process.env.NODE_ENV;

  try {
    process.env.E2E_TEST_MODE = "1";
    process.env.NODE_ENV = "production";

    expect(isE2ETestMode()).toBe(false);

    process.env.NODE_ENV = "test";

    expect(isE2ETestMode()).toBe(true);
  } finally {
    restoreEnv("E2E_TEST_MODE", originalE2ETestMode);
    restoreEnv("NODE_ENV", originalNodeEnv);
  }
});

test("管理者JWTはDB上の有効状態で再検証される", () => {
  const token = {
    sub: "old-user-id",
    email: "admin@example.com",
    role: "OWNER",
  };

  expect(getAdminJwtLookupEmail(token)).toBe("admin@example.com");
  expect(
    applyAdminRecordToJwt(token, {
      id: "current-user-id",
      email: "admin@example.com",
      role: "EDITOR",
      isActive: true,
    }),
  ).toEqual({
    sub: "current-user-id",
    email: "admin@example.com",
    role: "EDITOR",
  });
  expect(
    applyAdminRecordToJwt(token, {
      id: "disabled-user-id",
      email: "admin@example.com",
      role: "OWNER",
      isActive: false,
    }),
  ).toBeNull();
  expect(applyAdminRecordToJwt(token, null)).toBeNull();
});

test("Googleログインは検証済みメールだけを許可する", () => {
  expect(isVerifiedGoogleProfile({ email_verified: true })).toBe(true);
  expect(isVerifiedGoogleProfile({ email_verified: false })).toBe(false);
  expect(isVerifiedGoogleProfile({})).toBe(false);
  expect(isVerifiedGoogleProfile(null)).toBe(false);
});

test("ログイン、管理画面、認証・セキュリティAPIのレート制限は上限超過を検出する", () => {
  const store = createRateLimitStore();
  const config = {
    windowMs: 60_000,
    maxRequests: 2,
  };
  const key = getRateLimitKey("login", "203.0.113.10");
  const authKey = getRateLimitKey("auth", "203.0.113.10");
  const securityKey = getRateLimitKey("security", "203.0.113.10");

  expect(checkRateLimit(key, config, 1_000, store)).toMatchObject({
    allowed: true,
    remaining: 1,
  });
  expect(checkRateLimit(key, config, 2_000, store)).toMatchObject({
    allowed: true,
    remaining: 0,
  });
  expect(checkRateLimit(key, config, 3_000, store)).toMatchObject({
    allowed: false,
    remaining: 0,
    retryAfterSeconds: 58,
  });
  expect(checkRateLimit(key, config, 62_000, store)).toMatchObject({
    allowed: true,
    remaining: 1,
  });
  expect(authKey).toBe("auth:203.0.113.10");
  expect(securityKey).toBe("security:203.0.113.10");
});

test("レート制限レスポンスにも共通セキュリティヘッダーを付与する", () => {
  const headers = new Map(rateLimitedRouteHeaders.map((header) => [header.key.toLowerCase(), header.value]));

  expect(headers.get("content-security-policy")).toContain("default-src 'self'");
  expect(headers.get("content-security-policy")).toContain("object-src 'none'");
  expect(headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
  expect(headers.get("x-content-type-options")).toBe("nosniff");
  expect(headers.get("x-frame-options")).toBe("SAMEORIGIN");
  expect(headers.get("x-robots-tag")).toBe("noindex, nofollow, noarchive");
  expect(headers.get("cache-control")).toContain("no-store");
});

test("資料アップロードはMIME typeとファイル内容を検証する", () => {
  expect(() =>
    assertDownloadFileAllowed({
      filename: "guide.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.7\n"),
    }),
  ).not.toThrow();

  expect(() =>
    assertDownloadFileAllowed({
      filename: "guide.pdf",
      mimeType: "text/plain",
      buffer: Buffer.from("%PDF-1.7\n"),
    }),
  ).toThrow("拡張子とMIME typeが一致");

  expect(() =>
    assertDownloadFileAllowed({
      filename: "guide.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("not a pdf"),
    }),
  ).toThrow("PDFファイルの内容");

  expect(() =>
    assertDownloadFileAllowed({
      filename: "guide.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: Buffer.from("PK\u0003\u0004[Content_Types].xml xl/workbook.xml", "latin1"),
    }),
  ).not.toThrow();
});

test("画像アップロードはMIME typeとファイル内容を検証する", () => {
  const validPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
    "base64",
  );

  expect(() =>
    assertImageFileAllowed({
      filename: "result.png",
      mimeType: "image/png",
      size: validPng.length,
      buffer: validPng,
      rules: {
        label: "結果画像",
        maxSizeBytes: 10 * 1024 * 1024,
      },
    }),
  ).not.toThrow();

  expect(() =>
    assertImageFileAllowed({
      filename: "result.png",
      mimeType: "image/png",
      size: 8,
      buffer: Buffer.from("not-png"),
      rules: {
        label: "結果画像",
        maxSizeBytes: 10 * 1024 * 1024,
      },
    }),
  ).toThrow("結果画像の内容");

  expect(() =>
    assertImageFileAllowed({
      filename: "result.svg",
      mimeType: "image/svg+xml",
      size: 24,
      buffer: Buffer.from("<svg><script /></svg>"),
      rules: {
        label: "結果画像",
        maxSizeBytes: 10 * 1024 * 1024,
      },
    }),
  ).toThrow("JPG / PNG / WebP");
});

test("外部URL入力はhttp/httpsのみ許可する", () => {
  expect(normalizeOptionalHttpUrl("https://example.com/team", "公式サイトURL")).toBe("https://example.com/team");
  expect(normalizeOptionalHttpUrl("http://example.com/team", "公式サイトURL")).toBe("http://example.com/team");
  expect(normalizeOptionalHttpUrl("", "公式サイトURL")).toBeNull();
  expect(() => normalizeOptionalHttpUrl("javascript:alert(1)", "公式サイトURL")).toThrow(
    "http または https",
  );

  expect(normalizeOptionalAssetPath("/site-assets/teams/logo.png", "ロゴ画像URL")).toBe(
    "/site-assets/teams/logo.png",
  );
  expect(() => normalizeOptionalAssetPath("//evil.example/logo.png", "ロゴ画像URL")).toThrow(
    "ロゴ画像URLを確認",
  );
});

function restoreEnv(key: "E2E_TEST_MODE" | "NODE_ENV", value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
