import { expect, test } from "@playwright/test";

test("公開トップで主要導線とニュースモーダルが開く", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: /受け継ぐ誇りを/ })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "第103回 東京リーグ" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: /大会情報を見る/ })).toHaveAttribute(
    "href",
    "/competitions",
  );
  await expect(page.getByRole("heading", { name: "最新情報" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "参加チーム" })).toBeVisible();

  const detailButton = page.getByRole("button", { name: "詳細を見る" }).first();
  await detailButton.click();

  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("button", { name: "閉じる" })).toBeVisible();
});

test("スマホ表示でヒーローとハンバーガーメニューが利用できる", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const hero = page.locator(".heritage-hero");
  await expect(hero).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: /受け継ぐ誇りを/ })).toBeVisible();

  const menuButton = page.getByRole("button", { name: "メニューを開く" });
  await expect(menuButton).toBeVisible();
  await menuButton.click();
  const navigation = page.getByRole("navigation", { name: "グローバルナビゲーション" });
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole("link", { name: "東京リーグについて", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "メニューを閉じる" })).toBeVisible();
});

test("公開ダウンロードページが表示できる", async ({ page }) => {
  await page.goto("/downloads");

  await expect(page.getByRole("heading", { name: "資料ダウンロード" })).toBeVisible();
  await expect(page.locator(".download-list-item").first()).toBeVisible();
  const downloadItems = page.locator(".download-list-item");
  await expect(downloadItems.nth(0)).toHaveCSS("padding-left", "24px");
  await expect(downloadItems.nth(1)).toHaveCSS("padding-left", "24px");
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
  await expect(page.getByRole("main").getByRole("link", { name: "関連ニュース" })).toHaveCSS(
    "color",
    "rgb(255, 255, 255)",
  );

  await page.getByRole("link", { name: "大会詳細へ" }).first().click();

  await expect(page.getByRole("heading", { name: "リーグ一覧" })).toBeVisible();
  await expect(page.getByRole("link", { name: "リーグ結果を見る" }).first()).toBeVisible();

  await page.getByRole("button", { name: "所属 3チーム", exact: true }).click();
  const teamDialog = page.getByRole("dialog", { name: "Aリーグ 所属チーム" });
  await expect(teamDialog).toBeVisible();
  await expect(teamDialog.getByText("クリアージュFCジュニア", { exact: true })).toBeVisible();
  await expect(teamDialog.getByText("バディサッカークラブ", { exact: true })).toBeVisible();
  await expect(teamDialog.getByText("暁星アストラ・ジュニア", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(teamDialog).toBeHidden();

  await page.goto("/competitions/tokyo-league-103/a-league");

  await expect(page.getByRole("heading", { level: 1, name: "Aリーグ" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "試合結果画像" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "所属チーム" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "試合一覧" })).toBeVisible();

  await page.goto("/competitions/tokyo-league-103/b-league");
  await expect(page.getByText("公式結果は上の結果画像をご確認ください。")).toBeVisible();
  await expect(page.getByText("過去大会は結果画像を正本として扱います。")).toBeVisible();
  await expect(page.getByText(/目視照合済み|OCR/)).toHaveCount(0);
});
