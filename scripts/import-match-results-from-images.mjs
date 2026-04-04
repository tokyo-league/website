import { writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { PrismaClient, CompetitionType, MatchStatus, PublishStatus } from "@prisma/client";

const prisma = new PrismaClient();
const execFileAsync = promisify(execFile);
const SITE_URL = "https://tokyo-league.jp";
const limit = Number(process.env.IMPORT_RESULTS_LIMIT || "0");
const offset = Number(process.env.IMPORT_RESULTS_OFFSET || "0");

const teamAliases = new Map([
  ["ＫＳＣ加平ＳＳＳ", "KSC加平SSS"],
  ["スポーカル六本木", "スポーカル六本木SC"],
  ["ＢＯＡ ＳＰＯＲＴＳ ＣＬＵＢ", "BOA SPORTS CLUB"],
  ["暁星アストラ・ジュニア", "暁星アストラ・ジュニア"],
  ["クリアージュＦＣロッキー/レグルス", "クリアージュFCロッキー/レグルス"],
  ["クリアージュＦＣジュニア", "クリアージュFCジュニア"],
  ["ジュニアコスモス城北", "ジュニアコスモス城北"],
]);

const owner = await prisma.user.findFirst({
  where: { role: "OWNER" },
  orderBy: { createdAt: "asc" },
});

if (!owner) {
  console.error("Owner user not found.");
  process.exit(1);
}

const existingTeams = await prisma.team.findMany({
  select: { id: true, name: true },
});
const teamIndex = new Map(existingTeams.map((team) => [normalizeTeamName(team.name), team]));

let divisions = await prisma.division.findMany({
  where: {
    competition: { competitionType: CompetitionType.LEAGUE },
    resultImagePath: { startsWith: "/site-assets/results/" },
    sourceUrl: { not: null },
  },
  include: {
    competition: { include: { season: true } },
  },
  orderBy: [
    { competition: { season: { year: "desc" } } },
    { competition: { edition: "desc" } },
    { sortOrder: "asc" },
  ],
});

if (limit > 0 || offset > 0) {
  divisions = divisions.slice(offset, limit > 0 ? offset + limit : undefined);
}

const jobs = [];

for (const division of divisions) {
  console.log(`Preparing ${division.competition.name} ${division.name}`);
  const html = await fetch(division.sourceUrl, { signal: AbortSignal.timeout(20000) }).then((response) => response.text());
  const teams = parseLeagueTeams(html).map(resolveTeamName).filter(Boolean);

  if (teams.length < 4) {
    continue;
  }

  jobs.push({
    divisionId: division.id,
    imagePath: path.resolve("public", division.resultImagePath.slice(1)),
    teams,
  });
}

const jobFile = path.resolve(".swift-module-cache", `ocr-jobs-${Date.now()}.json`);
await writeFile(jobFile, JSON.stringify(jobs, null, 2), "utf8");

const { stdout, stderr } = await execFileAsync("python3", ["./scripts/ocr_result_tables.py", jobFile], {
  cwd: process.cwd(),
  maxBuffer: 20 * 1024 * 1024,
});

if (stderr) {
  console.error(stderr);
}

const results = JSON.parse(stdout);
const importSummary = [];

for (const entry of results) {
  const division = divisions.find((item) => item.id === entry.divisionId);
  console.log(`Importing ${division?.competition.name ?? entry.divisionId} ${division?.name ?? ""}`);

  if (!division || !entry.result?.ok) {
    importSummary.push({
      divisionId: entry.divisionId,
      ok: false,
      error: entry.result?.error ?? "division not found",
    });
    continue;
  }

  const teamRecords = [];

  for (const [index, teamName] of entry.result.standings.map((item) => item.teamName).entries()) {
    const team = await findOrCreateTeam(teamName);
    teamRecords.push({ team, sortOrder: index + 1 });
  }

  await prisma.$transaction([
    prisma.division.update({
      where: { id: division.id },
      data: {
        status: PublishStatus.PUBLISHED,
        lastUpdatedAt: new Date(),
      },
    }),
    prisma.divisionTeam.deleteMany({ where: { divisionId: division.id } }),
    prisma.match.deleteMany({ where: { divisionId: division.id } }),
    prisma.standing.deleteMany({ where: { divisionId: division.id } }),
  ]);

  if (teamRecords.length > 0) {
    await prisma.divisionTeam.createMany({
      data: teamRecords.map((item) => ({
        divisionId: division.id,
        teamId: item.team.id,
        sortOrder: item.sortOrder,
      })),
      skipDuplicates: true,
    });
  }

  for (const match of entry.result.matches) {
    const homeTeam = await findOrCreateTeam(match.homeTeamName);
    const awayTeam = await findOrCreateTeam(match.awayTeamName);

    await prisma.match.create({
      data: {
        divisionId: division.id,
        matchDate: buildSeasonDate(division.competition.season.year),
        homeTeamId: homeTeam.id,
        awayTeamId: awayTeam.id,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        status: MatchStatus.PLAYED,
        note: "過去結果画像OCR取り込み",
        createdById: owner.id,
        updatedById: owner.id,
      },
    });
  }

  const normalizedStandings = [...entry.result.standings]
    .sort((left, right) => {
      if (right.points !== left.points) return right.points - left.points;
      if (right.goalDifference !== left.goalDifference) return right.goalDifference - left.goalDifference;
      if (right.goalsFor !== left.goalsFor) return right.goalsFor - left.goalsFor;
      return left.teamName.localeCompare(right.teamName, "ja");
    })
    .map((standing, index) => ({
      ...standing,
      rank: index + 1,
    }));

  for (const standing of normalizedStandings) {
    const team = await findOrCreateTeam(standing.teamName);

    await prisma.standing.create({
      data: {
        divisionId: division.id,
        teamId: team.id,
        rank: standing.rank,
        played: standing.played,
        won: standing.won,
        drawn: standing.drawn,
        lost: standing.lost,
        goalsFor: standing.goalsFor,
        goalsAgainst: standing.goalsAgainst,
        goalDifference: standing.goalDifference,
        points: standing.points,
      },
    });
  }

  importSummary.push({
    division: `${division.competition.name} ${division.name}`,
    ok: true,
    matches: entry.result.matches.length,
    standings: entry.result.standings.length,
  });
}

await unlink(jobFile).catch(() => {});
console.log(JSON.stringify(importSummary, null, 2));
await prisma.$disconnect();

function parseLeagueTeams(html) {
  const teamBlock = html.match(/<div class="team_table">[\s\S]*?<ul>([\s\S]*?)<\/ul>/)?.[1] ?? "";
  return [...teamBlock.matchAll(/<li>(.*?)<\/li>/g)]
    .map((match) =>
      String(match[1])
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
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

function resolveTeamName(teamName) {
  return teamAliases.get(teamName) ?? teamName;
}

async function findOrCreateTeam(name) {
  const normalized = normalizeTeamName(name);
  const exact = teamIndex.get(normalized);

  if (exact) {
    return exact;
  }

  const created = await prisma.team.upsert({
    where: { name },
    update: {},
    create: {
      name,
      slug: slugify(`${name}-${randomUUID().slice(0, 8)}`),
      status: PublishStatus.ARCHIVED,
      sortOrder: 9999,
      profile: "過去大会OCR取り込み用の仮登録チームです。",
    },
    select: { id: true, name: true },
  });

  existingTeams.push(created);
  teamIndex.set(normalized, created);

  return created;
}

function slugify(value) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{Letter}\p{Number}-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "item";
}

function buildSeasonDate(year) {
  return new Date(`${Math.min(year, 2026)}-01-01T00:00:00.000Z`);
}
