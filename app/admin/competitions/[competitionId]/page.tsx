import { notFound } from "next/navigation";
import { AdminLayoutShell } from "@/components/admin-layout-shell";
import { AdminCompetitionEditForms } from "@/components/admin-competition-forms";
import { requireOwner } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";

export default async function AdminCompetitionEditPage({
  params,
}: {
  params: Promise<{ competitionId: string }>;
}) {
  const scope = await requireOwner();
  const { competitionId } = await params;
  const [seasons, competition, leagueCompetitions, divisions, teams, divisionTeams] = await Promise.all([
    prisma.season.findMany({
      include: {
        _count: {
          select: {
            competitions: true,
          },
        },
      },
      orderBy: [{ year: "desc" }],
    }),
    prisma.competition.findUnique({
      where: { id: competitionId },
      include: {
        season: true,
        _count: {
          select: {
            divisions: true,
            files: true,
            newsPosts: true,
          },
        },
      },
    }),
    prisma.competition.findMany({
      where: {
        competitionType: "LEAGUE",
      },
      include: {
        season: true,
        _count: {
          select: {
            divisions: true,
            files: true,
            newsPosts: true,
          },
        },
      },
      orderBy: [{ season: { year: "desc" } }, { sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.division.findMany({
      where: {
        competitionId,
      },
      include: {
        competition: {
          include: {
            season: true,
          },
        },
        _count: {
          select: {
            teams: true,
            matches: true,
            standings: true,
            editorAssignments: true,
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.team.findMany({
      where: {
        status: "PUBLISHED",
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.divisionTeam.findMany({
      where: {
        division: {
          competitionId,
        },
      },
      include: {
        division: true,
        team: true,
      },
      orderBy: [{ division: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    }),
  ]);

  if (!competition) {
    notFound();
  }

  return (
    <AdminLayoutShell currentPath="/admin/competitions" title={competition.name} kicker="Competition" scope={scope}>
      <AdminCompetitionEditForms
        seasons={seasons.map((season) => ({
          id: season.id,
          year: season.year,
          label: season.label,
          isCurrent: season.isCurrent,
          competitionCount: season._count.competitions,
        }))}
        competition={toCompetitionOption(competition)}
        leagueCompetitions={leagueCompetitions.map(toCompetitionOption)}
        divisions={divisions.map((division) => ({
          id: division.id,
          competitionId: division.competitionId,
          name: division.name,
          slug: division.slug,
          competitionLabel: `${division.competition.season.label} / ${division.competition.name}`,
          description: division.description ?? "",
          status: division.status,
          sortOrder: division.sortOrder,
          teamCount: division._count.teams,
          matchCount: division._count.matches,
          standingCount: division._count.standings,
          assignmentCount: division._count.editorAssignments,
        }))}
        teams={teams.map((team) => ({
          id: team.id,
          name: team.name,
          region: team.region,
        }))}
        divisionTeams={divisionTeams.map((assignment) => ({
          id: assignment.id,
          divisionLabel: assignment.division.name,
          teamName: assignment.team.name,
          region: assignment.team.region,
        }))}
      />
    </AdminLayoutShell>
  );
}

function toCompetitionOption(competition: {
  id: string;
  seasonId: string;
  name: string;
  slug: string;
  season: { label: string };
  competitionType: "LEAGUE" | "CUP" | "OTHER";
  edition: number | null;
  summary: string | null;
  resultFilePath: string | null;
  startDate: Date | null;
  endDate: Date | null;
  publishedAt: Date | null;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  sortOrder: number;
  _count: {
    divisions: number;
    files: number;
    newsPosts: number;
  };
}) {
  return {
    id: competition.id,
    seasonId: competition.seasonId,
    name: competition.name,
    slug: competition.slug,
    seasonLabel: competition.season.label,
    competitionType: competition.competitionType,
    edition: competition.edition,
    summary: competition.summary ?? "",
    resultFilePath: competition.resultFilePath ?? "",
    startDate: formatDateInput(competition.startDate),
    endDate: formatDateInput(competition.endDate),
    publishedAt: formatDateInput(competition.publishedAt),
    status: competition.status,
    sortOrder: competition.sortOrder,
    divisionCount: competition._count.divisions,
    fileCount: competition._count.files,
    newsPostCount: competition._count.newsPosts,
  };
}

function formatDateInput(date: Date | null) {
  if (!date) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day ? `${year}-${month}-${day}` : "";
}
