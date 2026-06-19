"use client";

import { useEffect, useId, useRef, useState } from "react";

type LeagueTeam = {
  id: string;
  name: string;
  region?: string | null;
};

export function LeagueTeamPopup({
  divisionName,
  teams,
}: {
  divisionName: string;
  teams: LeagueTeam[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        return;
      }

      if (event.key === "Tab") {
        const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );

        if (!focusableElements?.length) {
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      triggerRef.current?.focus();
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="league-team-trigger"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
      >
        所属 {teams.length}チーム
        <span aria-hidden="true">一覧を見る</span>
      </button>

      {isOpen ? (
        <div className="league-team-overlay" role="presentation" onMouseDown={() => setIsOpen(false)}>
          <section
            ref={dialogRef}
            className="league-team-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="league-team-dialog__header">
              <div>
                <p className="section-kicker">Teams</p>
                <h2 id={titleId}>{divisionName} 所属チーム</h2>
                <p>{teams.length}チームが所属しています。</p>
              </div>
              <button ref={closeRef} type="button" className="league-team-dialog__close" onClick={() => setIsOpen(false)}>
                <span aria-hidden="true">×</span>
                <span className="visually-hidden">閉じる</span>
              </button>
            </div>

            <ol className="league-team-list">
              {teams.map((team) => (
                <li key={team.id}>
                  <span className="league-team-list__number" aria-hidden="true" />
                  <strong>{team.name}</strong>
                  {team.region ? <span>{team.region}</span> : null}
                </li>
              ))}
            </ol>
          </section>
        </div>
      ) : null}
    </>
  );
}
