import { AdminLayoutShell } from "@/components/admin-layout-shell";
import { AdminResultsForms } from "@/components/admin-results-forms";
import { getAdminScope } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";

export default async function AdminResultsPage() {
  const scope = await getAdminScope();

  const divisions = await prisma.division.findMany({
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
      matches: true,
      standings: true,
    },
    orderBy: [
      { competition: { season: { year: "desc" } } },
      { competition: { edition: "desc" } },
      { sortOrder: "asc" },
    ],
  });

  return (
    <AdminLayoutShell currentPath="/admin/results" title="結果管理" kicker="Results" scope={scope}>
      <div className="admin-stats">
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
      </div>

      <AdminResultsForms
        divisions={divisions.map((division) => ({
          id: division.id,
          label: `${division.competition.season.label} / ${division.competition.name} / ${division.name}`,
          resultImagePath: division.resultImagePath ?? "",
          description: division.description ?? "",
          teams: division.teams.map((assignment) => ({
            id: assignment.team.id,
            name: assignment.team.name,
          })),
        }))}
      />
    </AdminLayoutShell>
  );
}
