import { expect, test } from "@playwright/test";

test("管理ダッシュボードがE2Eモードで表示できる", async ({ page }) => {
  await page.goto("/admin");

  await expect(page.getByRole("heading", { name: "ダッシュボード" })).toBeVisible();
  await expect(page.getByRole("link", { name: "ニュース", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "資料", exact: true })).toBeVisible();
  await expect(page.getByText("公開リーグ一覧")).toHaveCount(0);
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
  await expect(page.getByRole("heading", { name: "入稿方法を選ぶ" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Excelファイルがある場合" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Excelファイルがない場合" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Excel入稿へ進む" })).toHaveAttribute("href", "#excel-import");
  await expect(page.getByRole("link", { name: "手入力へ進む" })).toHaveAttribute("href", "#manual-match-entry");
  await expect(page.getByRole("heading", { name: "Excelで試合結果を入稿" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Excel入稿の手順" })).toContainText("対象を選択");
  await expect(page.getByRole("list", { name: "Excel入稿の手順" })).toContainText("内容を確認");
  await expect(page.locator(".admin-excel-import .upload-field__button", { hasText: "Excelを選択" })).toBeVisible();
  await expect(page.getByLabel("第99回東京リーグなどの結果管理表")).toHaveAttribute("accept", /\.xlsx/);
  await expect(page.getByRole("button", { name: "Excelの内容を読み取る" })).toBeDisabled();
  await expect(filterSelects.nth(0)).toHaveValue("2026");
  await expect(filterSelects.nth(1)).toHaveValue("第103回 東京リーグ");
  await expect(filterSelects.nth(2)).toHaveValue("e2e-division-a");
  await expect(page.getByRole("heading", { name: "結果画像" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "順位表を作成・更新" })).toBeVisible();
  await expect(page.getByLabel("順位表行を追加")).toBeVisible();
  await expect(page.getByRole("button", { name: "行を追加" })).toBeVisible();
  await expect(page.getByRole("button", { name: "登録値に戻す" })).toBeVisible();
  await expect(page.getByRole("button", { name: "入力をクリア" })).toBeVisible();
  await expect(page.getByText(/結果画像の有無にかかわらず試合結果ページへ反映/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "登録済み順位表の確認" })).toBeVisible();
  await expect(page.locator(".admin-standings-summary form").getByRole("button", { name: "削除" }).first()).toBeVisible();
});

test("大会管理はトップをコンパクトにして大会編集へ遷移できる", async ({ page }) => {
  await page.goto("/admin/competitions");

  await expect(page.getByRole("heading", { name: "大会管理" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "編集中の大会" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "年度管理" })).toBeVisible();
  await expect(page.locator("details.admin-disclosure")).not.toHaveAttribute("open", "");
  await expect(page.getByRole("heading", { name: "リーグを編集・削除" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "リーグ所属チーム一覧" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "大会運用メモ" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "登録済み大会一覧" })).toHaveCount(0);

  await page.getByRole("link", { name: "全大会一覧" }).click();
  await expect(page.getByRole("heading", { name: "大会一覧", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "登録済み大会一覧" })).toBeVisible();

  const leagueRows = page.locator("a.admin-table__row--link").filter({ hasText: "東京リーグ向け" });
  await expect(leagueRows.first()).toBeVisible();
  await leagueRows.first().click();
  await expect(page.getByRole("heading", { name: "大会を更新・削除" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "リーグを編集・削除" })).toBeVisible();
});

test("資料管理ページが表示できる", async ({ page }) => {
  await page.goto("/admin/downloads");

  await expect(page.getByRole("heading", { name: "資料管理" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "公開資料一覧" })).toBeVisible();
  await expect(page.getByText("公開URL", { exact: true })).toBeVisible();
});

test("理事会管理で追加・編集・削除UIが表示できる", async ({ page }) => {
  await page.goto("/admin/board");

  await expect(page.getByRole("heading", { name: "理事会管理" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "理事会メンバーを追加" })).toBeVisible();
  await expect(page.getByLabel("役職").first()).toBeVisible();
  await expect(page.getByLabel("氏名").first()).toBeVisible();
  await expect(page.getByLabel("担当").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "メンバーを追加" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "登録済みメンバー" })).toBeVisible();
  await expect(page.getByRole("button", { name: "変更を保存" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "削除" }).first()).toBeVisible();
});

test("チーム一覧で削除前の参照状況が確認できる", async ({ page }) => {
  await page.goto("/admin/teams");

  await expect(page.getByRole("heading", { name: "チーム管理" })).toBeVisible();
  await expect(page.getByText("削除前確認", { exact: true })).toBeVisible();
  await expect(page.getByText(/参照なし|所属リーグ \d+ \/ 試合 \d+ \/ 順位 \d+/).first()).toBeVisible();
});

test("担当リーグ割当で担当者編集UIが表示できる", async ({ page }) => {
  await page.goto("/admin/assignments");

  await expect(page.getByRole("heading", { name: "担当リーグ割当" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "登録済み担当者" })).toBeVisible();
  await expect(page.getByRole("button", { name: "担当者を更新" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "無効化" }).first()).toBeVisible();
  await expect(page.getByLabel("ロール").first()).toBeVisible();
});

test("Ownerは更新履歴を確認できる", async ({ page }) => {
  await page.goto("/admin/audit");

  await expect(page.getByRole("heading", { name: "更新履歴" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "直近50件の更新" })).toBeVisible();
  await expect(page.getByText("E2Eニュース")).toBeVisible();
  await expect(page.getByText("e2e@example.com").first()).toBeVisible();
});

test("ニュース作成フローが完了できる", async ({ page }) => {
  const title = `E2Eニュース-${Date.now()}`;

  await page.goto("/admin/news/new");

  await expect(page.getByRole("heading", { name: "ニュース管理" })).toBeVisible();
  await page.getByLabel("タイトル").fill(title);
  await page.getByLabel("本文").fill("E2Eニュース本文です。");
  await page.getByRole("button", { name: "ニュースを保存" }).click();

  await expect(page.getByText(`ニュース「${title}」を作成しました。`)).toBeVisible();
});

test("チーム作成フローが完了できる", async ({ page }) => {
  const teamName = `E2E FC ${Date.now()}`;

  await page.goto("/admin/teams/new");

  await expect(page.getByRole("heading", { name: "チーム管理" })).toBeVisible();
  await page.getByLabel("チーム名").fill(teamName);
  await expect(page.getByText("ユニフォームの色", { exact: true })).toBeVisible();
  await expect(page.getByLabel("ホームの色")).toBeDisabled();
  await expect(page.getByLabel("アウェイの色")).toBeDisabled();
  await expect(page.getByText("未設定", { exact: true })).toHaveCount(2);
  await expect(page.getByText("チーム画像", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("結成")).toHaveCount(0);
  await expect(page.getByLabel("代表者")).toHaveCount(0);
  await expect(page.getByLabel("監督")).toHaveCount(0);
  await expect(page.getByLabel("公式サイトURL")).toHaveCount(0);
  await expect(page.getByLabel("Instagram URL")).toHaveCount(0);
  await page.getByRole("button", { name: "チームを保存" }).click();

  await expect(page.getByText(`${teamName} を追加しました。`)).toBeVisible();
});

test("アップロード欄に容量上限を表示し、超過時は具体的なエラーを表示する", async ({ page }) => {
  const oversizedImage = {
    name: "oversized.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
  };

  await page.goto("/admin/results");
  await expect(page.getByText("JPG / PNG / WebP、10MB以下。", { exact: false })).toBeVisible();
  await page.locator('input[name="resultImageFile"]').setInputFiles(oversizedImage);
  await expect(page.getByText("結果画像は 10MB 以下にしてください。")).toBeVisible();

  await page.goto("/admin/news/new");
  await expect(page.getByText("JPG / PNG / WebP、10MB以下。", { exact: true })).toBeVisible();
  await page.locator('input[name="eyecatchFile"]').setInputFiles(oversizedImage);
  await expect(page.getByText("アイキャッチ画像は 10MB 以下にしてください。")).toBeVisible();

  await page.goto("/admin/teams/new");
  await expect(page.getByText(/JPG \/ PNG \/ WebP、10MB以下、240x240px以上/)).toBeVisible();
  await page.locator('input[name="logoFile"]').setInputFiles(oversizedImage);
  await expect(page.getByText("ロゴ画像は 10MB 以下にしてください。")).toBeVisible();

  await page.goto("/admin/downloads");
  await expect(page.getByText("PDF / Excel / Word、20MB以下。", { exact: true })).toBeVisible();
  await page.locator('input[name="file"]').setInputFiles({
    name: "oversized.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.alloc(20 * 1024 * 1024 + 1),
  });
  await expect(page.getByText("資料ファイルは 20MB 以下にしてください。")).toBeVisible();
});
