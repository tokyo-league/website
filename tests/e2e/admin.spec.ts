import { expect, test } from "@playwright/test";

test("管理ダッシュボードがE2Eモードで表示できる", async ({ page }) => {
  await page.goto("/admin");

  await expect(page.getByRole("heading", { name: "ダッシュボード" })).toBeVisible();
  await expect(page.getByRole("link", { name: "ニュース", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "資料", exact: true })).toBeVisible();
  await expect(page.getByText("公開リーグ一覧")).toBeVisible();
});

test("管理ニュース一覧が表示できる", async ({ page }) => {
  await page.goto("/admin/news");

  await expect(page.getByRole("heading", { name: "ニュース管理" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "ニュース一覧" })).toBeVisible();
  await expect(page.getByRole("link", { name: "新規作成" })).toBeVisible();
});
