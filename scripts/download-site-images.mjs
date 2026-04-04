import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const origin = "https://tokyo-league.jp";
const outputRoot = path.resolve("downloads/tokyo-league-images");
const imageExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".svg",
  ".webp",
  ".avif",
]);

const pageQueue = [
  `${origin}/`,
  `${origin}/wp-sitemap.xml`,
  `${origin}/sitemap_index.xml`,
];

const visitedPages = new Set();
const visitedCss = new Set();
const imageUrls = new Set();

function normalizeUrl(url, base = origin) {
  try {
    const parsed = new URL(url, base);
    parsed.hash = "";
    return parsed;
  } catch {
    return null;
  }
}

function isSameOrigin(url) {
  return url.origin === origin;
}

function hasImageExtension(url) {
  return imageExtensions.has(path.extname(url.pathname).toLowerCase());
}

function addImage(url, base) {
  const parsed = normalizeUrl(url, base);
  if (!parsed || !isSameOrigin(parsed) || !hasImageExtension(parsed)) {
    return;
  }
  imageUrls.add(parsed.toString());
}

function addPage(url, base) {
  const parsed = normalizeUrl(url, base);
  if (!parsed || !isSameOrigin(parsed)) {
    return;
  }
  const pathname = parsed.pathname.toLowerCase();
  if (
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".gif") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".webp") ||
    pathname.endsWith(".avif") ||
    pathname.endsWith(".pdf")
  ) {
    return;
  }
  if (!visitedPages.has(parsed.toString())) {
    pageQueue.push(parsed.toString());
  }
}

function extractSrcsetUrls(srcset, base) {
  for (const part of srcset.split(",")) {
    const [candidate] = part.trim().split(/\s+/);
    if (candidate) {
      addImage(candidate, base);
    }
  }
}

function extractCssUrls(text, base) {
  const urlPattern = /url\((['"]?)(.*?)\1\)/g;
  for (const match of text.matchAll(urlPattern)) {
    const candidate = match[2]?.trim();
    if (!candidate || candidate.startsWith("data:")) {
      continue;
    }
    addImage(candidate, base);
  }
}

function extractHtmlAssets(text, pageUrl) {
  const imgPattern =
    /<(?:img|source)\b[^>]*(?:src|data-src|data-lazy-src)=["']([^"']+)["'][^>]*|<(?:img|source)\b[^>]*srcset=["']([^"']+)["'][^>]*>/gi;
  for (const match of text.matchAll(imgPattern)) {
    if (match[1]) {
      addImage(match[1], pageUrl);
    }
    if (match[2]) {
      extractSrcsetUrls(match[2], pageUrl);
    }
  }

  const stylesheetPattern = /<link\b[^>]*rel=["'][^"']*stylesheet[^"']*["'][^>]*href=["']([^"']+)["']/gi;
  for (const match of text.matchAll(stylesheetPattern)) {
    const parsed = normalizeUrl(match[1], pageUrl);
    if (parsed && isSameOrigin(parsed) && parsed.pathname.endsWith(".css")) {
      visitedCss.add(parsed.toString());
    }
  }

  const inlineCssPattern = /style=["']([^"']+)["']/gi;
  for (const match of text.matchAll(inlineCssPattern)) {
    extractCssUrls(match[1], pageUrl);
  }

  const locPattern = /<loc>(.*?)<\/loc>/gi;
  for (const match of text.matchAll(locPattern)) {
    addPage(match[1], pageUrl);
  }

  const linkPattern = /<a[^>]+href=["']([^"']+)["']/gi;
  for (const match of text.matchAll(linkPattern)) {
    addPage(match[1], pageUrl);
  }
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "tokyo-league-image-export/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return await response.text();
}

async function crawl() {
  while (pageQueue.length > 0) {
    const pageUrl = pageQueue.shift();
    if (!pageUrl || visitedPages.has(pageUrl)) {
      continue;
    }

    visitedPages.add(pageUrl);

    try {
      const text = await fetchText(pageUrl);
      extractHtmlAssets(text, pageUrl);
    } catch (error) {
      console.error(`Skip ${pageUrl}: ${error.message}`);
    }
  }

  for (const cssUrl of [...visitedCss]) {
    try {
      const text = await fetchText(cssUrl);
      extractCssUrls(text, cssUrl);
    } catch (error) {
      console.error(`Skip CSS ${cssUrl}: ${error.message}`);
    }
  }
}

function outputPathForUrl(urlString) {
  const url = new URL(urlString);
  let pathname = url.pathname;

  if (pathname.endsWith("/")) {
    pathname = `${pathname}index`;
  }

  const parsed = path.parse(pathname);
  const filename = parsed.ext ? parsed.base : `${parsed.base || "file"}.bin`;

  return path.join(outputRoot, parsed.dir, filename);
}

async function downloadImage(urlString) {
  const destination = outputPathForUrl(urlString);
  await mkdir(path.dirname(destination), { recursive: true });

  const response = await fetch(urlString, {
    headers: {
      "user-agent": "tokyo-league-image-export/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed ${urlString}: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  await writeFile(destination, Buffer.from(arrayBuffer));
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  await crawl();

  const sortedImages = [...imageUrls].sort();
  const manifest = [];

  for (const imageUrl of sortedImages) {
    try {
      await downloadImage(imageUrl);
      manifest.push({
        url: imageUrl,
        path: path.relative(process.cwd(), outputPathForUrl(imageUrl)),
      });
      console.log(`Downloaded ${imageUrl}`);
    } catch (error) {
      console.error(error.message);
    }
  }

  await writeFile(
    path.join(outputRoot, "manifest.json"),
    JSON.stringify(
      {
        origin,
        imageCount: manifest.length,
        generatedAt: new Date().toISOString(),
        files: manifest,
      },
      null,
      2,
    ),
  );

  console.log(`Saved ${manifest.length} images to ${outputRoot}`);
}

await main();
