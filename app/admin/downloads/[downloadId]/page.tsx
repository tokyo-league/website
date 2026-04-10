import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminLayoutShell } from "@/components/admin-layout-shell";
import { AdminDownloadForm } from "@/components/admin-download-form";
import { requireOwner } from "@/lib/admin-access";
import { resolveAssetUrl } from "@/lib/asset-url";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDownloadEditPage({
  params,
}: {
  params: Promise<{ downloadId: string }>;
}) {
  const scope = await requireOwner();
  const { downloadId } = await params;
  const download = await prisma.download.findUnique({
    where: { id: downloadId },
    include: { asset: true },
  });

  if (!download) {
    notFound();
  }

  const assetUrl = await resolveAssetUrl(download.asset.storageKey);

  return (
    <AdminLayoutShell currentPath="/admin/downloads" title="資料管理" kicker="Downloads" scope={scope}>
      <div className="page-intro__actions">
        <Link href="/admin/downloads" className="button button--ghost">
          一覧へ戻る
        </Link>
      </div>
      <AdminDownloadForm
        mode="edit"
        initialValues={{
          id: download.id,
          title: download.title,
          category: download.category,
          description: download.description ?? "",
          status: download.status,
          publishedAt: download.publishedAt ? download.publishedAt.toISOString().slice(0, 10) : "",
          sortOrder: download.sortOrder,
          assetUrl,
          originalFilename: download.asset.originalFilename ?? null,
        }}
      />
    </AdminLayoutShell>
  );
}
