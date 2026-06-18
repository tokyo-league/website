"use server";

import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { PublishStatus } from "@prisma/client";
import { requireOwner } from "@/lib/admin-access";
import { assertImageFileAllowed } from "@/lib/image-file-validation";
import { prisma } from "@/lib/prisma";
import { ensureSlug, isValidUuid, sanitizePlainText } from "@/lib/security";
import { isE2ETestMode } from "@/lib/test-mode";
import { normalizeOptionalAssetPath, normalizeOptionalHttpUrl } from "@/lib/url-validation";
import { IMAGE_UPLOAD_MAX_BYTES } from "@/lib/upload-limits";

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

class TeamInputError extends Error {}

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

    if (isE2ETestMode()) {
      revalidatePath("/admin/teams");

      return {
        status: "success",
        message: `${payload.name} を追加しました。`,
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
    if (!(error instanceof TeamInputError)) {
      console.error("createTeam failed", error);
    }

    return {
      status: "error",
      message: error instanceof TeamInputError ? error.message : "チーム保存に失敗しました。入力内容またはサーバーログを確認してください。",
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
    if (!(error instanceof TeamInputError)) {
      console.error("updateTeam failed", error);
    }

    return {
      status: "error",
      message: error instanceof TeamInputError ? error.message : "チーム情報の更新に失敗しました。",
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
    const matchCount = team._count.homeMatches + team._count.awayMatches;

    return {
      status: "error",
      message: `リーグ所属や試合結果に紐づくため削除できません。所属リーグ ${team._count.divisions} / 試合 ${matchCount} / 順位 ${team._count.standings}`,
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
  const websiteUrl = normalizeTeamHttpUrl(String(formData.get("websiteUrl") ?? ""), "公式サイトURL");
  const instagramUrl = normalizeInstagramUrl(String(formData.get("instagramUrl") ?? ""));
  const logoPath = normalizeTeamAssetPath(String(formData.get("logoPath") ?? ""), "ロゴ画像URL");
  const photoPath = normalizeTeamAssetPath(String(formData.get("photoPath") ?? ""), "チーム画像URL");
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
    websiteUrl,
    instagramUrl,
    logoPath: uploadedLogoPath ?? logoPath,
    photoPath: uploadedPhotoPath ?? photoPath,
    status: ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status) ? status : PublishStatus.PUBLISHED,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
  };
}

function normalizeTeamHttpUrl(value: string, label: string) {
  try {
    return normalizeOptionalHttpUrl(value, label);
  } catch (error) {
    throw new TeamInputError(error instanceof Error ? error.message : `${label}を確認してください。`);
  }
}

function normalizeTeamAssetPath(value: string, label: string) {
  try {
    return normalizeOptionalAssetPath(value, label);
  } catch (error) {
    throw new TeamInputError(error instanceof Error ? error.message : `${label}を確認してください。`);
  }
}

function normalizeInstagramUrl(value: string) {
  const input = sanitizePlainText(value, 255);

  if (!input || input === "ー" || input === "-") {
    return null;
  }

  if (input.startsWith("@")) {
    return instagramHandleToUrl(input.slice(1));
  }

  if (!/^https?:\/\//i.test(input)) {
    return instagramHandleToUrl(input);
  }

  try {
    const url = new URL(input);
    const hostname = url.hostname.toLowerCase();

    if (hostname !== "instagram.com" && hostname !== "www.instagram.com") {
      throw new TeamInputError("Instagram URL は instagram.com のURLを入力してください。");
    }

    const handle = url.pathname.split("/").filter(Boolean)[0];

    return instagramHandleToUrl(handle);
  } catch (error) {
    if (error instanceof TeamInputError) {
      throw error;
    }

    throw new TeamInputError("Instagram URL を確認してください。");
  }
}

function instagramHandleToUrl(handle: string | undefined) {
  const normalizedHandle = sanitizePlainText(handle ?? "", 80).replace(/^@+/, "");
  const reservedPaths = new Set(["accounts", "explore", "p", "reel", "stories", "tv"]);

  if (!/^[a-zA-Z0-9._]{1,30}$/.test(normalizedHandle)) {
    throw new TeamInputError("Instagramアカウント名は英数字、ピリオド、アンダースコアで入力してください。");
  }

  if (reservedPaths.has(normalizedHandle.toLowerCase())) {
    throw new TeamInputError("Instagram URL はプロフィールページのURLを入力してください。");
  }

  return `https://www.instagram.com/${normalizedHandle}/`;
}

async function uploadTeamImage(fileValue: FormDataEntryValue | null, folder: "logos" | "photos") {
  if (!(fileValue instanceof File) || fileValue.size === 0) {
    return null;
  }

  const rules = IMAGE_RULES[folder];
  const fileBuffer = Buffer.from(await fileValue.arrayBuffer());
  try {
    assertImageFileAllowed({
      filename: fileValue.name,
      mimeType: fileValue.type,
      size: fileValue.size,
      buffer: fileBuffer,
      rules: {
        ...rules,
        maxSizeBytes: IMAGE_UPLOAD_MAX_BYTES,
      },
    });
  } catch (error) {
    throw new TeamInputError(error instanceof Error ? error.message : `${rules.label}を確認してください。`);
  }

  const safeName = sanitizePlainText(fileValue.name, 120).replace(/[^a-zA-Z0-9._-]/g, "-");
  const blob = await put(`teams/${folder}/${Date.now()}-${safeName}`, fileValue, {
    access: "public",
    addRandomSuffix: true,
  });

  return blob.url;
}
