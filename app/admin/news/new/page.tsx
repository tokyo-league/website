import { AdminLayoutShell } from "@/components/admin-layout-shell";
import { AdminNewsForm } from "@/components/admin-news-form";
import { requireOwner } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";

export default async function AdminNewsNewPage() {
  const scope = await requireOwner();
  const categories = await prisma.newsCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  return (
    <AdminLayoutShell currentPath="/admin/news" title="ニュース管理" kicker="News" scope={scope}>
      <AdminNewsForm
        mode="create"
        categories={categories}
        initialValues={{
          title: "",
          body: "",
          categoryId: "",
          status: "DRAFT",
          publishedAt: "",
          currentEyecatchUrl: null,
        }}
      />
    </AdminLayoutShell>
  );
}
