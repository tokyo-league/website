"use client";

import { useActionState, useEffect, useState } from "react";
import {
  createBoardMember,
  deleteBoardMember,
  updateBoardMember,
  type BoardActionState,
} from "@/app/admin/board/actions";
import type { BoardMemberItem } from "@/lib/board-members";
import { ConfirmForm } from "@/components/confirm-form";

const initialState: BoardActionState = { status: "idle", message: "" };

export function AdminBoardForms({ members }: { members: BoardMemberItem[] }) {
  const [createState, createAction, createPending] = useActionState(createBoardMember, initialState);
  const [toast, setToast] = useState(initialState);

  useEffect(() => {
    if (createState.status !== "idle") setToast(createState);
  }, [createState]);

  return (
    <>
      {toast.status !== "idle" ? (
        <div className={`admin-toast admin-toast--${toast.status}`} role="status" aria-live="polite">
          <p>{toast.message}</p>
          <button type="button" className="button button--ghost" onClick={() => setToast(initialState)}>
            閉じる
          </button>
        </div>
      ) : null}

      <article className="admin-card">
        <div className="card__header">
          <div>
            <p className="section-kicker">New Member</p>
            <h3>理事会メンバーを追加</h3>
          </div>
        </div>
        <form action={createAction} className="admin-form-stack">
          <div className="admin-form-preview__grid admin-form-preview__grid--three">
            <label className="admin-field">
              <span>役職</span>
              <input type="text" name="role" placeholder="例：理事" required />
            </label>
            <label className="admin-field">
              <span>氏名</span>
              <input type="text" name="name" placeholder="氏名" required />
            </label>
            <label className="admin-field">
              <span>担当</span>
              <input type="text" name="duty" placeholder="例：広報（任意）" />
            </label>
          </div>
          <button type="submit" className="button" disabled={createPending}>
            {createPending ? "追加中..." : "メンバーを追加"}
          </button>
        </form>
      </article>

      <article className="admin-card">
        <div className="card__header">
          <div>
            <p className="section-kicker">Current Members</p>
            <h3>登録済みメンバー</h3>
          </div>
          <span className="admin-muted">{members.length}名</span>
        </div>
        <div className="admin-item-list">
          {members.length > 0 ? (
            members.map((member) => <BoardMemberEditor key={member.id} member={member} onDone={setToast} />)
          ) : (
            <div className="admin-empty-state"><p>理事会メンバーはまだ登録されていません。</p></div>
          )}
        </div>
      </article>
    </>
  );
}

function BoardMemberEditor({
  member,
  onDone,
}: {
  member: BoardMemberItem;
  onDone: (state: BoardActionState) => void;
}) {
  const [updateState, updateAction, updatePending] = useActionState(updateBoardMember, initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteBoardMember, initialState);
  const isDefault = member.id.startsWith("default-");

  useEffect(() => {
    if (updateState.status !== "idle") onDone(updateState);
  }, [onDone, updateState]);

  useEffect(() => {
    if (deleteState.status !== "idle") onDone(deleteState);
  }, [deleteState, onDone]);

  return (
    <div className="admin-item-card">
      <form action={updateAction} className="admin-form-stack">
        <input type="hidden" name="memberId" value={member.id} />
        <div className="admin-form-preview__grid admin-form-preview__grid--three">
          <label className="admin-field">
            <span>役職</span>
            <input type="text" name="role" defaultValue={member.role} required disabled={isDefault} />
          </label>
          <label className="admin-field">
            <span>氏名</span>
            <input type="text" name="name" defaultValue={member.name} required disabled={isDefault} />
          </label>
          <label className="admin-field">
            <span>担当</span>
            <input type="text" name="duty" defaultValue={member.duty} disabled={isDefault} />
          </label>
        </div>
        {isDefault ? (
          <p className="admin-muted">初期名簿です。DB反映後に管理画面から編集・削除できます。</p>
        ) : (
          <button type="submit" className="button" disabled={updatePending}>
            {updatePending ? "更新中..." : "変更を保存"}
          </button>
        )}
      </form>
      {!isDefault ? (
        <ConfirmForm action={deleteAction} message={`${member.name}さんを理事会から削除します。よろしいですか？`}>
          <input type="hidden" name="memberId" value={member.id} />
          <button type="submit" className="button button--danger" disabled={deletePending}>
            {deletePending ? "削除中..." : "削除"}
          </button>
        </ConfirmForm>
      ) : null}
    </div>
  );
}
