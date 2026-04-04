import { notFound } from "next/navigation";
import { AdminLayoutShell } from "@/components/admin-layout-shell";
import { AdminTeamForm } from "@/components/admin-team-form";
import { requireOwner } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { getTeamAssetOptions } from "@/lib/team-assets";

export default async function AdminTeamEditPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const scope = await requireOwner();
  const { teamId } = await params;
  const { logos, photos } = await getTeamAssetOptions();

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
          founded: team.founded ?? "",
          region: team.region ?? "",
          representativeName: team.representativeName ?? "",
          headCoachName: team.headCoachName ?? "",
          websiteUrl: team.websiteUrl ?? "",
          logoPath: team.logoPath ?? "",
          photoPath: team.photoPath ?? "",
          status: team.status,
          sortOrder: team.sortOrder,
        }}
        logoOptions={logos}
        photoOptions={photos}
      />
    </AdminLayoutShell>
  );
}
