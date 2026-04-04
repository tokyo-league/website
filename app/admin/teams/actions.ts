"use server";

import { revalidatePath } from "next/cache";
import { PublishStatus } from "@prisma/client";
import { requireOwner } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { ensureSlug, isValidUuid, sanitizePlainText } from "@/lib/security";

export type TeamActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialTeamActionState: TeamActionState = {
  status: "idle",
  message: "",
};

export async function createTeam(
  _prevState: TeamActionState,
  formData: FormData,
): Promise<TeamActionState> {
  await requireOwner();

  const payload = getTeamPayload(formData);

  if (!payload.name) {
    return {
      status: "error",
      message: "チーム名を入力してください。",
    };
  }

  try {
    await prisma.team.create({
      data: payload,
    });
  } catch {
    return {
      status: "error",
      message: "同名のチームまたは同じ内部識別子のチームが既に存在する可能性があります。",
    };
  }

  revalidatePath("/admin/teams");

  return {
    status: "success",
    message: `${payload.name} を追加しました。`,
  };
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

  const payload = getTeamPayload(formData);

  if (!payload.name) {
    return {
      status: "error",
      message: "チーム名を入力してください。",
    };
  }

  try {
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
  } catch {
    return {
      status: "error",
      message: "チーム情報の更新に失敗しました。",
    };
  }

  revalidatePath("/admin/teams");
  revalidatePath(`/admin/teams/${teamId}`);

  return {
    status: "success",
    message: `${payload.name} を更新しました。`,
  };
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

  await prisma.team.delete({
    where: { id: teamId },
  });

  revalidatePath("/admin/teams");

  return {
    status: "success",
    message: `${team.name} を削除しました。`,
  };
}

function getTeamPayload(formData: FormData) {
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
    logoPath: logoPath || null,
    photoPath: photoPath || null,
    status: ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status) ? status : PublishStatus.PUBLISHED,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
  };
}
