import { AdminLayoutShell } from "@/components/admin-layout-shell";
import { AdminNewsForm } from "@/components/admin-news-form";
import { requireOwner } from "@/lib/admin-access";

export default async function AdminNewsNewPage() {
  const scope = await requireOwner();

  return (
    <AdminLayoutShell currentPath="/admin/news" title="ニュース管理" kicker="News" scope={scope}>
      <AdminNewsForm
        mode="create"
        initialValues={{
          title: "",
          body: "",
          status: "DRAFT",
          publishedAt: "",
          currentEyecatchUrl: null,
          currentBodyImages: [],
        }}
      />
    </AdminLayoutShell>
  );
}
