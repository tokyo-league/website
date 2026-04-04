import Link from "next/link";
import { auth } from "@/auth";
import { AdminSignOut } from "@/components/admin-sign-out";
import type { AdminScope } from "@/lib/admin-access";

type AdminLayoutShellProps = {
  currentPath: string;
  title: string;
  kicker: string;
  children: React.ReactNode;
  scope?: AdminScope;
};

export async function AdminLayoutShell({
  currentPath,
  title,
  kicker,
  children,
  scope,
}: AdminLayoutShellProps) {
  const session = await auth();
  const adminNav = [
    { href: "/admin", label: "ダッシュボード" },
    { href: "/admin/competitions", label: "大会" },
    { href: "/admin/results", label: "結果管理" },
    ...(scope?.canManageGlobalContent
      ? [
          { href: "/admin/news", label: "ニュース" },
          { href: "/admin/teams", label: "チーム" },
          { href: "/admin/downloads", label: "資料" },
        ]
      : []),
    ...(scope?.canManageAssignments ? [{ href: "/admin/assignments", label: "担当割当" }] : []),
  ];

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <div>
          <p className="section-kicker section-kicker--on-dark">TL Admin</p>
          <h1>管理画面</h1>
        </div>
        <nav className="admin-sidebar__nav" aria-label="管理メニュー">
          {adminNav.map((item) => (
            <Link key={item.href} href={item.href} className={item.href === currentPath ? "is-active" : ""}>
              {item.label}
            </Link>
          ))}
        </nav>
        {scope ? (
          <div className="admin-sidebar__meta">
            <p>
              権限:
              <strong>{scope.admin.role === "OWNER" ? "Owner" : "Editor"}</strong>
            </p>
            <p>
              担当リーグ:
              <strong>{scope.admin.role === "OWNER" ? "全リーグ" : `${scope.accessibleDivisions.length}件`}</strong>
            </p>
          </div>
        ) : null}
      </aside>

      <section className="admin-main">
        <div className="admin-heading">
          <div>
            <p className="section-kicker">{kicker}</p>
            <h2>{title}</h2>
          </div>
          <div className="admin-heading__actions">
            <div className="admin-user-chip">
              <p>{session?.user?.name ?? "管理者"}</p>
              <span>{scope?.admin.role === "OWNER" ? "Owner" : "Editor"}</span>
            </div>
            <AdminSignOut />
          </div>
        </div>
        {children}
      </section>
    </main>
  );
}
