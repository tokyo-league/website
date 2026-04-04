import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { PrismaClient, CompetitionStatus, CompetitionType, PublishStatus } from "@prisma/client";

const prisma = new PrismaClient();

const SITE_URL = "https://tokyo-league.jp";
const GAME_URL = `${SITE_URL}/game/`;
const POSTS_API = `${SITE_URL}/wp-json/wp/v2/posts`;
const LEAGUE_API = `${SITE_URL}/wp-json/wp/v2/league`;
const CAT_LEAGUE_API = `${SITE_URL}/wp-json/wp/v2/cat_league`;

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

const teamAliases = new Map([
  ["fc熊野", "FC 熊野"],
  ["fc熊野jr", "FC 熊野"],
  ["ksc加平sss", "KSC加平"],
  ["千寿常東fc", "千寿常東小学校フットボールクラブ"],
  ["千寿常東小学校fc", "千寿常東小学校フットボールクラブ"],
  ["暁星アストラjr", "暁星アストラジュニア"],
  ["暁星アストラジュニア", "暁星アストラジュニア"],
  ["東調布第一fc", "東調布第一フットボールクラブ"],
  ["boaスポーツclub", "BOA-SPORTS-CLUB"],
  ["boasportsclub", "BOA-SPORTS-CLUB"],
  ["南綾瀬fc", "南綾瀬FC"],
  ["杉並シダーズ", "杉並シーダーズ"],
  ["杉並シーダーズ", "杉並シーダーズ"],
  ["日本橋fcソレイユ", "日本橋FCソレイユ"],
  ["日本橋fcソレイユjr", "日本橋FCソレイユ"],
  ["東加平キッカーズ", "東加平キッカーズ"],
]);

const owner = await prisma.user.findFirst({
  where: { role: "OWNER" },
  orderBy: { createdAt: "asc" },
});

if (!owner) {
  console.error("Owner user not found.");
  process.exit(1);
}

const newsCategory = await prisma.newsCategory.upsert({
  where: { slug: "news" },
  update: { name: "ニュース", sortOrder: 0 },
  create: { name: "ニュース", slug: "news", sortOrder: 0 },
});

const existingTeams = await prisma.team.findMany({
  select: { id: true, name: true },
});

const teamIndex = new Map(existingTeams.map((team) => [normalizeTeamName(team.name), team]));

const leagueCategories = await fetchJson(`${CAT_LEAGUE_API}?per_page=100&_fields=id,count,name,parent,slug`);
const leagueHistory = leagueCategories.filter((item) => /^第\d+回東京リーグ$/.test(item.name) && item.count > 0);

const importedNews = await importNews();
const leagueResult = await importLeagueHistory(leagueHistory);
const santoResult = await importSantoCup();

console.log(JSON.stringify({ importedNews, ...leagueResult, ...santoResult }, null, 2));

await prisma.$disconnect();

async function importNews() {
  const posts = await fetchPaginatedJson(
    `${POSTS_API}?per_page=100&_fields=id,date,slug,link,title,excerpt,content,categories`,
  );

  let count = 0;

  for (const post of posts) {
    const title = sanitizeText(post.title?.rendered ?? "");
    const body = htmlToPlainText(post.content?.rendered ?? "");
    const excerpt = htmlToPlainText(post.excerpt?.rendered ?? "").slice(0, 240);

    if (!title || !body) {
      continue;
    }

    await prisma.newsPost.upsert({
      where: { slug: buildNewsSlug(post) },
      update: {
        title,
        excerpt: excerpt || null,
        body,
        categoryId: newsCategory.id,
        status: PublishStatus.PUBLISHED,
        publishedAt: new Date(post.date),
        updatedById: owner.id,
      },
      create: {
        slug: buildNewsSlug(post),
        title,
        excerpt: excerpt || null,
        body,
        categoryId: newsCategory.id,
        status: PublishStatus.PUBLISHED,
        publishedAt: new Date(post.date),
        createdById: owner.id,
        updatedById: owner.id,
      },
    });

    count += 1;
  }

  return count;
}

