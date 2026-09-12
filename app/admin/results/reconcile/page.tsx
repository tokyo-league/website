import Link from "next/link";
import { AdminLayoutShell } from "@/components/admin-layout-shell";
import { AdminTeamReconciliationWorkspace } from "@/components/admin-team-reconciliation-workspace";
import { requireOwner } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { isValidUuid, sanitizePlainText } from "@/lib/security";

export default async function AdminResultsReconcilePage({
  searchParams,
}: {
  searchParams: Promise<{ divisionId?: string; names?: string }>;
}) {
  const scope = await requireOwner();
  const params = await searchParams;
  const divisionId = sanitizePlainText(params.divisionId ?? "", 64);
  const importedNames = parseImportedNames(params.names);

  if (!isValidUuid(divisionId) || importedNames.length === 0) {
    return (
      <AdminLayoutShell currentPath="/admin/results" title="チーム名名寄せ" kicker="Team matching" scope={scope}>
        <article className="admin-card">
          <h3>名寄せ対象がありません</h3>
          <p className="admin-section-lead">Excel入稿ウィザードで不一致チーム名を読み取ってから、この画面を開いてください。</p>
          <Link href="/admin/results/import" className="button">入稿ウィザードへ戻る</Link>
        </article>
      </AdminLayoutShell>
    );
  }

  const [division, teams] = await Promise.all([
    prisma.division.findUnique({
      where: { id: divisionId },
      include: { competition: { include: { season: true } } },
    }),
    prisma.team.findMany({
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        shortName: true,
        status: true,
        region: true,
        logoPath: true,
        homeUniformColor: true,
        awayUniformColor: true,
      },
    }),
  ]);

  if (!division) {
    return (
      <AdminLayoutShell currentPath="/admin/results" title="チーム名名寄せ" kicker="Team matching" scope={scope}>
        <article className="admin-card"><p className="admin-muted">対象リーグが見つかりませんでした。</p></article>
      </AdminLayoutShell>
    );
  }

  const divisionLabel = `${division.competition.season.label} / ${division.competition.name} / ${division.name}`;
  return (
    <AdminLayoutShell currentPath="/admin/results" title="チーム名名寄せ" kicker="Team matching" scope={scope}>
      <article className="admin-card admin-reconciliation-context">
        <div>
          <p className="section-kicker">対象リーグ</p>
          <h3>{divisionLabel}</h3>
          <p className="admin-section-lead">Excelで見つかった不一致表記だけを処理します。</p>
        </div>
        <Link href="/admin/results/import" className="button button--ghost">入稿ウィザードへ戻る</Link>
      </article>
      <AdminTeamReconciliationWorkspace
        divisionId={divisionId}
        importedNames={importedNames}
        teams={teams.map((team) => ({
          id: team.id,
          name: team.name,
          shortName: team.shortName ?? "",
          status: team.status,
          region: team.region ?? "",
          hasLogo: Boolean(team.logoPath),
          hasUniform: Boolean(team.homeUniformColor || team.awayUniformColor),
        }))}
      />
    </AdminLayoutShell>
  );
}

function parseImportedNames(value?: string) {
  if (!value || value.length > 12_000) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return Array.from(new Set(parsed.map((name) => sanitizePlainText(String(name ?? ""), 80)).filter(Boolean))).slice(0, 40);
  } catch {
    return [];
  }
}
