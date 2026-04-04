import { AdminLayoutShell } from "@/components/admin-layout-shell";
import { AdminTeamForm } from "@/components/admin-team-form";
import { requireOwner } from "@/lib/admin-access";
import { getTeamAssetOptions } from "@/lib/team-assets";

export default async function AdminTeamNewPage() {
  const scope = await requireOwner();
  const { logos, photos } = await getTeamAssetOptions();

  return (
    <AdminLayoutShell currentPath="/admin/teams" title="チーム管理" kicker="Teams" scope={scope}>
      <AdminTeamForm
        mode="create"
        initialValues={{
          name: "",
          shortName: "",
          profile: "",
          founded: "",
          region: "",
          representativeName: "",
          headCoachName: "",
          websiteUrl: "",
          logoPath: "",
          photoPath: "",
          status: "PUBLISHED",
          sortOrder: 0,
        }}
        logoOptions={logos}
        photoOptions={photos}
      />
    </AdminLayoutShell>
  );
}
