import { AdminDashboard } from "@/components/admin-dashboard";
import { AdminLayoutShell } from "@/components/admin-layout-shell";

export default async function AdminPage() {
  return (
    <AdminLayoutShell currentPath="/admin" title="ダッシュボード" kicker="Operations">
      <AdminDashboard />
    </AdminLayoutShell>
  );
}
