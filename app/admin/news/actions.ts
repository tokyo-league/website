"use server";

import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { AssetKind, PublishStatus } from "@prisma/client";
import { requireOwner } from "@/lib/admin-access";
import { assertImageFileAllowed } from "@/lib/image-file-validation";
import { prisma } from "@/lib/prisma";
import { ensureSlug, isValidUuid, sanitizeMultilineText, sanitizePlainText } from "@/lib/security";
import { isE2ETestMode } from "@/lib/test-mode";
import { IMAGE_UPLOAD_MAX_BYTES, NEWS_BODY_IMAGE_MAX_COUNT } from "@/lib/upload-limits";

export type NewsActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

type ParsedNewsPayload =
  | {
      ok: true;
      title: string;
      body: string;
      status: PublishStatus;
      publishedAt: Date | null;
    }
  | {
      ok: false;
      error: NewsActionState;
    };

export async function createNewsPost(
  _prevState: NewsActionState,
  formData: FormData,
): Promise<NewsActionState> {
  try {
    const scope = await requireOwner();
    const payload = parseNewsPayload(formData);

    if (!payload.ok) {
      return payload.error;
    }

    if (isE2ETestMode()) {
      revalidateNewsPaths();

      return {
        status: "success",
        message: `ニュース「${payload.title}」を作成しました。`,
      };
    }

    const slug = await createUniqueNewsSlug(payload.title);
    const eyecatchAssetId = await uploadNewsImageAsset(
      formData.get("eyecatchFile"),
      scope.admin.id,
      "アイキャッチ画像",
    );
    const bodyImageAssetIds = await uploadBodyImageAssets(formData, scope.admin.id);

    await prisma.newsPost.create({
      data: {
        slug,
        title: payload.title,
        excerpt: null,
        body: payload.body,
        categoryId: null,
        eyecatchAssetId,
        status: payload.status,
        publishedAt: payload.publishedAt,
        createdById: scope.admin.id,
        updatedById: scope.admin.id,
        bodyImages: {
          create: bodyImageAssetIds.map((assetId, sortOrder) => ({ assetId, sortOrder })),
        },
      },
    });

    revalidateNewsPaths();

    return {
      status: "success",
      message: `ニュース「${payload.title}」を作成しました。`,
    };
  } catch (error) {
    console.error("createNewsPost failed", error);
    return {
      status: "error",
      message: "ニュースの作成に失敗しました。ログを確認してください。",
    };
  }
}

export async function updateNewsPost(
  _prevState: NewsActionState,
  formData: FormData,
): Promise<NewsActionState> {
  try {
    const scope = await requireOwner();
    const newsId = sanitizePlainText(String(formData.get("newsId") ?? ""), 64);

    if (!isValidUuid(newsId)) {
      return { status: "error", message: "対象ニュースを確認してください。" };
    }

    const existing = await prisma.newsPost.findUnique({
      where: { id: newsId },
      select: {
        id: true,
        title: true,
        eyecatchAssetId: true,
        bodyImages: { orderBy: { sortOrder: "asc" }, select: { assetId: true } },
      },
    });

    if (!existing) {
      return { status: "error", message: "対象ニュースが見つかりません。" };
    }

    const payload = parseNewsPayload(formData);

    if (!payload.ok) {
      return payload.error;
    }

    const eyecatchAssetId =
      (await uploadNewsImageAsset(
        formData.get("eyecatchFile"),
        scope.admin.id,
        "アイキャッチ画像",
      )) ?? existing.eyecatchAssetId;
    const removeBodyImageIds = new Set(
      formData
        .getAll("removeBodyImageIds")
        .map((value) => sanitizePlainText(String(value), 64))
        .filter(isValidUuid),
    );
    const retainedBodyImageAssetIds = existing.bodyImages
      .map((image) => image.assetId)
      .filter((assetId) => !removeBodyImageIds.has(assetId));
    const newBodyImageAssetIds = await uploadBodyImageAssets(
      formData,
      scope.admin.id,
      retainedBodyImageAssetIds.length,
    );
    const bodyImageAssetIds = [...retainedBodyImageAssetIds, ...newBodyImageAssetIds];

    await prisma.$transaction(async (tx) => {
      await tx.newsPostImage.deleteMany({ where: { newsPostId: newsId } });
      await tx.newsPost.update({
        where: { id: newsId },
        data: {
          title: payload.title,
          excerpt: null,
          body: payload.body,
          categoryId: null,
          eyecatchAssetId,
          status: payload.status,
          publishedAt: payload.publishedAt,
          updatedById: scope.admin.id,
          bodyImages: {
            create: bodyImageAssetIds.map((assetId, sortOrder) => ({ assetId, sortOrder })),
          },
        },
      });
    });

    revalidateNewsPaths();

    return {
      status: "success",
      message: `ニュース「${payload.title}」を更新しました。`,
    };
  } catch (error) {
    console.error("updateNewsPost failed", error);
    return {
      status: "error",
      message: "ニュースの更新に失敗しました。ログを確認してください。",
    };
  }
}

