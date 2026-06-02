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

test("結果管理で年度・大会・リーグ絞り込みと編集UIが表示できる", async ({ page }) => {
  await page.goto("/admin/results");

  const filterSelects = page.locator(".admin-filter-grid select");

  await expect(page.getByRole("heading", { name: "結果管理" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "対象リーグ" })).toBeVisible();
  await expect(filterSelects.nth(0)).toHaveValue("2026");
  await expect(filterSelects.nth(1)).toHaveValue("第103回 東京リーグ");
  await expect(filterSelects.nth(2)).toHaveValue("e2e-division-a");
  await expect(page.getByRole("heading", { name: "結果画像" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "順位表を作成・更新" })).toBeVisible();
  await expect(page.getByRole("button", { name: "登録値に戻す" })).toBeVisible();
  await expect(page.getByRole("button", { name: "入力をクリア" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "登録済み順位表の確認" })).toBeVisible();
  await expect(page.locator(".admin-standings-summary form").getByRole("button", { name: "削除" }).first()).toBeVisible();
});

test("資料管理ページが表示できる", async ({ page }) => {
  await page.goto("/admin/downloads");

  await expect(page.getByRole("heading", { name: "資料管理" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "公開資料一覧" })).toBeVisible();
});

test("担当リーグ割当で担当者編集UIが表示できる", async ({ page }) => {
  await page.goto("/admin/assignments");

  await expect(page.getByRole("heading", { name: "担当リーグ割当" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "登録済み担当者" })).toBeVisible();
  await expect(page.getByRole("button", { name: "担当者を更新" }).first()).toBeVisible();
  await expect(page.getByLabel("ロール").first()).toBeVisible();
});

test("ニュース作成フローが完了できる", async ({ page }) => {
  await page.goto("/admin/news/new");

  await expect(page.getByRole("heading", { name: "ニュース管理" })).toBeVisible();
  await page.getByLabel("タイトル").fill("E2Eニュース");
  await page.getByLabel("本文").fill("E2Eニュース本文です。");
  await page.getByRole("button", { name: "ニュースを保存" }).click();

  await expect(page.getByText("ニュース「E2Eニュース」を作成しました。")).toBeVisible();
});

test("チーム作成フローが完了できる", async ({ page }) => {
  await page.goto("/admin/teams/new");

  await expect(page.getByRole("heading", { name: "チーム管理" })).toBeVisible();
  await page.getByLabel("チーム名").fill("E2E FC");
  await page.getByLabel("Instagram URL").fill("@e2e_fc");
  await page.getByRole("button", { name: "チームを保存" }).click();

  await expect(page.getByText("E2E FC を追加しました。")).toBeVisible();
});
