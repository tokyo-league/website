import { AdminLayoutShell } from "@/components/admin-layout-shell";
import { AdminCompetitionForms } from "@/components/admin-competition-forms";
import { getAdminScope } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";

export default async function AdminCompetitionsPage() {
  const scope = await getAdminScope();
  const [seasons, competitions, divisions, teams, divisionTeams] = await Promise.all([
    prisma.season.findMany({
      orderBy: [{ year: "desc" }],
    }),
    prisma.competition.findMany({
      include: {
        season: true,
        divisions: true,
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
      },
      orderBy: [{ competition: { season: { year: "desc" } } }, { competition: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    }),
    prisma.team.findMany({
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
          }))}
          competitions={competitions.map((competition) => ({
            id: competition.id,
            name: competition.name,
            seasonLabel: competition.season.label,
            competitionType: competition.competitionType,
          }))}
          divisions={divisions.map((division) => ({
            id: division.id,
            name: division.name,
            competitionLabel: `${division.competition.season.label} / ${division.competition.name}`,
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

      <div className="admin-columns">
        <article className="admin-card">
          <div className="card__header">
            <div>
              <p className="section-kicker">Current</p>
              <h3>{scope.admin.role === "OWNER" ? "公開中のリーグ" : "担当リーグ"}</h3>
            </div>
          </div>
          <div className="admin-table">
            <div className="admin-table__row admin-table__row--head">
              <span>リーグ</span>
              <span>大会</span>
              <span>権限</span>
            </div>
            {scope.accessibleDivisions.length > 0 ? (
              scope.accessibleDivisions.map((division) => (
                <div key={division.id} className="admin-table__row">
                  <strong>{division.name}</strong>
                  <span>{division.competitionName}</span>
                  <span>{division.permissions.join(" / ")}</span>
                </div>
              ))
            ) : (
              <div className="admin-empty-state">
                <p>担当リーグがまだ割り当てられていません。</p>
              </div>
            )}
          </div>
        </article>

        <article className="admin-card">
          <h3>大会運用メモ</h3>
          <ul className="admin-list">
            <li>
              <strong>東京リーグ</strong>
              <span>年度ごとに大会を作成し、その配下へ A〜F リーグと所属チームを追加</span>
            </li>
            <li>
              <strong>5年生FES 山藤杯</strong>
              <span>1大会として管理し、結果は PDF 掲載中心</span>
            </li>
            <li>
              <strong>試合結果</strong>
              <span>東京リーグは画像中心、補助でスコア入力と勝敗表生成に対応予定</span>
            </li>
          </ul>
        </article>
      </div>

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
                <span>{competition.divisions.length}件</span>
              </div>
            ))
          ) : (
            <div className="admin-empty-state">
              <p>まだ大会は登録されていません。</p>
            </div>
          )}
        </div>
      </article>

      <article className="admin-card">
        <div className="card__header">
          <div>
            <p className="section-kicker">Divisions</p>
            <h3>登録済みリーグ一覧</h3>
          </div>
        </div>
        <div className="admin-table">
          <div className="admin-table__row admin-table__row--head admin-table__row--five">
            <span>年度</span>
            <span>大会</span>
            <span>リーグ</span>
            <span>状態</span>
            <span>表示順</span>
          </div>
          {divisions.length > 0 ? (
            divisions.map((division) => (
              <div key={division.id} className="admin-table__row admin-table__row--five">
                <strong>{division.competition.season.label}</strong>
                <span>{division.competition.name}</span>
                <span>{division.name}</span>
                <span>{publishStatusLabel[division.status]}</span>
                <span>{division.sortOrder}</span>
              </div>
            ))
          ) : (
            <div className="admin-empty-state">
              <p>まだリーグは登録されていません。</p>
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

const competitionStatusLabel = {
  DRAFT: "下書き",
  PUBLISHED: "公開",
  CLOSED: "終了",
} as const;

const publishStatusLabel = {
  DRAFT: "下書き",
  PUBLISHED: "公開",
  ARCHIVED: "非公開",
} as const;
