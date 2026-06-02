import Link from "next/link";
import { AdminLayoutShell } from "@/components/admin-layout-shell";
import { AdminDownloadDeleteButton } from "@/components/admin-download-delete-button";
import { AdminDownloadForm } from "@/components/admin-download-form";
import { resolveAssetUrl } from "@/lib/asset-url";
import { formatDownloadCategory } from "@/lib/downloads";
import { requireOwner } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { isE2ETestMode } from "@/lib/test-mode";

export default async function AdminDownloadsPage() {
  const scope = await requireOwner();
  const downloads = await prisma.download
    .findMany({
      include: {
        asset: true,
      },
      orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
    })
    .catch(() => (isE2ETestMode() ? [] : []));
  const downloadRows = await Promise.all(
    downloads.map(async (item) => ({
      ...item,
      assetUrl: await resolveAssetUrl(item.asset.storageKey),
      assetLabel: item.asset.originalFilename ?? item.asset.storageKey,
    })),
  );

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
          <div className="admin-table__row admin-table__row--head admin-table__row--downloads">
            <span>カテゴリ</span>
            <span>タイトル</span>
            <span>公開状態</span>
            <span>公開URL</span>
            <span>更新日</span>
            <span>操作</span>
          </div>
          {downloadRows.map((item) => (
            <div key={item.id} className="admin-table__row admin-table__row--downloads">
              <span>{formatDownloadCategory(item.category)}</span>
              <div className="admin-download-file">
                <strong>{item.title}</strong>
                <span>{item.assetLabel}</span>
              </div>
              <span>{item.status === "PUBLISHED" ? "公開" : item.status === "ARCHIVED" ? "非公開" : "下書き"}</span>
              {item.assetUrl ? (
                <a
                  href={item.assetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="admin-field__hint admin-field__hint--link"
                >
                  公開URLを確認
                </a>
              ) : (
                <span className="admin-inline-message">{item.asset.storageKey}</span>
              )}
              <span>{item.updatedAt.toISOString().slice(0, 10)}</span>
              <div className="admin-inline-actions">
                <Link href={`/admin/downloads/${item.id}`} className="button button--ghost">
                  編集
                </Link>
                <AdminDownloadDeleteButton downloadId={item.id} />
              </div>
            </div>
          ))}
        </div>
      </article>
    </AdminLayoutShell>
  );
}
