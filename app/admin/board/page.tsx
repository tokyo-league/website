import { unstable_noStore as noStore } from "next/cache";
import { AdminLayoutShell } from "@/components/admin-layout-shell";
import { AdminBoardForms } from "@/components/admin-board-forms";
import { requireOwner } from "@/lib/admin-access";
import { getBoardMembers } from "@/lib/board-members";

export default async function AdminBoardPage() {
  noStore();
  const scope = await requireOwner();
  const members = await getBoardMembers();

  return (
    <AdminLayoutShell currentPath="/admin/board" title="理事会管理" kicker="Board" scope={scope}>
      <AdminBoardForms members={members} />
    </AdminLayoutShell>
  );
}
