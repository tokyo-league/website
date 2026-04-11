import { expect, test } from "@playwright/test";

test("公開トップで主要導線とニュースモーダルが開く", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "第103回 東京リーグ" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "試合情報", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "最新ニュース" })).toBeVisible();

  const detailButton = page.getByRole("button", { name: "詳細を見る" }).first();
  await detailButton.click();

  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("button", { name: "閉じる" })).toBeVisible();
});

test("公開ダウンロードページが表示できる", async ({ page }) => {
  await page.goto("/downloads");

  await expect(page.getByRole("heading", { name: "資料ダウンロード" })).toBeVisible();
});

test("試合情報一覧からリーグ詳細まで辿れる", async ({ page }) => {
  await page.goto("/competitions");

  await expect(page.getByRole("heading", { name: "試合情報" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "開催中の大会" })).toBeVisible();

  await page.getByRole("link", { name: "大会詳細へ" }).first().click();

  await expect(page.getByRole("heading", { name: "リーグ一覧" })).toBeVisible();
  await expect(page.getByRole("link", { name: "リーグ結果を見る" }).first()).toBeVisible();

  await page.goto("/competitions/tokyo-league-103/a-league");

  await expect(page.getByRole("heading", { level: 1, name: "Aリーグ" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "試合結果画像" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "所属チーム" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "試合一覧" })).toBeVisible();
});
