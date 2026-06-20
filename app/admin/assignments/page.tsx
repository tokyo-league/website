import { AdminLayoutShell } from "@/components/admin-layout-shell";
import { AdminAssignmentForms } from "@/components/admin-assignment-forms";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/admin-access";

export default async function AdminAssignmentsPage() {
  const scope = await requireOwner();

  const [users, divisions, assignments] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ isActive: "desc" }, { role: "asc" }, { name: "asc" }],
    }),
    prisma.division.findMany({
      include: {
        competition: true,
      },
      orderBy: [{ competition: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    }),
    prisma.divisionEditorAssignment.findMany({
      include: {
        user: true,
        division: {
          include: {
            competition: true,
          },
        },
      },
      orderBy: [{ user: { name: "asc" } }, { division: { competition: { sortOrder: "asc" } } }, { division: { sortOrder: "asc" } }],
    }),
  ]);

  return (
    <AdminLayoutShell
      currentPath="/admin/assignments"
      title="担当リーグ割当"
      kicker="Assignments"
      scope={scope}
    >
      <AdminAssignmentForms
        users={users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        }))}
        divisions={divisions.map((division) => ({
          id: division.id,
          name: division.name,
          competitionName: division.competition.name,
        }))}
        assignments={assignments.map((assignment) => ({
          id: assignment.id,
          userName: assignment.user.name,
          userEmail: assignment.user.email,
          divisionName: assignment.division.name,
          competitionName: assignment.division.competition.name,
          permissionLabel: permissionLabel[assignment.permission],
        }))}
        currentUserId={scope.admin.id}
      />

      <article className="admin-card">
        <div className="card__header">
          <div>
            <p className="section-kicker">Policy</p>
            <h3>運用メモ</h3>
          </div>
        </div>
        <ul className="admin-list">
          <li>
            <strong>Owner</strong>
            <span>全リーグ、ニュース、チーム、資料を編集可能</span>
          </li>
          <li>
            <strong>Editor</strong>
            <span>割当済みリーグのみ編集対象に表示</span>
          </li>
          <li>
            <strong>問い合わせ先</strong>
            <span>公開フォームから送信された問い合わせをメールで受信（管理画面へのログイン権限なし）</span>
          </li>
          <li>
            <strong>担当リーグ権限</strong>
            <span>試合結果、順位表、リーグ管理をまとめて編集可能</span>
          </li>
        </ul>
      </article>
    </AdminLayoutShell>
  );
}

const permissionLabel = {
  RESULTS_EDITOR: "担当リーグ編集",
  STANDINGS_EDITOR: "担当リーグ編集",
  DIVISION_MANAGER: "担当リーグ編集",
} as const;
