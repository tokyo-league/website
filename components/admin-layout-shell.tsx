import Link from "next/link";
import { auth } from "@/auth";
import { AdminSignOut } from "@/components/admin-sign-out";

const adminNav = [
  { href: "/admin", label: "ダッシュボード" },
  { href: "/admin/news", label: "ニュース" },
  { href: "/admin/competitions", label: "大会" },
  { href: "/admin/teams", label: "チーム" },
  { href: "/admin/downloads", label: "資料" },
];

type AdminLayoutShellProps = {
  currentPath: string;
  title: string;
  kicker: string;
  children: React.ReactNode;
};

export async function AdminLayoutShell({
  currentPath,
  title,
  kicker,
  children,
}: AdminLayoutShellProps) {
  const session = await auth();

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
      </aside>

      <section className="admin-main">
        <div className="admin-heading">
          <div>
            <p className="section-kicker">{kicker}</p>
            <h2>{title}</h2>
          </div>
          <div className="admin-heading__actions">
            <p>{session?.user?.name ?? "管理者"}</p>
            <AdminSignOut />
          </div>
        </div>
        {children}
      </section>
    </main>
  );
}
