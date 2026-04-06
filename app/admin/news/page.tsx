import Link from "next/link";
import { AdminLayoutShell } from "@/components/admin-layout-shell";
import { AdminNewsDeleteButton } from "@/components/admin-news-delete-button";
import { requireOwner } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";

export default async function AdminNewsPage() {
  const scope = await requireOwner();
  const posts = await prisma.newsPost.findMany({
    include: {
      category: true,
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  });

  return (
    <AdminLayoutShell currentPath="/admin/news" title="ニュース管理" kicker="News" scope={scope}>
      <article className="admin-card">
        <div className="card__header">
          <div>
            <p className="section-kicker">Posts</p>
            <h3>ニュース一覧</h3>
          </div>
          <Link href="/admin/news/new" className="button">
            新規作成
          </Link>
        </div>
        <div className="admin-table">
          <div className="admin-table__row admin-table__row--head admin-table__row--five">
            <span>公開日時</span>
            <span>カテゴリ</span>
            <span>タイトル</span>
            <span>状態</span>
            <span>操作</span>
          </div>
          {posts.map((item) => (
            <div key={item.id} className="admin-table__row admin-table__row--five">
              <span>{formatDateTime(item.publishedAt)}</span>
              <span>{item.category?.name ?? "未設定"}</span>
              <strong>{item.title}</strong>
              <span>{formatStatus(item.status)}</span>
              <div className="admin-inline-actions">
                <Link href={`/admin/news/${item.id}`} className="button button--ghost">
                  編集
                </Link>
                <AdminNewsDeleteButton newsId={item.id} />
              </div>
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

function formatDateTime(date: Date | null) {
  if (!date) {
    return "-";
  }

  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tokyo",
  });
}
