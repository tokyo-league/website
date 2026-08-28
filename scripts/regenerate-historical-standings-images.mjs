import { put } from "@vercel/blob";
import { CompetitionType, MatchStatus, PrismaClient, PublishStatus } from "@prisma/client";
import { renderStandingsStarTableSvg } from "../lib/standings-star-table.ts";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");
const verbose = process.argv.includes("--verbose");
const currentJapanYear = Number(
  new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric" })
    .formatToParts(new Date())
    .find((part) => part.type === "year")?.value,
);

try {
  const divisions = await prisma.division.findMany({
    where: {
      resultImagePath: { not: null },
      competition: {
        competitionType: CompetitionType.LEAGUE,
        season: { year: { lt: currentJapanYear } },
      },
    },
    include: {
      competition: { include: { season: true } },
      teams: {
        include: { team: true },
        orderBy: [{ sortOrder: "asc" }, { team: { name: "asc" } }],
      },
      matches: {
        where: {
          status: MatchStatus.PLAYED,
          homeScore: { not: null },
          awayScore: { not: null },
        },
        include: { homeTeam: true, awayTeam: true },
        orderBy: [{ matchDate: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: [{ competition: { season: { year: "desc" } } }, { competition: { edition: "desc" } }, { sortOrder: "asc" }],
  });

  const eligible = divisions.filter((division) => division.teams.length > 0 && division.matches.length > 0);
  const skipped = divisions.filter((division) => !eligible.includes(division));

  console.log(`${currentJapanYear}年より前の対象: ${eligible.length}件、スキップ: ${skipped.length}件${apply ? "" : "（dry-run）"}`);
  if (verbose) {
    skipped.forEach((division) => {
      console.log(`SKIP ${division.competition.season.year} ${division.competition.name} ${division.name}（チームまたは試合結果なし）`);
    });
  }

  if (!apply) {
    eligible.forEach((division) => {
      console.log(`READY ${division.competition.season.year} ${division.competition.name} ${division.name}`);
    });
    process.exitCode = 0;
  } else {
    for (const division of eligible) {
      const starTableDivision = {
        competitionName: division.competition.name,
        divisionName: division.name,
        applyUnplayedMatchPointsAdjustment: Boolean(division.unplayedMatchPointsAdjustedAt),
        teams: division.teams.map((assignment) => ({
          id: assignment.teamId,
          name: assignment.team.shortName || assignment.team.name,
          sortOrder: assignment.sortOrder,
        })),
        matches: division.matches.map((match) => ({
          id: match.id,
          matchDate: match.matchDate,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          homeTeamName: match.homeTeam.shortName || match.homeTeam.name,
          awayTeamName: match.awayTeam.shortName || match.awayTeam.name,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
        })),
      };
      const safeName = `${division.competition.name}-${division.name}-star-table.svg`
        .replace(/[\\/:*?"<>|]/g, "-")
        .replace(/[^a-zA-Z0-9._\-\u3040-\u30ff\u3400-\u9fff]/g, "-");
      const blob = await put(
        `results/${Date.now()}-${safeName}`,
        new Blob([renderStandingsStarTableSvg(starTableDivision)], { type: "image/svg+xml;charset=utf-8" }),
        { access: "public", addRandomSuffix: true, contentType: "image/svg+xml;charset=utf-8" },
      );

      await prisma.division.update({
        where: { id: division.id },
        data: {
          resultImagePath: blob.url,
          status: PublishStatus.PUBLISHED,
          lastUpdatedAt: new Date(),
        },
      });
      console.log(`UPDATED ${division.competition.season.year} ${division.competition.name} ${division.name}`);
    }
  }
} finally {
  await prisma.$disconnect();
}
