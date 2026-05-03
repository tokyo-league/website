import { AdminLayoutShell } from "@/components/admin-layout-shell";
import { AdminCompetitionForms } from "@/components/admin-competition-forms";
import { getAdminScope } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";

export default async function AdminCompetitionsPage() {
  const scope = await getAdminScope();
  const [seasons, competitions, divisions, teams, divisionTeams] = await Promise.all([
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
    prisma.division.findMany({
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
      orderBy: [{ competition: { season: { year: "desc" } } }, { competition: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    }),
    prisma.team.findMany({
      where: {
        status: "PUBLISHED",
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.divisionTeam.findMany({
      include: {
        division: {
          include: {
            competition: {
              include: {
                season: true,
              },
            },
          },
        },
        team: true,
      },
      orderBy: [
        { division: { competition: { season: { year: "desc" } } } },
        { division: { competition: { sortOrder: "asc" } } },
        { division: { sortOrder: "asc" } },
        { sortOrder: "asc" },
      ],
    }),
  ]);

  return (
    <AdminLayoutShell
      currentPath="/admin/competitions"
      title="大会管理"
      kicker="Competition"
      scope={scope}
    >
      {scope.admin.role === "OWNER" ? (
        <AdminCompetitionForms
          seasons={seasons.map((season) => ({
            id: season.id,
            year: season.year,
            label: season.label,
            isCurrent: season.isCurrent,
            competitionCount: season._count.competitions,
          }))}
          competitions={competitions.map((competition) => ({
            id: competition.id,
            seasonId: competition.seasonId,
            name: competition.name,
            slug: competition.slug,
            seasonLabel: competition.season.label,
            competitionType: competition.competitionType,
            edition: competition.edition,
            summary: competition.summary ?? "",
            startDate: formatDateInput(competition.startDate),
            endDate: formatDateInput(competition.endDate),
            publishedAt: formatDateInput(competition.publishedAt),
            status: competition.status,
            sortOrder: competition.sortOrder,
            divisionCount: competition._count.divisions,
            fileCount: competition._count.files,
            newsPostCount: competition._count.newsPosts,
          }))}
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
            divisionLabel: `${assignment.division.competition.season.label} / ${assignment.division.competition.name} / ${assignment.division.name}`,
            teamName: assignment.team.name,
            region: assignment.team.region,
          }))}
        />
      ) : null}

      <article className="admin-card">
        <h3>大会運用メモ</h3>
        <ul className="admin-list">
          <li>
            <strong>東京リーグ</strong>
            <span>年度ごとに大会を作成し、その配下へ A〜F リーグと所属チームを追加</span>
          </li>
          <li>
            <strong>5年生FES 山藤杯</strong>
            <span>1大会として管理し、結果は年ごとの画像または PDF を紐づけます</span>
          </li>
          <li>
            <strong>表示方針</strong>
            <span>大会一覧を主に見せ、リーグ所属チームや担当権限は必要画面でのみ確認する運用に寄せます</span>
          </li>
        </ul>
      </article>

      <article className="admin-card">
        <div className="card__header">
          <div>
            <p className="section-kicker">Master</p>
            <h3>登録済み大会一覧</h3>
          </div>
        </div>
        <div className="admin-table">
          <div className="admin-table__row admin-table__row--head admin-table__row--five">
            <span>年度</span>
            <span>大会名</span>
            <span>種別</span>
            <span>状態</span>
            <span>リーグ数</span>
          </div>
          {competitions.length > 0 ? (
            competitions.map((competition) => (
              <div key={competition.id} className="admin-table__row admin-table__row--five">
                <strong>{competition.season.label}</strong>
                <span>{competition.name}</span>
                <span>{competitionTypeLabel[competition.competitionType]}</span>
                <span>{competitionStatusLabel[competition.status]}</span>
                <span>{competition._count.divisions}件</span>
              </div>
            ))
          ) : (
            <div className="admin-empty-state">
              <p>まだ大会は登録されていません。</p>
            </div>
          )}
        </div>
      </article>

    </AdminLayoutShell>
  );
}

const competitionTypeLabel = {
  LEAGUE: "東京リーグ向け",
  CUP: "5年生FES 山藤杯向け",
  OTHER: "その他",
} as const;

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

const competitionStatusLabel = {
  DRAFT: "下書き",
  PUBLISHED: "公開",
  CLOSED: "終了",
} as const;
