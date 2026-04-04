import { AdminDashboard } from "@/components/admin-dashboard";
import { AdminLayoutShell } from "@/components/admin-layout-shell";
import { getAdminScope } from "@/lib/admin-access";

export default async function AdminPage() {
  const scope = await getAdminScope();

  return (
    <AdminLayoutShell currentPath="/admin" title="ダッシュボード" kicker="Operations" scope={scope}>
      <AdminDashboard scope={scope} />
    </AdminLayoutShell>
  );
}
