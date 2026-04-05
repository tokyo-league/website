"use server";

import path from "node:path";
import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { AssetKind, DownloadCategory, PublishStatus } from "@prisma/client";
import { requireOwner } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { ensureSlug, sanitizePlainText } from "@/lib/security";

export type DownloadActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function createDownload(
  _prevState: DownloadActionState,
  formData: FormData,
): Promise<DownloadActionState> {
  try {
    const scope = await requireOwner();
    const title = sanitizePlainText(String(formData.get("title") ?? ""), 140);
    const category = String(formData.get("category") ?? "DOCUMENT") as DownloadCategory;
    const description = sanitizePlainText(String(formData.get("description") ?? ""), 400);
    const status = String(formData.get("status") ?? "DRAFT") as PublishStatus;
    const publishedAtText = sanitizePlainText(String(formData.get("publishedAt") ?? ""), 32);
    const sortOrderText = sanitizePlainText(String(formData.get("sortOrder") ?? "0"), 12);
    const sortOrder = Number.parseInt(sortOrderText || "0", 10);

    if (
      !title ||
      !["REGULATION", "GUIDELINE", "DOCUMENT", "OTHER"].includes(category) ||
      !["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status) ||
      Number.isNaN(sortOrder)
    ) {
      return { status: "error", message: "資料内容を確認してください。" };
    }

    const file = formData.get("file");
    const asset = await uploadDownloadAsset(file, scope.admin.id, title);

    if (!asset) {
      return { status: "error", message: "資料ファイルを選択してください。" };
    }

    const slug = await createUniqueDownloadSlug(title);
    const publishedAt =
      status === "PUBLISHED" ? (publishedAtText ? new Date(publishedAtText) : new Date()) : null;

    if (publishedAtText && publishedAt && Number.isNaN(publishedAt.getTime())) {
      return { status: "error", message: "公開日を確認してください。" };
    }

    await prisma.download.create({
      data: {
        title,
        slug,
        category,
        description: description || null,
        assetId: asset.id,
        publishedAt,
        status,
        sortOrder,
        createdById: scope.admin.id,
        updatedById: scope.admin.id,
      },
    });

    revalidatePath("/admin/downloads");
    revalidatePath("/downloads");

    return {
      status: "success",
      message: `資料「${title}」を追加しました。`,
    };
  } catch (error) {
    console.error("createDownload failed", error);
    return {
      status: "error",
      message: error instanceof Error ? error.message : "資料の追加に失敗しました。",
    };
  }
}

async function createUniqueDownloadSlug(title: string) {
  const base = ensureSlug(title, "download", 80);
  let slug = base;
  let suffix = 2;

  while (await prisma.download.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

async function uploadDownloadAsset(fileValue: FormDataEntryValue | null, userId: string, title: string) {
  if (!(fileValue instanceof File) || fileValue.size === 0) {
    return null;
  }

  if (fileValue.size > 20 * 1024 * 1024) {
    throw new Error("資料ファイルは 20MB 以下にしてください。");
  }

  const ext = path.extname(fileValue.name).toLowerCase();
  const allowedExtensions = new Set([".pdf", ".xlsx", ".xls", ".doc", ".docx"]);

  if (!allowedExtensions.has(ext)) {
    throw new Error("資料ファイルは PDF / Excel / Word のみアップロードできます。");
  }

  const safeName = sanitizePlainText(fileValue.name, 180).replace(/[^a-zA-Z0-9._-]/g, "-");
  const blob = await put(`downloads/${Date.now()}-${safeName}`, fileValue, {
    access: "public",
    addRandomSuffix: true,
  });

  const asset = await prisma.asset.create({
    data: {
      kind: ext === ".pdf" ? AssetKind.PDF : AssetKind.FILE,
      title,
      storageKey: blob.pathname,
      originalFilename: fileValue.name,
      mimeType: fileValue.type || inferMimeType(ext),
      fileSize: BigInt(fileValue.size),
      createdById: userId,
    },
    select: { id: true },
  });

  return asset;
}

function inferMimeType(ext: string) {
  switch (ext) {
    case ".pdf":
      return "application/pdf";
    case ".xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case ".xls":
      return "application/vnd.ms-excel";
    case ".doc":
      return "application/msword";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    default:
      return "application/octet-stream";
  }
}
