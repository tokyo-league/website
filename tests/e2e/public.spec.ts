import { expect, test } from "@playwright/test";

test("公開トップで主要導線とニュースモーダルが開く", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "第103回 東京リーグ" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "試合情報", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "最新ニュース" })).toBeVisible();
  await expect(page.getByText("最新の試合結果や各チームの勝敗を確認できます。")).toBeVisible();
  await expect(page.getByRole("link", { name: "Aリーグを見る 更新 03.22" })).toHaveAttribute(
    "href",
    "/competitions/tokyo-league-103/a-league",
  );
  await expect(page.getByRole("link", { name: "参加チーム一覧" })).toBeVisible();

  const detailButton = page.getByRole("button", { name: "詳細を見る" }).first();
  await detailButton.click();

  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("button", { name: "閉じる" })).toBeVisible();
});

test("公開ダウンロードページが表示できる", async ({ page }) => {
  await page.goto("/downloads");

  await expect(page.getByRole("heading", { name: "資料ダウンロード" })).toBeVisible();
  await expect(page.locator(".download-list-item").first()).toBeVisible();
});

test("ニュースページでニュースカードが表示できる", async ({ page }) => {
  await page.goto("/news");

  await expect(page.getByRole("heading", { level: 1, name: "ニュース" })).toBeVisible();
  await expect(page.locator(".news-index .news-list-item").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "関連資料" })).toHaveCount(0);
});

test("東京リーグ紹介ページで理事会情報が表示できる", async ({ page }) => {
  await page.goto("/about");

  await expect(page.getByRole("heading", { level: 2, name: "理事会" })).toBeVisible();
  await expect(page.getByText("宮崎 昇作", { exact: true })).toBeVisible();
  await expect(page.getByText("後援会会長", { exact: true })).toBeVisible();
});

test("参加チームページで主要導線とチーム一覧が表示できる", async ({ page }) => {
  await page.goto("/teams");

  await expect(page.getByRole("heading", { level: 1, name: "参加チーム" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "試合情報へ" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "お問い合わせ" })).toBeVisible();
  await expect(page.getByText(/掲載チーム \d+/)).toBeVisible();
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
