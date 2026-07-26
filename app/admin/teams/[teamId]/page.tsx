import { notFound } from "next/navigation";
import { AdminLayoutShell } from "@/components/admin-layout-shell";
import { AdminTeamForm } from "@/components/admin-team-form";
import { requireOwner } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";

export default async function AdminTeamEditPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const scope = await requireOwner();
  const { teamId } = await params;

  const team = await prisma.team.findUnique({
    where: { id: teamId },
  });

  if (!team) {
    notFound();
  }

  return (
    <AdminLayoutShell currentPath="/admin/teams" title="チーム管理" kicker="Teams" scope={scope}>
      <AdminTeamForm
        mode="edit"
        initialValues={{
          id: team.id,
          name: team.name,
          shortName: team.shortName ?? "",
          profile: team.profile ?? "",
          region: team.region ?? "",
          logoPath: team.logoPath ?? "",
          homeUniformColor: team.homeUniformColor ?? "",
          awayUniformColor: team.awayUniformColor ?? "",
          status: team.status,
        }}
      />
    </AdminLayoutShell>
  );
}
