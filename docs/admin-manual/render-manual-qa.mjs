import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const outputDir = path.resolve("docs/admin-manual/output/qa-pages");
const htmlPath = path.resolve("docs/admin-manual/output/tokyo-league-admin-manual.html");

await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 990 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });

const pageCount = await page.locator(".page").count();
for (let index = 0; index < pageCount; index += 1) {
  await page.locator(".page").nth(index).screenshot({
    path: path.join(outputDir, `page-${String(index + 1).padStart(2, "0")}.png`),
  });
}

await browser.close();
console.log(`Rendered ${pageCount} QA pages to ${outputDir}`);
