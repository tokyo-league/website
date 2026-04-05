"use server";

import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { AssetKind, PublishStatus } from "@prisma/client";
import { requireOwner } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { ensureSlug, isValidUuid, sanitizePlainText } from "@/lib/security";

export type NewsActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function createNewsPost(
  _prevState: NewsActionState,
  formData: FormData,
): Promise<NewsActionState> {
  try {
    const scope = await requireOwner();
    const title = sanitizePlainText(String(formData.get("title") ?? ""), 120);
    const excerpt = sanitizePlainText(String(formData.get("excerpt") ?? ""), 240);
    const body = sanitizePlainText(String(formData.get("body") ?? ""), 12000);
    const categoryId = sanitizePlainText(String(formData.get("categoryId") ?? ""), 64);
    const status = String(formData.get("status") ?? "DRAFT") as PublishStatus;
    const publishedAtText = sanitizePlainText(String(formData.get("publishedAt") ?? ""), 32);

    if (!title || !body || !["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)) {
      return { status: "error", message: "ニュース内容を確認してください。" };
    }

    if (categoryId && !isValidUuid(categoryId)) {
      return { status: "error", message: "カテゴリを確認してください。" };
    }

    const slug = await createUniqueNewsSlug(title);
    const publishedAt =
      status === "PUBLISHED" ? (publishedAtText ? new Date(publishedAtText) : new Date()) : null;

    if (publishedAtText && publishedAt && Number.isNaN(publishedAt.getTime())) {
      return { status: "error", message: "公開日を確認してください。" };
    }

    let eyecatchAssetId: string | null = null;

    try {
      eyecatchAssetId = await uploadEyecatchAsset(formData.get("eyecatchFile"), scope.admin.id);
    } catch (error) {
      return {
        status: "error",
        message: error instanceof Error ? error.message : "アイキャッチ画像の保存に失敗しました。",
      };
    }

    await prisma.newsPost.create({
      data: {
        slug,
        title,
        excerpt: excerpt || null,
        body,
        categoryId: categoryId || null,
        eyecatchAssetId,
        status,
        publishedAt,
        createdById: scope.admin.id,
        updatedById: scope.admin.id,
      },
    });

    revalidatePath("/admin/news");
    revalidatePath("/news");

    return {
      status: "success",
      message: `ニュース「${title}」を作成しました。`,
    };
  } catch (error) {
    console.error("createNewsPost failed", error);
    return {
      status: "error",
      message: "ニュースの作成に失敗しました。ログを確認してください。",
    };
  }
}

async function createUniqueNewsSlug(title: string) {
  const base = ensureSlug(title, "news", 80);
  let slug = base;
  let suffix = 2;

  while (await prisma.newsPost.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

async function uploadEyecatchAsset(fileValue: FormDataEntryValue | null, userId: string) {
  if (!(fileValue instanceof File) || fileValue.size === 0) {
    return null;
  }

  if (!fileValue.type.startsWith("image/")) {
    throw new Error("アイキャッチ画像は画像ファイルのみアップロードできます。");
  }

  if (fileValue.size > 10 * 1024 * 1024) {
    throw new Error("アイキャッチ画像は 10MB 以下にしてください。");
  }

  const safeName = sanitizePlainText(fileValue.name, 160).replace(/[^a-zA-Z0-9._-]/g, "-");
  const blob = await put(`news/${Date.now()}-${safeName}`, fileValue, {
    access: "public",
    addRandomSuffix: true,
  });

  const asset = await prisma.asset.create({
    data: {
      kind: AssetKind.IMAGE,
      title: fileValue.name,
      storageKey: blob.pathname,
      originalFilename: fileValue.name,
      mimeType: fileValue.type || "application/octet-stream",
      fileSize: BigInt(fileValue.size),
      createdById: userId,
    },
    select: { id: true },
  });

  return asset.id;
}
