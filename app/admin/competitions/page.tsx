import { AdminLayoutShell } from "@/components/admin-layout-shell";
import { AdminCompetitionForms } from "@/components/admin-competition-forms";
import { getAdminScope } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";

export default async function AdminCompetitionsPage() {
  const scope = await getAdminScope();
  const [seasons, competitions] = await Promise.all([
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
    prisma.competition.findMany({
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
  ]);
  const activeCompetitions = competitions.filter((competition) => competition.status !== "CLOSED");
  const closedCompetitionCount = competitions.length - activeCompetitions.length;

  return (
    <AdminLayoutShell currentPath="/admin/competitions" title="大会管理" kicker="Competition" scope={scope}>
      {scope.admin.role === "OWNER" ? (
        <AdminCompetitionForms
          seasons={seasons.map((season) => ({
            id: season.id,
            year: season.year,
            label: season.label,
            isCurrent: season.isCurrent,
            competitionCount: season._count.competitions,
          }))}
          activeCompetitions={activeCompetitions.map(toCompetitionOption)}
          closedCompetitionCount={closedCompetitionCount}
          totalCompetitionCount={competitions.length}
        />
      ) : null}
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
