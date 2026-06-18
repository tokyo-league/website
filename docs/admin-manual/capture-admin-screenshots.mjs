import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const baseURL = process.env.ADMIN_BASE_URL ?? "http://127.0.0.1:3100";
const outputDir = path.resolve("docs/admin-manual/assets");

const pages = [
  { slug: "login", path: "/login", label: "ログイン画面" },
  { slug: "dashboard", path: "/admin", label: "ダッシュボード" },
  { slug: "competitions", path: "/admin/competitions", label: "大会管理" },
  {
    slug: "competition-edit",
    path: "/admin/competitions",
    label: "大会編集",
    clickSelector: ".admin-linked-row",
  },
  { slug: "assignments-users", path: "/admin/assignments", label: "担当者編集", scrollY: 900 },
  { slug: "results-top", path: "/admin/results", label: "結果管理 上部", heading: "対象リーグ" },
  { slug: "results-middle", path: "/admin/results", label: "結果管理 入力欄", heading: "結果画像" },
  { slug: "results-standings", path: "/admin/results", label: "結果管理 順位表", heading: "順位表を作成・更新" },
  {
    slug: "results-registered-standings",
    path: "/admin/results",
    label: "結果管理 登録済み順位表",
    heading: "登録済み順位表の確認",
  },
  { slug: "news-list", path: "/admin/news", label: "ニュース一覧" },
  { slug: "news-form", path: "/admin/news/new", label: "ニュース作成" },
  { slug: "teams-list", path: "/admin/teams", label: "チーム一覧" },
  { slug: "teams-form", path: "/admin/teams/new", label: "チーム作成" },
  { slug: "downloads", path: "/admin/downloads", label: "資料管理" },
  { slug: "assignments", path: "/admin/assignments", label: "担当割当" },
  { slug: "audit", path: "/admin/audit", label: "更新履歴" },
];

await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch();
const screenshotWidth = 1440;
const screenshotHeight = 520;
const page = await browser.newPage({ viewport: { width: screenshotWidth, height: screenshotHeight }, deviceScaleFactor: 1 });

for (const item of pages) {
  const url = new URL(item.path, baseURL).toString();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.locator("main").waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForTimeout(600);
  if (item.clickSelector) {
    await Promise.all([
      page.waitForURL(/\/admin\/competitions\/[^/]+$/),
      page.locator(item.clickSelector).first().click(),
    ]);
    await page.locator("main").waitFor({ state: "visible", timeout: 20_000 });
    await page.waitForTimeout(600);
  }
  if (item.heading) {
    await page.locator("h3", { hasText: item.heading }).first().evaluate((heading) => {
      window.scrollTo({ top: heading.getBoundingClientRect().top + window.scrollY - 40, behavior: "instant" });
    });
    await page.waitForTimeout(250);
  } else if (item.scrollY) {
    await page.evaluate((scrollY) => {
      document.documentElement.style.scrollBehavior = "auto";
      document.body.style.scrollBehavior = "auto";
      window.scrollTo({ left: 0, top: scrollY, behavior: "instant" });
    }, item.scrollY);
    await page.waitForTimeout(250);
  } else {
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  await page.screenshot({
    path: path.join(outputDir, `${item.slug}.png`),
    fullPage: false,
  });
  console.log(`Captured ${item.label}: ${item.path}`);
}

await browser.close();
