"use server";

import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { imageSize } from "image-size";
import { PublishStatus } from "@prisma/client";
import { requireOwner } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { ensureSlug, isValidUuid, sanitizePlainText } from "@/lib/security";

export type TeamActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const IMAGE_RULES = {
  logos: {
    label: "ロゴ画像",
    minWidth: 240,
    minHeight: 240,
  },
  photos: {
    label: "チーム画像",
    minWidth: 1200,
    minHeight: 675,
    minAspectRatio: 1.2,
  },
} as const;

export async function createTeam(
  _prevState: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  await requireOwner();

  try {
    const payload = await getTeamPayload(formData);

    if (!payload.name) {
      return {
        status: "error",
        message: "チーム名を入力してください。",
      };
    }

    await prisma.team.create({
      data: payload,
    });
    revalidatePath("/admin/teams");

    return {
      status: "success",
      message: `${payload.name} を追加しました。`,
    };
  } catch (error) {
    console.error("createTeam failed", error);

    return {
      status: "error",
      message: "チーム保存に失敗しました。入力内容またはサーバーログを確認してください。",
    };
  }
}

export async function updateTeam(
  _prevState: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  await requireOwner();

  const teamId = sanitizePlainText(String(formData.get("teamId") ?? ""), 64);

  if (!isValidUuid(teamId)) {
    return {
      status: "error",
      message: "編集対象のチームが見つかりませんでした。",
    };
  }
  try {
    const payload = await getTeamPayload(formData);

    if (!payload.name) {
      return {
        status: "error",
        message: "チーム名を入力してください。",
      };
    }

    const currentTeam = await prisma.team.findUnique({
      where: { id: teamId },
      select: { slug: true },
    });

    if (!currentTeam) {
      return {
        status: "error",
        message: "編集対象のチームが見つかりませんでした。",
      };
    }

    await prisma.team.update({
      where: { id: teamId },
      data: {
        ...payload,
        slug: currentTeam.slug,
      },
    });
    revalidatePath("/admin/teams");
    revalidatePath(`/admin/teams/${teamId}`);

    return {
      status: "success",
      message: `${payload.name} を更新しました。`,
    };
  } catch (error) {
    console.error("updateTeam failed", error);

    return {
      status: "error",
      message: "チーム情報の更新に失敗しました。",
    };
  }
}

export async function deleteTeam(
  _prevState: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  await requireOwner();

  const teamId = sanitizePlainText(String(formData.get("teamId") ?? ""), 64);

  if (!isValidUuid(teamId)) {
    return {
      status: "error",
      message: "削除対象のチームが見つかりませんでした。",
    };
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      _count: {
        select: {
          divisions: true,
          homeMatches: true,
          awayMatches: true,
          standings: true,
        },
      },
    },
  });

  if (!team) {
    return {
      status: "error",
      message: "削除対象のチームが見つかりませんでした。",
    };
  }

  const hasReferences = Object.values(team._count).reduce((sum, count) => sum + count, 0) > 0;

  if (hasReferences) {
    return {
      status: "error",
      message: "リーグ所属や試合結果に紐づくため削除できません。",
    };
  }

  try {
    await prisma.team.delete({
      where: { id: teamId },
    });
  } catch (error) {
    console.error("deleteTeam failed", error);

    return {
      status: "error",
      message: "チーム削除に失敗しました。",
    };
  }

  revalidatePath("/admin/teams");

  return {
    status: "success",
    message: `${team.name} を削除しました。`,
  };
}

async function getTeamPayload(formData: FormData) {
  const name = sanitizePlainText(String(formData.get("name") ?? ""), 80);
  const shortName = sanitizePlainText(String(formData.get("shortName") ?? ""), 80);
  const profile = sanitizePlainText(String(formData.get("profile") ?? ""), 1000);
  const founded = sanitizePlainText(String(formData.get("founded") ?? ""), 40);
  const region = sanitizePlainText(String(formData.get("region") ?? ""), 40);
  const representativeName = sanitizePlainText(String(formData.get("representativeName") ?? ""), 80);
  const headCoachName = sanitizePlainText(String(formData.get("headCoachName") ?? ""), 80);
  const websiteUrl = sanitizePlainText(String(formData.get("websiteUrl") ?? ""), 255);
  const logoPath = sanitizePlainText(String(formData.get("logoPath") ?? ""), 255);
  const photoPath = sanitizePlainText(String(formData.get("photoPath") ?? ""), 255);
  const uploadedLogoPath = await uploadTeamImage(formData.get("logoFile"), "logos");
  const uploadedPhotoPath = await uploadTeamImage(formData.get("photoFile"), "photos");
  const sortOrder = Number.parseInt(String(formData.get("sortOrder") ?? "0"), 10);
  const status = String(formData.get("status") ?? "PUBLISHED") as PublishStatus;

  return {
    name,
    slug: ensureSlug(name, "team"),
    shortName: shortName || null,
    profile: profile || null,
    founded: founded || null,
    region: region || null,
    representativeName: representativeName || null,
    headCoachName: headCoachName || null,
    websiteUrl: websiteUrl && websiteUrl !== "ー" && websiteUrl !== "-" ? websiteUrl : null,
    logoPath: uploadedLogoPath ?? (logoPath || null),
    photoPath: uploadedPhotoPath ?? (photoPath || null),
    status: ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status) ? status : PublishStatus.PUBLISHED,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
  };
}

async function uploadTeamImage(fileValue: FormDataEntryValue | null, folder: "logos" | "photos") {
  if (!(fileValue instanceof File) || fileValue.size === 0) {
    return null;
  }

  if (!fileValue.type.startsWith("image/")) {
    throw new Error("画像ファイルのみアップロードできます。");
  }

  if (fileValue.size > 5 * 1024 * 1024) {
    throw new Error("画像サイズは 5MB 以下にしてください。");
  }

  const dimensions = imageSize(Buffer.from(await fileValue.arrayBuffer()));
  const width = dimensions.width ?? 0;
  const height = dimensions.height ?? 0;
  const rules = IMAGE_RULES[folder];

  if (width < rules.minWidth || height < rules.minHeight) {
    throw new Error(`${rules.label}は ${rules.minWidth}x${rules.minHeight}px 以上にしてください。`);
  }

  if ("minAspectRatio" in rules && height > 0 && width / height < rules.minAspectRatio) {
    throw new Error(`${rules.label}は横長画像を指定してください。`);
  }

  const safeName = sanitizePlainText(fileValue.name, 120).replace(/[^a-zA-Z0-9._-]/g, "-");
  const blob = await put(`teams/${folder}/${Date.now()}-${safeName}`, fileValue, {
    access: "public",
    addRandomSuffix: true,
  });

  return blob.url;
}
