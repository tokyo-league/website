import { AdminLayoutShell } from "@/components/admin-layout-shell";
import { AdminDownloadForm } from "@/components/admin-download-form";
import { requireOwner } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";

export default async function AdminDownloadsPage() {
  const scope = await requireOwner();
  const downloads = await prisma.download.findMany({
    include: {
      asset: true,
    },
    orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
  });

  return (
    <AdminLayoutShell currentPath="/admin/downloads" title="資料管理" kicker="Downloads" scope={scope}>
      <AdminDownloadForm />
      <article className="admin-card">
        <div className="card__header">
          <div>
            <p className="section-kicker">Documents</p>
            <h3>公開資料一覧</h3>
          </div>
        </div>
        <div className="admin-table">
          <div className="admin-table__row admin-table__row--head">
            <span>カテゴリ</span>
            <span>タイトル</span>
            <span>更新日</span>
          </div>
          {downloads.map((item) => (
            <div key={item.id} className="admin-table__row">
              <span>{formatCategory(item.category)}</span>
              <strong>{item.title}</strong>
              <span>{item.updatedAt.toISOString().slice(0, 10)}</span>
            </div>
          ))}
        </div>
      </article>
    </AdminLayoutShell>
  );
}

function formatCategory(category: "REGULATION" | "GUIDELINE" | "DOCUMENT" | "OTHER") {
  if (category === "REGULATION") return "規約";
  if (category === "GUIDELINE") return "ガイドライン";
  if (category === "OTHER") return "その他";
  return "資料";
}
