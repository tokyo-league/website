"use client";

import { useActionState, useEffect, useState } from "react";
import {
  createAdminUser,
  createDivisionAssignment,
  deleteAdminUser,
  deleteDivisionAssignment,
  initialAssignmentActionState,
  type AssignmentActionState,
} from "@/app/admin/assignments/actions";

type UserOption = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "EDITOR";
};

type DivisionOption = {
  id: string;
  name: string;
  competitionName: string;
};

type AssignmentRow = {
  id: string;
  userName: string;
  userEmail: string;
  divisionName: string;
  competitionName: string;
  permissionLabel: string;
};

type AdminAssignmentFormsProps = {
  users: UserOption[];
  divisions: DivisionOption[];
  assignments: AssignmentRow[];
  currentUserId: string;
};

export function AdminAssignmentForms({
  users,
  divisions,
  assignments,
  currentUserId,
}: AdminAssignmentFormsProps) {
  const [createUserState, createUserAction, createUserPending] = useActionState(
    createAdminUser,
    initialAssignmentActionState,
  );
  const [assignState, assignAction, assignPending] = useActionState(
    createDivisionAssignment,
    initialAssignmentActionState,
  );
  const [toast, setToast] = useState<AssignmentActionState>(initialAssignmentActionState);

  useEffect(() => {
    if (createUserState.status !== "idle") {
      setToast(createUserState);
    }
  }, [createUserState]);

  useEffect(() => {
    if (assignState.status !== "idle") {
      setToast(assignState);
    }
  }, [assignState]);

  return (
    <>
      {toast.status !== "idle" ? (
        <div className={`admin-toast admin-toast--${toast.status}`} role="status" aria-live="polite">
          <p>{toast.message}</p>
          <button type="button" className="button button--ghost" onClick={() => setToast(initialAssignmentActionState)}>
            閉じる
          </button>
        </div>
      ) : null}

      <div className="admin-columns">
        <article className="admin-card">
          <div className="card__header">
            <div>
              <p className="section-kicker">Users</p>
              <h3>担当者を追加</h3>
            </div>
          </div>
          <form action={createUserAction} className="admin-form-stack">
            <label className="admin-field">
              <span>Googleメールアドレス</span>
              <input type="email" name="email" placeholder="user@example.com" required />
            </label>
            <label className="admin-field">
              <span>表示名</span>
              <input type="text" name="name" placeholder="担当者名" required />
            </label>
            <label className="admin-field">
              <span>ロール</span>
              <select name="role" defaultValue="EDITOR">
                <option value="EDITOR">Editor</option>
                <option value="OWNER">Owner</option>
              </select>
            </label>
            <button type="submit" className="button" disabled={createUserPending}>
              {createUserPending ? "保存中..." : "担当者を保存"}
            </button>
          </form>
        </article>

        <article className="admin-card">
          <div className="card__header">
            <div>
              <p className="section-kicker">Assign</p>
              <h3>担当リーグを割り当て</h3>
            </div>
          </div>
          <form action={assignAction} className="admin-form-stack">
            <label className="admin-field">
              <span>担当者</span>
              <select name="userId" defaultValue="">
                <option value="" disabled>
                  担当者を選択
                </option>
                {users
                  .filter((user) => user.role === "EDITOR")
                  .map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} / {user.email}
                    </option>
                  ))}
              </select>
            </label>
            <label className="admin-field">
              <span>年度 / 大会 / リーグ</span>
              <select name="divisionId" defaultValue="">
                <option value="" disabled>
                  リーグを選択
                </option>
                {divisions.map((division) => (
                  <option key={division.id} value={division.id}>
                    {division.competitionName} / {division.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="admin-muted">
              割り当てた担当者は、そのリーグの試合結果・順位表・リーグ管理をまとめて編集できます。
            </p>
            <button type="submit" className="button" disabled={assignPending}>
              {assignPending ? "割当中..." : "割当を追加"}
            </button>
          </form>
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
            <span>年度 / 大会 / リーグ</span>
            <span>担当範囲</span>
            <span>操作</span>
          </div>
          {assignments.length > 0 ? (
            assignments.map((assignment) => (
              <AssignmentDeleteRow key={assignment.id} assignment={assignment} onDone={setToast} />
            ))
          ) : (
            <div className="admin-empty-state">
              <p>まだ担当リーグの割当はありません。</p>
            </div>
          )}
        </div>
      </article>

      <article className="admin-card">
        <div className="card__header">
          <div>
            <p className="section-kicker">Users</p>
            <h3>登録済み担当者</h3>
          </div>
        </div>
        <div className="admin-table">
          <div className="admin-table__row admin-table__row--head admin-table__row--five">
            <span>表示名</span>
            <span>メール</span>
            <span>ロール</span>
            <span>担当リーグ数</span>
            <span>操作</span>
          </div>
          {users.length > 0 ? (
            users.map((user) => (
              <AdminDeleteRow
                key={user.id}
                user={user}
                assignmentCount={assignments.filter((assignment) => assignment.userEmail === user.email).length}
                isCurrentUser={user.id === currentUserId}
                onDone={setToast}
              />
            ))
          ) : (
            <div className="admin-empty-state">
              <p>まだ担当者は登録されていません。</p>
            </div>
          )}
        </div>
      </article>
    </>
  );
}

function AssignmentDeleteRow({
  assignment,
  onDone,
}: {
  assignment: AssignmentRow;
  onDone: (state: AssignmentActionState) => void;
}) {
  const [state, formAction, pending] = useActionState(deleteDivisionAssignment, initialAssignmentActionState);

  useEffect(() => {
    if (state.status !== "idle") {
      onDone(state);
    }
  }, [onDone, state]);

  return (
    <div className="admin-table__row admin-table__row--five">
      <strong>{assignment.userName}</strong>
      <span>{assignment.userEmail}</span>
      <span>
        {assignment.competitionName} / {assignment.divisionName}
      </span>
      <span>{assignment.permissionLabel}</span>
      <form action={formAction}>
        <input type="hidden" name="assignmentId" value={assignment.id} />
        <button type="submit" className="button button--ghost" disabled={pending}>
          {pending ? "解除中..." : "解除"}
        </button>
      </form>
    </div>
  );
}

function AdminDeleteRow({
  user,
  assignmentCount,
  isCurrentUser,
  onDone,
}: {
  user: UserOption;
  assignmentCount: number;
  isCurrentUser: boolean;
  onDone: (state: AssignmentActionState) => void;
}) {
  const [state, formAction, pending] = useActionState(deleteAdminUser, initialAssignmentActionState);

  useEffect(() => {
    if (state.status !== "idle") {
      onDone(state);
    }
  }, [onDone, state]);

  const deletable = user.role !== "OWNER" && !isCurrentUser;

  return (
    <div className="admin-table__row admin-table__row--five">
      <strong>{user.name}</strong>
      <span>{user.email}</span>
      <span>{user.role === "OWNER" ? "Owner" : "Editor"}</span>
      <span>{assignmentCount}件</span>
      {deletable ? (
        <form action={formAction}>
          <input type="hidden" name="userId" value={user.id} />
          <button type="submit" className="button button--ghost" disabled={pending}>
            {pending ? "削除中..." : "削除"}
          </button>
        </form>
      ) : (
        <span>{isCurrentUser ? "ログイン中" : "削除不可"}</span>
      )}
    </div>
  );
}
