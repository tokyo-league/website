import { getAdminScope } from "@/lib/admin-access";
import { getStarTableDivisionById } from "@/lib/standings-star-table-data";
import { renderStandingsStarTableSvg, type StarTableDivision } from "@/lib/standings-star-table";
import { e2eMockCompetition, isE2ETestMode } from "@/lib/test-mode";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    divisionId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const scope = await getAdminScope();
  const { divisionId } = await context.params;

  if (!canEditDivision(scope, divisionId)) {
    return new Response("Forbidden", { status: 403 });
  }

  const division = isE2ETestMode() ? getE2EDivision(divisionId) : await getStarTableDivisionById(divisionId);

  if (!division) {
    return new Response("Not Found", { status: 404 });
  }

  if (division.teams.length === 0) {
    return new Response("No teams", { status: 422 });
  }

  const svg = renderStandingsStarTableSvg(division);
  const filename = `${division.competitionName}-${division.divisionName}-星取表.svg`.replace(/[\\/:*?"<>|]/g, "-");
  const url = new URL(request.url);
  const disposition = url.searchParams.get("download") === "1" ? "attachment" : "inline";

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}

function getE2EDivision(divisionId: string): StarTableDivision | null {
  const division = e2eMockCompetition.divisions.find((item) => item.id === divisionId);

  if (!division) return null;

  return {
    competitionName: e2eMockCompetition.name,
    divisionName: division.name,
    teams: division.teams.map((assignment) => ({
      id: assignment.team.id,
      name: assignment.team.name,
      sortOrder: assignment.sortOrder,
    })),
    matches: division.matches
      .filter((match) => match.status === "PLAYED" && match.homeScore !== null && match.awayScore !== null)
      .map((match) => ({
        id: match.id,
        matchDate: match.matchDate,
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        homeTeamName: match.homeTeam.name,
        awayTeamName: match.awayTeam.name,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
      })),
  };
}

function canEditDivision(scope: Awaited<ReturnType<typeof getAdminScope>>, divisionId: string) {
  return scope.admin.role === "OWNER" || scope.accessibleDivisions.some((division) => division.id === divisionId);
}
