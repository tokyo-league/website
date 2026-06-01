import { expect, test } from "@playwright/test";

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
