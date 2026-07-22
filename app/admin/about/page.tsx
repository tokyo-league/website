import { unstable_noStore as noStore } from "next/cache";
import { AdminAboutContentForm } from "@/components/admin-about-content-form";
import { AdminLayoutShell } from "@/components/admin-layout-shell";
import { requireOwner } from "@/lib/admin-access";
import { getAboutContent } from "@/lib/about-content";

export default async function AdminAboutPage() {
  noStore();
  const scope = await requireOwner();
  const content = await getAboutContent();

  return (
    <AdminLayoutShell currentPath="/admin/about" title="東京リーグについて管理" kicker="About" scope={scope}>
      <AdminAboutContentForm content={content} />
    </AdminLayoutShell>
  );
}
