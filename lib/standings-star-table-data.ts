import { MatchStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { StarTableDivision } from "@/lib/standings-star-table";

export async function getStarTableDivisionById(divisionId: string): Promise<StarTableDivision | null> {
  const division = await prisma.division.findUnique({
    where: { id: divisionId },
    include: {
      competition: true,
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
        include: {
          homeTeam: true,
          awayTeam: true,
        },
        orderBy: [{ matchDate: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!division) return null;

  return {
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
}
