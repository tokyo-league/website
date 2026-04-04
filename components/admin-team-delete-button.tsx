"use client";

import { useActionState, useEffect, useState } from "react";
import { deleteTeam, type TeamActionState } from "@/app/admin/teams/actions";

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
      <form action={action}>
        <input type="hidden" name="teamId" value={teamId} />
        <button type="submit" className="button button--ghost" disabled={pending}>
          {pending ? "削除中..." : "削除"}
        </button>
      </form>
      {message ? <span className="admin-inline-message">{message}</span> : null}
    </div>
  );
}
