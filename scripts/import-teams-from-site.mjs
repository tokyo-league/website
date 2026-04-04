import { readFile } from "node:fs/promises";
import process from "node:process";
import { PrismaClient } from "@prisma/client";

const TEAM_URL = "https://tokyo-league.jp/team/";
const prisma = new PrismaClient();

const manifest = JSON.parse(
  await readFile(new URL("../public/site-assets/manifest.json", import.meta.url), "utf8"),
);

const assetMap = new Map();

for (const file of manifest.files) {
  assetMap.set(file.source, file.output.replace(/^public/, ""));

  for (const variant of file.variants ?? []) {
    assetMap.set(variant, file.output.replace(/^public/, ""));
  }
}

function resolveLocalAsset(src) {
  if (!src) return null;

  try {
    const url = new URL(src, TEAM_URL);
    const key = url.pathname.replace(/^\//, "");

    return assetMap.get(key) ?? null;
  } catch {
    return null;
  }
}

function normalizeText(value) {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;/g, "’")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractField(block, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = block.match(new RegExp(`<dt>${escaped}<\\/dt>\\s*<dd>([\\s\\S]*?)<\\/dd>`));

  if (!match) return "";

  return normalizeText(match[1]);
}

const html = await fetch(TEAM_URL).then((response) => response.text());
const boxChunks = html
  .split('<div class="box">')
  .slice(1)
  .map((chunk) => chunk.split('<div class="box">')[0])
  .filter((chunk) => chunk.includes("<h3>"));

let imported = 0;

for (const [index, block] of boxChunks.entries()) {
  const headingMatch = block.match(/<h3>(.*?)<span>(.*?)<\/span><\/h3>/);

  if (!headingMatch) {
    continue;
  }

  const name = normalizeText(headingMatch[1]);
  const region = normalizeText(headingMatch[2]);
  const imageMatches = [...block.matchAll(/<img[^>]+src="([^"]+)"/g)].map((match) => match[1]);
  const logoPath = resolveLocalAsset(imageMatches[0]);
  const photoPath = resolveLocalAsset(imageMatches[1]);
  const founded = extractField(block, "結成");
  const representativeName = extractField(block, "代表者");
  const headCoachName = extractField(block, "監督");
  const websiteUrl = block.match(/<dt>URL<\/dt>\s*<dd>\s*<a href="([^"]+)"/)?.[1] ?? "";

  const existing = await prisma.team.findUnique({
    where: { name },
    select: { id: true, slug: true },
  });

  await prisma.team.upsert({
    where: { name },
    update: {
      region: region || null,
      founded: founded || null,
      representativeName: representativeName || null,
      headCoachName: headCoachName || null,
      websiteUrl:
        websiteUrl && websiteUrl !== "ー" && websiteUrl !== "-" ? websiteUrl : null,
      logoPath,
      photoPath,
      status: "PUBLISHED",
      sortOrder: index + 1,
    },
    create: {
      name,
      slug: existing?.slug ?? `team-${String(index + 1).padStart(3, "0")}`,
      region: region || null,
      founded: founded || null,
      representativeName: representativeName || null,
      headCoachName: headCoachName || null,
      websiteUrl:
        websiteUrl && websiteUrl !== "ー" && websiteUrl !== "-" ? websiteUrl : null,
      logoPath,
      photoPath,
      status: "PUBLISHED",
      sortOrder: index + 1,
    },
  });

  imported += 1;
}

console.log(`Imported teams: ${imported}`);

await prisma.$disconnect();
