"use client";

import { useActionState, useEffect, useState } from "react";
import { deleteTeam, type TeamActionState } from "@/app/admin/teams/actions";
import { ConfirmForm } from "@/components/confirm-form";

const initialTeamActionState: TeamActionState = {
  status: "idle",
  message: "",
};

export function AdminTeamDeleteButton({ teamId }: { teamId: string }) {
  const [state, action, pending] = useActionState(deleteTeam, initialTeamActionState);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (state.status !== "idle") {
      setMessage(state.message);
    }
  }, [state]);

  return (
    <div className="admin-inline-actions">
      <ConfirmForm action={action} message="このチームを削除します。よろしいですか？">
        <input type="hidden" name="teamId" value={teamId} />
        <button type="submit" className="button button--ghost" disabled={pending}>
          {pending ? "削除中..." : "削除"}
        </button>
      </ConfirmForm>
      {message ? <span className="admin-inline-message">{message}</span> : null}
    </div>
  );
}