async function importLeagueHistory(categories) {
  let competitionCount = 0;
  let divisionCount = 0;
  const unmatchedTeams = [];

  for (const category of categories) {
    const edition = parseEdition(category.name);

    if (!edition) {
      continue;
    }

    const seasonYear = getLeagueSeasonYear(edition);
    const seasonLabel = `${seasonYear}年度`;

    const season = await prisma.season.upsert({
      where: { year: seasonYear },
      update: { label: seasonLabel },
      create: { year: seasonYear, label: seasonLabel, isCurrent: false },
    });

    const competition = await prisma.competition.upsert({
      where: { slug: `tokyo-league-${edition}` },
      update: {
        seasonId: season.id,
        name: `第${edition}回 東京リーグ`,
        competitionType: CompetitionType.LEAGUE,
        edition,
        status: edition >= 103 ? CompetitionStatus.PUBLISHED : CompetitionStatus.CLOSED,
        sourceUrl: GAME_URL,
        updatedById: owner.id,
      },
      create: {
        seasonId: season.id,
        name: `第${edition}回 東京リーグ`,
        slug: `tokyo-league-${edition}`,
        competitionType: CompetitionType.LEAGUE,
        edition,
        status: edition >= 103 ? CompetitionStatus.PUBLISHED : CompetitionStatus.CLOSED,
        sourceUrl: GAME_URL,
        createdById: owner.id,
        updatedById: owner.id,
      },
    });

    competitionCount += 1;

    const leaguePosts = await fetchPaginatedJson(
      `${LEAGUE_API}?per_page=100&cat_league=${category.id}&_fields=id,slug,link,title`,
    );

    for (const [index, post] of leaguePosts.entries()) {
      const html = await fetchText(post.link);
      const parsed = parseLeaguePage(html);
      const name = sanitizeText(parsed.title || post.title?.rendered || "");
      const division = await prisma.division.upsert({
        where: {
          competitionId_slug: {
            competitionId: competition.id,
            slug: slugify(name || `division-${index + 1}`),
          },
        },
        update: {
          name,
          description: parsed.note || null,
          sourceUrl: post.link,
          resultImagePath: resolveLocalAsset(parsed.resultImageSrc),
          sortOrder: index + 1,
          status: PublishStatus.PUBLISHED,
        },
        create: {
          competitionId: competition.id,
          name,
          slug: slugify(name || `division-${index + 1}`),
          description: parsed.note || null,
          sourceUrl: post.link,
          resultImagePath: resolveLocalAsset(parsed.resultImageSrc),
          sortOrder: index + 1,
          status: PublishStatus.PUBLISHED,
        },
      });

      divisionCount += 1;

      if (parsed.teams.length > 0) {
        const matchedTeams = [];

        for (const [teamIndexPosition, teamName] of parsed.teams.entries()) {
          const matchedTeam = findTeam(teamName);

          if (!matchedTeam) {
            unmatchedTeams.push({
              competition: competition.name,
              division: division.name,
              teamName,
            });
            continue;
          }

          matchedTeams.push({
            divisionId: division.id,
            teamId: matchedTeam.id,
            sortOrder: teamIndexPosition + 1,
          });
        }

        await prisma.divisionTeam.deleteMany({
          where: { divisionId: division.id },
        });

        if (matchedTeams.length > 0) {
          await prisma.divisionTeam.createMany({
            data: matchedTeams,
            skipDuplicates: true,
          });
        }
      }
    }
  }

  return {
    importedCompetitions: competitionCount,
    importedDivisions: divisionCount,
    unmatchedTeams,
  };
}

async function importSantoCup() {
  const gameHtml = await fetchText(GAME_URL);
  const santoMatches = [...gameHtml.matchAll(/<h3>(\d{4})年 山藤杯<\/h3>\s*<div class="santo_link">\s*<a href="([^"]+)"/g)];
  let competitionCount = 0;

  await mkdir(path.resolve("public/site-assets/documents/santo"), { recursive: true });

  for (const match of santoMatches) {
    const year = Number(match[1]);
    const detailUrl = new URL(match[2], SITE_URL).toString();
    const detailHtml = await fetchText(detailUrl);
    const pdfMatch = detailHtml.match(/<a href="([^"]+\.pdf)"[^>]*>試合情報を見る<\/a>/);
    const imageMatch = detailHtml.match(/<div class="chart">[\s\S]*?<img src="([^"]+)"/);
    const pdfUrl = pdfMatch ? new URL(pdfMatch[1], SITE_URL).toString() : null;
    const season = await prisma.season.upsert({
      where: { year },
      update: { label: `${year}年度` },
      create: { year, label: `${year}年度`, isCurrent: false },
    });

    let resultFilePath = null;

    if (pdfUrl) {
      const fileName = `santo-${year}.pdf`;
      const outputPath = path.resolve("public/site-assets/documents/santo", fileName);
      const bytes = await fetchArrayBuffer(pdfUrl);
      await writeFile(outputPath, Buffer.from(bytes));
      resultFilePath = `/site-assets/documents/santo/${fileName}`;
    } else if (imageMatch?.[1]) {
      resultFilePath = resolveLocalAsset(imageMatch[1]);
    }

    await prisma.competition.upsert({
      where: { slug: `santo-${year}` },
      update: {
        seasonId: season.id,
        name: "5年生FES 山藤杯",
        competitionType: CompetitionType.CUP,
        summary: `${year}年大会`,
        sourceUrl: detailUrl,
        resultFilePath,
        status: CompetitionStatus.CLOSED,
        updatedById: owner.id,
      },
      create: {
        seasonId: season.id,
        name: "5年生FES 山藤杯",
        slug: `santo-${year}`,
        competitionType: CompetitionType.CUP,
        summary: `${year}年大会`,
        sourceUrl: detailUrl,
        resultFilePath,
        status: CompetitionStatus.CLOSED,
        createdById: owner.id,
        updatedById: owner.id,
      },
    });

    competitionCount += 1;
  }

  return {
    importedSantoCompetitions: competitionCount,
  };
}

