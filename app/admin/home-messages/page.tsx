import { unstable_noStore as noStore } from "next/cache";
import { AdminHomeMessagesForm } from "@/components/admin-home-messages-form";
import { AdminLayoutShell } from "@/components/admin-layout-shell";
import { requireOwner } from "@/lib/admin-access";
import { getHomeMessages } from "@/lib/home-messages";

export default async function AdminHomeMessagesPage() {
  noStore();
  const scope = await requireOwner();
  const messages = await getHomeMessages();

  return (
    <AdminLayoutShell currentPath="/admin/home-messages" title="トップページ管理" kicker="Home" scope={scope}>
      <AdminHomeMessagesForm messages={messages} />
    </AdminLayoutShell>
  );
}
