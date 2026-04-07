import { notFound } from "next/navigation";
import { AdminLayoutShell } from "@/components/admin-layout-shell";
import { AdminNewsForm } from "@/components/admin-news-form";
import { requireOwner } from "@/lib/admin-access";
import { resolveAssetUrl } from "@/lib/asset-url";
import { formatDateTimeLocal } from "@/lib/news-datetime";
import { prisma } from "@/lib/prisma";

export default async function AdminNewsEditPage({
  params,
}: {
  params: Promise<{ newsId: string }>;
}) {
  const scope = await requireOwner();
  const { newsId } = await params;

  const post = await prisma.newsPost.findUnique({
      where: { id: newsId },
      select: {
        id: true,
        title: true,
        body: true,
        status: true,
        publishedAt: true,
        eyecatchAsset: {
          select: {
            storageKey: true,
          },
        },
      },
    });

  if (!post) {
    notFound();
  }

  const currentEyecatchUrl = await resolveAssetUrl(post.eyecatchAsset?.storageKey);

  return (
    <AdminLayoutShell currentPath="/admin/news" title="ニュース管理" kicker="News" scope={scope}>
      <AdminNewsForm
        mode="edit"
        initialValues={{
          id: post.id,
          title: post.title,
          body: post.body,
          status: post.status,
          publishedAt: formatDateTimeLocal(post.publishedAt),
          currentEyecatchUrl,
        }}
      />
    </AdminLayoutShell>
  );
}
