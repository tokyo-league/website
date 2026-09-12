import { AdminLayoutShell } from "@/components/admin-layout-shell";
import { AdminResultsForms } from "@/components/admin-results-forms";
import Link from "next/link";
import { getAdminScope } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { e2eMockCompetition, isE2ETestMode } from "@/lib/test-mode";

export default async function AdminResultsPage() {
  return <ResultsManagementPage mode="manager" />;
}

export async function ResultsManagementPage({ mode }: { mode: "manager" | "import" }) {
  const scope = await getAdminScope();

  const [divisions, teams, reconciliationTeams] = isE2ETestMode()
    ? [
        e2eMockCompetition.divisions.map((division) => ({
          ...division,
          competition: {
            name: e2eMockCompetition.name,
            edition: e2eMockCompetition.edition,
            season: e2eMockCompetition.season,
          },
        })),
        buildE2ETeamOptions(),
        buildE2ETeamOptions().map((team) => ({ ...team, shortName: "", status: "PUBLISHED" as const, profile: "", logoPath: "", homeUniformColor: "", awayUniformColor: "" })),
      ]
    : await Promise.all([
        prisma.division.findMany({
          where:
            scope.admin.role === "OWNER"
              ? undefined
              : {
                  id: {
                    in: scope.accessibleDivisions.map((division) => division.id),
                  },
                },
          include: {
            competition: {
              include: {
                season: true,
              },
            },
            teams: {
              include: {
                team: true,
              },
              orderBy: { sortOrder: "asc" },
            },
            matches: {
              include: {
                venue: true,
                homeTeam: true,
                awayTeam: true,
              },
              orderBy: [{ matchDate: "desc" }, { createdAt: "desc" }],
            },
            standings: {
              include: {
                team: true,
              },
              orderBy: [{ rank: "asc" }, { team: { sortOrder: "asc" } }],
            },
          },
          orderBy: [
            { competition: { season: { year: "desc" } } },
            { competition: { edition: "desc" } },
            { sortOrder: "asc" },
          ],
        }),
        prisma.team.findMany({
          where: {
            status: "PUBLISHED",
          },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            region: true,
          },
        }),
        prisma.team.findMany({
          orderBy: [{ name: "asc" }],
          select: {
            id: true,
            name: true,
            region: true,
            shortName: true,
            status: true,
            profile: true,
            logoPath: true,
            homeUniformColor: true,
            awayUniformColor: true,
          },
        }),
      ]);

  return (
    <AdminLayoutShell currentPath="/admin/results" title={mode === "import" ? "Excel一括入稿" : "結果管理"} kicker={mode === "import" ? "Excel Submission" : "Results"} scope={scope}>
      {mode === "manager" ? <div className="admin-stats">
        <article className="admin-card">
          <span>対象リーグ</span>
          <strong>{scope.admin.role === "OWNER" ? divisions.length : scope.accessibleDivisions.length}</strong>
        </article>
        <article className="admin-card">
          <span>登録済み試合</span>
          <strong>{divisions.reduce((sum, division) => sum + division.matches.length, 0)}</strong>
        </article>
        <article className="admin-card">
          <span>順位表登録</span>
          <strong>{divisions.reduce((sum, division) => sum + division.standings.length, 0)}</strong>
        </article>
      </div> : null}

      {mode === "manager" ? <article className="admin-card admin-results-import-entry">
        <div>
          <p className="section-kicker">Excel Submission</p>
          <h3>Excelで一括入稿する</h3>
          <p className="admin-section-lead">試合反映から順位表・結果画像の登録まで、順番どおりに進める専用画面です。</p>
        </div>
        <Link href="/admin/results/import" className="button">入稿ウィザードを開く</Link>
      </article> : null}

      <AdminResultsForms
        mode={mode}
        teams={teams.map((team) => ({
          id: team.id,
          name: team.name,
          region: team.region ?? "",
        }))}
        divisions={divisions.map((division) => ({
          id: division.id,
          seasonYear: division.competition.season.year,
          seasonLabel: division.competition.season.label,
          seasonIsCurrent: division.competition.season.isCurrent,
          competitionName: division.competition.name,
          divisionName: division.name,
          label: `${division.competition.season.label} / ${division.competition.name} / ${division.name}`,
          resultImagePath: division.resultImagePath ?? "",
          unplayedMatchPointsAdjustedAt:
            "unplayedMatchPointsAdjustedAt" in division && division.unplayedMatchPointsAdjustedAt
              ? division.unplayedMatchPointsAdjustedAt.toISOString()
              : "",
          description: division.description ?? "",
          teams: division.teams.map((assignment) => ({
            id: assignment.team.id,
            name: assignment.team.name,
          })),
          matches: division.matches.map((match) => ({
            id: match.id,
            matchDate: match.matchDate?.toISOString().slice(0, 10) ?? "",
            homeTeamId: "homeTeamId" in match ? match.homeTeamId : "",
            awayTeamId: "awayTeamId" in match ? match.awayTeamId : "",
            homeScore: match.homeScore ?? null,
            awayScore: match.awayScore ?? null,
            venueName: match.venue?.name ?? "",
            note: match.note ?? "",
          })),
          standings: division.standings.map((standing) => ({
            id: standing.id,
            teamId: "teamId" in standing ? standing.teamId : standing.team.name,
            teamName: standing.team.name,
            rank: standing.rank,
            played: standing.played,
            won: "won" in standing ? standing.won : 0,
            drawn: "drawn" in standing ? standing.drawn : 0,
            lost: "lost" in standing ? standing.lost : 0,
            goalsFor: "goalsFor" in standing ? standing.goalsFor : 0,
            goalsAgainst: "goalsAgainst" in standing ? standing.goalsAgainst : 0,
            goalDifference: standing.goalDifference,
            points: standing.points,
          })),
        }))}
        reconciliationTeams={reconciliationTeams.map((team) => ({
          id: team.id,
          name: team.name,
          region: team.region ?? "",
          shortName: team.shortName ?? "",
          status: team.status,
          profile: team.profile ?? "",
          logoPath: team.logoPath ?? "",
          homeUniformColor: team.homeUniformColor ?? "",
          awayUniformColor: team.awayUniformColor ?? "",
        }))}
      />
    </AdminLayoutShell>
  );
}

function buildE2ETeamOptions() {
  const teams = new Map<string, { id: string; name: string; region: string }>();

  for (const division of e2eMockCompetition.divisions) {
    for (const assignment of division.teams) {
      teams.set(assignment.team.id, {
        id: assignment.team.id,
        name: assignment.team.name,
        region: assignment.team.region ?? "",
      });
    }
  }

  return Array.from(teams.values());
}