export async function deleteNewsPost(
  _prevState: NewsActionState,
  formData: FormData,
): Promise<NewsActionState> {
  try {
    await requireOwner();
    const newsId = sanitizePlainText(String(formData.get("newsId") ?? ""), 64);

    if (!isValidUuid(newsId)) {
      return { status: "error", message: "対象ニュースを確認してください。" };
    }

    const existing = await prisma.newsPost.findUnique({
      where: { id: newsId },
      select: { id: true, title: true },
    });

    if (!existing) {
      return { status: "error", message: "対象ニュースが見つかりません。" };
    }

    await prisma.newsPost.delete({
      where: { id: newsId },
    });

    revalidateNewsPaths();

    return {
      status: "success",
      message: `ニュース「${existing.title}」を削除しました。`,
    };
  } catch (error) {
    console.error("deleteNewsPost failed", error);
    return {
      status: "error",
      message: "ニュースの削除に失敗しました。ログを確認してください。",
    };
  }
}

function parseNewsPayload(formData: FormData): ParsedNewsPayload {
  const title = sanitizePlainText(String(formData.get("title") ?? ""), 120);
  const body = sanitizeMultilineText(String(formData.get("body") ?? ""), 12000);
  const status = String(formData.get("status") ?? "DRAFT") as PublishStatus;
  const publishedAtText = sanitizePlainText(String(formData.get("publishedAt") ?? ""), 32);

  if (!title || !body || !["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)) {
    return { ok: false, error: { status: "error", message: "ニュース内容を確認してください。" } };
  }

  const publishedAt =
    status === "PUBLISHED" ? (publishedAtText ? parseDateTimeAsJst(publishedAtText) : new Date()) : null;

  if (publishedAtText && publishedAt && Number.isNaN(publishedAt.getTime())) {
    return { ok: false, error: { status: "error", message: "公開日時を確認してください。" } };
  }

  return {
    ok: true,
    title,
    body,
    status,
    publishedAt,
  };
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

async function uploadBodyImageAssets(formData: FormData, userId: string, existingCount = 0) {
  const files = formData
    .getAll("bodyImageFiles")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (existingCount + files.length > NEWS_BODY_IMAGE_MAX_COUNT) {
    throw new Error(`本文画像は最大${NEWS_BODY_IMAGE_MAX_COUNT}枚までです。`);
  }

  return Promise.all(files.map((file) => uploadNewsImageAsset(file, userId, "本文画像"))).then((ids) =>
    ids.filter((id): id is string => Boolean(id)),
  );
}

async function uploadNewsImageAsset(
  fileValue: FormDataEntryValue | null,
  userId: string,
  label: "アイキャッチ画像" | "本文画像",
) {
  if (!(fileValue instanceof File) || fileValue.size === 0) {
    return null;
  }

  const fileBuffer = Buffer.from(await fileValue.arrayBuffer());
  assertImageFileAllowed({
    filename: fileValue.name,
    mimeType: fileValue.type,
    size: fileValue.size,
    buffer: fileBuffer,
    rules: {
      label,
      maxSizeBytes: IMAGE_UPLOAD_MAX_BYTES,
    },
  });

  const safeName = sanitizePlainText(fileValue.name, 160).replace(/[^a-zA-Z0-9._-]/g, "-");
  const blob = await put(`news/${Date.now()}-${safeName}`, fileValue, {
    access: "public",
    addRandomSuffix: true,
  });

  const asset = await prisma.asset.create({
    data: {
      kind: AssetKind.IMAGE,
      title: fileValue.name,
      storageKey: blob.url,
      originalFilename: fileValue.name,
      mimeType: fileValue.type || "application/octet-stream",
      fileSize: BigInt(fileValue.size),
      createdById: userId,
    },
    select: { id: true },
  });

  return asset.id;
}

function revalidateNewsPaths() {
  revalidatePath("/admin/news");
  revalidatePath("/news");
  revalidatePath("/");
  revalidatePath("/news/[newsSlug]", "page");
}

function parseDateTimeAsJst(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);

  if (!match) {
    return new Date(Number.NaN);
  }

  const [, year, month, day, hour, minute] = match;

  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour) - 9,
      Number(minute),
    ),
  );
}
