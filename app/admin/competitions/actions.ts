"use server";

import { revalidatePath } from "next/cache";
import { CompetitionStatus, CompetitionType, PublishStatus } from "@prisma/client";
import { requireOwner } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import {
  isValidSlug,
  isValidUuid,
  normalizeSlug,
  parseInteger,
  sanitizePlainText,
} from "@/lib/security";

export type CompetitionActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function createSeason(
  _prevState: CompetitionActionState,
  formData: FormData,
): Promise<CompetitionActionState> {
  const scope = await requireOwner();

  const year = parseInteger(String(formData.get("year") ?? ""));
  const label = sanitizePlainText(String(formData.get("label") ?? ""), 40);
  const isCurrent = String(formData.get("isCurrent") ?? "") === "on";

  if (!year || year < 2000 || year > 2100 || !label) {
    return {
      status: "error",
      message: "年度と表示名を確認してください。",
    };
  }

  await prisma.$transaction(async (tx) => {
    if (isCurrent) {
      await tx.season.updateMany({
        data: { isCurrent: false },
      });
    }

    await tx.season.upsert({
      where: { year },
      update: {
        label,
        isCurrent,
      },
      create: {
        year,
        label,
        isCurrent,
      },
    });
  });

  revalidatePath("/admin/competitions");

  return {
    status: "success",
    message: `${label} を保存しました。`,
  };
}

export async function createCompetition(
  _prevState: CompetitionActionState,
  formData: FormData,
): Promise<CompetitionActionState> {
  const scope = await requireOwner();

  const seasonId = sanitizePlainText(String(formData.get("seasonId") ?? ""), 64);
  const name = sanitizePlainText(String(formData.get("name") ?? ""), 80);
  const slugInput = sanitizePlainText(String(formData.get("slug") ?? ""), 80);
  const slug = normalizeSlug(slugInput || name, 80);
  const type = String(formData.get("competitionType") ?? "LEAGUE") as CompetitionType;
  const edition = parseInteger(String(formData.get("edition") ?? ""));
  const summary = sanitizePlainText(String(formData.get("summary") ?? ""), 200);
  const status = String(formData.get("status") ?? "DRAFT") as CompetitionStatus;

  if (
    !isValidUuid(seasonId) ||
    !name ||
    !slug ||
    !isValidSlug(slug) ||
    !["LEAGUE", "CUP", "OTHER"].includes(type) ||
    !["DRAFT", "PUBLISHED", "CLOSED"].includes(status)
  ) {
    return {
      status: "error",
      message: "大会情報の入力内容を確認してください。",
    };
  }

  try {
    await prisma.competition.create({
      data: {
        seasonId,
        name,
        slug,
        competitionType: type,
        edition: edition ?? undefined,
        summary: summary || null,
        status,
        createdById: scope.admin.id,
        updatedById: scope.admin.id,
      },
    });
  } catch {
    return {
      status: "error",
      message: "同じスラッグの大会が既に存在する可能性があります。",
    };
  }

  revalidatePath("/admin/competitions");

  return {
    status: "success",
    message: `${name} を追加しました。`,
  };
}

export async function createDivision(
  _prevState: CompetitionActionState,
  formData: FormData,
): Promise<CompetitionActionState> {
  await requireOwner();

  const competitionId = sanitizePlainText(String(formData.get("competitionId") ?? ""), 64);
  const name = sanitizePlainText(String(formData.get("name") ?? ""), 80);
  const slugInput = sanitizePlainText(String(formData.get("slug") ?? ""), 80);
  const slug = normalizeSlug(slugInput || name, 80);
  const sortOrder = parseInteger(String(formData.get("sortOrder") ?? "0"));

  if (!isValidUuid(competitionId) || !name || !slug || !isValidSlug(slug)) {
    return {
      status: "error",
      message: "リーグ情報の入力内容を確認してください。",
    };
  }

  try {
    await prisma.division.create({
      data: {
        competitionId,
        name,
        slug,
        sortOrder: sortOrder ?? 0,
        status: PublishStatus.DRAFT,
      },
    });
  } catch {
    return {
      status: "error",
      message: "同じ大会内に同名のリーグまたは同じスラッグが存在する可能性があります。",
    };
  }

  revalidatePath("/admin/competitions");
  revalidatePath("/admin/assignments");

  return {
    status: "success",
    message: `${name} を追加しました。`,
  };
}

export async function assignTeamToDivision(
  _prevState: CompetitionActionState,
  formData: FormData,
): Promise<CompetitionActionState> {
  await requireOwner();

  const divisionId = sanitizePlainText(String(formData.get("divisionId") ?? ""), 64);
  const teamId = sanitizePlainText(String(formData.get("teamId") ?? ""), 64);
  const sortOrder = parseInteger(String(formData.get("sortOrder") ?? "0"));

  if (!isValidUuid(divisionId) || !isValidUuid(teamId)) {
    return {
      status: "error",
      message: "リーグとチームを選択してください。",
    };
  }

  const existing = await prisma.divisionTeam.findFirst({
    where: {
      divisionId,
      teamId,
    },
  });

  if (!existing) {
    await prisma.divisionTeam.create({
      data: {
        divisionId,
        teamId,
        sortOrder: sortOrder ?? 0,
      },
    });
  }

  revalidatePath("/admin/competitions");

  return {
    status: "success",
    message: existing ? "このチームは既に所属済みです。" : "リーグにチームを追加しました。",
  };
}

export async function removeTeamFromDivision(
  _prevState: CompetitionActionState,
  formData: FormData,
): Promise<CompetitionActionState> {
  await requireOwner();

  const assignmentId = sanitizePlainText(String(formData.get("assignmentId") ?? ""), 64);

  if (!isValidUuid(assignmentId)) {
    return {
      status: "error",
      message: "解除対象の所属情報が見つかりませんでした。",
    };
  }

  await prisma.divisionTeam.delete({
    where: {
      id: assignmentId,
    },
  });

  revalidatePath("/admin/competitions");

  return {
    status: "success",
    message: "リーグ所属チームを解除しました。",
  };
}
