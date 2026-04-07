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

  const [categories, post] = await Promise.all([
    prisma.newsCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.newsPost.findUnique({
      where: { id: newsId },
      select: {
        id: true,
        title: true,
        body: true,
        categoryId: true,
        status: true,
        publishedAt: true,
        eyecatchAsset: {
          select: {
            storageKey: true,
          },
        },
      },
    }),
  ]);

  if (!post) {
    notFound();
  }

  const currentEyecatchUrl = await resolveAssetUrl(post.eyecatchAsset?.storageKey);

  return (
    <AdminLayoutShell currentPath="/admin/news" title="ニュース管理" kicker="News" scope={scope}>
      <AdminNewsForm
        mode="edit"
        categories={categories}
        initialValues={{
          id: post.id,
          title: post.title,
          body: post.body,
          categoryId: post.categoryId ?? "",
          status: post.status,
          publishedAt: formatDateTimeLocal(post.publishedAt),
          currentEyecatchUrl,
        }}
      />
    </AdminLayoutShell>
  );
}
