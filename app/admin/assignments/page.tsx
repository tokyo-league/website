import { AdminLayoutShell } from "@/components/admin-layout-shell";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/admin-access";
import { createDivisionAssignment, deleteDivisionAssignment } from "./actions";

export default async function AdminAssignmentsPage() {
  const scope = await requireOwner();

  const [users, divisions, assignments] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
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
      <div className="admin-columns">
        <article className="admin-card">
          <div className="card__header">
            <div>
              <p className="section-kicker">Assign</p>
              <h3>入稿担当を追加</h3>
            </div>
          </div>
          <form action={createDivisionAssignment} className="admin-form-stack">
            <label className="admin-field">
              <span>担当者</span>
              <select name="userId" defaultValue="">
                <option value="" disabled>
                  担当者を選択
                </option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} / {user.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>リーグ</span>
              <select name="divisionId" defaultValue="">
                <option value="" disabled>
                  リーグを選択
                </option>
                {divisions.map((division) => (
                  <option key={division.id} value={division.id}>
                    {division.competition.name} / {division.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-field">
              <span>権限</span>
              <select name="permission" defaultValue="RESULTS_EDITOR">
                <option value="RESULTS_EDITOR">試合結果編集</option>
                <option value="STANDINGS_EDITOR">順位表編集</option>
                <option value="DIVISION_MANAGER">リーグ管理</option>
              </select>
            </label>
            <button type="submit" className="button">
              割当を追加
            </button>
          </form>
        </article>

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
              <span>全リーグを横断して編集可能</span>
            </li>
            <li>
              <strong>Editor</strong>
              <span>割当済みリーグのみ編集対象に表示</span>
            </li>
            <li>
              <strong>権限単位</strong>
              <span>試合結果 / 順位表 / リーグ管理</span>
            </li>
          </ul>
        </article>
      </div>

      <article className="admin-card">
        <div className="card__header">
          <div>
            <p className="section-kicker">Current</p>
            <h3>現在の割当一覧</h3>
          </div>
        </div>
        <div className="admin-table">
          <div className="admin-table__row admin-table__row--head admin-table__row--five">
            <span>担当者</span>
            <span>メール</span>
            <span>大会 / リーグ</span>
            <span>権限</span>
            <span>操作</span>
          </div>
          {assignments.length > 0 ? (
            assignments.map((assignment) => (
              <div key={assignment.id} className="admin-table__row admin-table__row--five">
                <strong>{assignment.user.name}</strong>
                <span>{assignment.user.email}</span>
                <span>
                  {assignment.division.competition.name} / {assignment.division.name}
                </span>
                <span>{permissionLabel[assignment.permission]}</span>
                <form action={deleteDivisionAssignment}>
                  <input type="hidden" name="assignmentId" value={assignment.id} />
                  <button type="submit" className="button button--ghost">
                    解除
                  </button>
                </form>
              </div>
            ))
          ) : (
            <div className="admin-empty-state">
              <p>まだ担当リーグの割当はありません。</p>
            </div>
          )}
        </div>
      </article>
    </AdminLayoutShell>
  );
}

const permissionLabel = {
  RESULTS_EDITOR: "試合結果編集",
  STANDINGS_EDITOR: "順位表編集",
  DIVISION_MANAGER: "リーグ管理",
} as const;
