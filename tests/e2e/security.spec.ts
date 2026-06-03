import { expect, test } from "@playwright/test";
import { assertDownloadFileAllowed } from "../../lib/download-file-validation";
import { assertImageFileAllowed } from "../../lib/image-file-validation";
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
  expect(csp).toContain("https://accounts.google.com");
  expect(csp).toContain("https://*.public.blob.vercel-storage.com");

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