function parseLeaguePage(html) {
  const title = sanitizeText(html.match(/<div class="title">\s*<h2>(.*?)<\/h2>/)?.[1] ?? "");
  const teamMatches = [...html.matchAll(/<div class="team_table">[\s\S]*?<ul>([\s\S]*?)<\/ul>/g)];
  const teamListBlock = teamMatches[0]?.[1] ?? "";
  const teams = [...teamListBlock.matchAll(/<li>(.*?)<\/li>/g)].map((match) => sanitizeText(match[1]));
  const resultImageSrc = html.match(/<div class="chart">[\s\S]*?<img src="([^"]+)"/)?.[1] ?? null;
  const noteText = sanitizeText(
    html
      .match(/<div class="info">\s*<h4>第\d+回東京リーグ<\/h4>([\s\S]*?)<\/div>/)?.[1]
      ?.replace(/<div class="team_table">[\s\S]*$/, "") ?? "",
  );

  return {
    title,
    teams,
    resultImageSrc,
    note: noteText || null,
  };
}

function parseEdition(name) {
  const match = name.match(/^第(\d+)回東京リーグ$/);
  return match ? Number(match[1]) : null;
}

function getLeagueSeasonYear(edition) {
  if (edition >= 91) {
    return 2020 + Math.floor((edition - 91) / 2);
  }

  return edition + 1929;
}

function buildNewsSlug(post) {
  return `news-${post.id}`;
}

function slugify(value) {
  const normalized = value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{Letter}\p{Number}-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "item";
}

function sanitizeText(value) {
  return decodeHtmlEntities(stripTags(value))
    .replace(/\s+/g, " ")
    .trim();
}

function htmlToPlainText(value) {
  return decodeHtmlEntities(
    value
      .replace(/<\/p>/g, "\n\n")
      .replace(/<br\s*\/?>/g, "\n")
      .replace(/<\/li>/g, "\n")
      .replace(/<li>/g, "・"),
  )
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripTags(value) {
  return String(value).replace(/<[^>]+>/g, "");
}

function decodeHtmlEntities(value) {
  return String(value)
    .replace(/&#8217;/g, "’")
    .replace(/&#038;/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function resolveLocalAsset(src) {
  if (!src) {
    return null;
  }

  const url = new URL(src, SITE_URL);
  const key = url.pathname.replace(/^\//, "");
  return assetMap.get(key) ?? null;
}

function normalizeTeamName(value) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s　]/g, "")
    .replace(/[・･／/\\\-‐―ー_.'’`]/g, "")
    .replace(/フットボールクラブ/g, "fc")
    .replace(/フットボール/g, "")
    .replace(/サッカースポーツ少年団/g, "sc")
    .replace(/サッカークラブ/g, "sc")
    .replace(/サッカー/g, "")
    .replace(/小学校/g, "")
    .replace(/ジュニア/g, "jr")
    .replace(/クラブ/g, "club");
}

function findTeam(name) {
  const normalized = normalizeTeamName(name);
  const aliasedName = teamAliases.get(normalized);

  if (aliasedName) {
    return existingTeams.find((team) => team.name === aliasedName) ?? null;
  }

  return teamIndex.get(normalized) ?? null;
}

async function fetchPaginatedJson(baseUrl) {
  const first = await fetch(baseUrl, { signal: AbortSignal.timeout(20000) });
  const totalPages = Number(first.headers.get("x-wp-totalpages") || "1");
  const data = [await first.json()];

  for (let page = 2; page <= totalPages; page += 1) {
    const response = await fetch(`${baseUrl}&page=${page}`, { signal: AbortSignal.timeout(20000) });
    data.push(await response.json());
  }

  return data.flat();
}

async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  return response.text();
}

async function fetchArrayBuffer(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  return response.arrayBuffer();
}
