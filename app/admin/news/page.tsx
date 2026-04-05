import { AdminLayoutShell } from "@/components/admin-layout-shell";
import { AdminNewsForm } from "@/components/admin-news-form";
import { requireOwner } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";

export default async function AdminNewsPage() {
  const scope = await requireOwner();
  const [categories, posts] = await Promise.all([
    prisma.newsCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.newsPost.findMany({
      include: {
        category: true,
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  return (
    <AdminLayoutShell currentPath="/admin/news" title="ニュース管理" kicker="News" scope={scope}>
      <AdminNewsForm categories={categories} />
      <article className="admin-card">
        <div className="card__header">
          <div>
            <p className="section-kicker">Posts</p>
            <h3>ニュース一覧</h3>
          </div>
        </div>
        <div className="admin-table">
          <div className="admin-table__row admin-table__row--head">
            <span>公開日</span>
            <span>カテゴリ</span>
            <span>タイトル</span>
            <span>状態</span>
          </div>
          {posts.map((item) => (
            <div key={item.id} className="admin-table__row">
              <span>{item.publishedAt ? item.publishedAt.toISOString().slice(0, 10) : "-"}</span>
              <span>{item.category?.name ?? "未設定"}</span>
              <strong>{item.title}</strong>
              <span>{formatStatus(item.status)}</span>
            </div>
          ))}
        </div>
      </article>
    </AdminLayoutShell>
  );
}

function formatStatus(status: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
  if (status === "PUBLISHED") return "公開";
  if (status === "ARCHIVED") return "非公開";
  return "下書き";
}
