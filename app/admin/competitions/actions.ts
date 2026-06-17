"use server";

import { revalidatePath } from "next/cache";
import { CompetitionStatus, CompetitionType, PublishStatus } from "@prisma/client";
import { requireOwner } from "@/lib/admin-access";
import { normalizeDivisionSlug } from "@/lib/league-slug";
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

  revalidateCompetitionAdminPaths();

  return {
    status: "success",
    message: `${label} を保存しました。`,
  };
}

export async function updateSeason(
  _prevState: CompetitionActionState,
  formData: FormData,
): Promise<CompetitionActionState> {
  await requireOwner();

  const seasonId = sanitizePlainText(String(formData.get("seasonId") ?? ""), 64);
  const year = parseInteger(String(formData.get("year") ?? ""));
  const label = sanitizePlainText(String(formData.get("label") ?? ""), 40);
  const isCurrent = String(formData.get("isCurrent") ?? "") === "on";

  if (!isValidUuid(seasonId) || !year || year < 2000 || year > 2100 || !label) {
    return {
      status: "error",
      message: "年度と表示名を確認してください。",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (isCurrent) {
        await tx.season.updateMany({
          where: { id: { not: seasonId } },
          data: { isCurrent: false },
        });
      }

      await tx.season.update({
        where: { id: seasonId },
        data: {
          year,
          label,
          isCurrent,
        },
      });
    });
  } catch {
    return {
      status: "error",
      message: "同じ年度が既に存在する可能性があります。",
    };
  }

  revalidatePath("/admin");
  revalidateCompetitionAdminPaths();
  revalidatePath("/admin/results");

  return {
    status: "success",
    message: `${label} を更新しました。`,
  };
}

export async function deleteSeason(
  _prevState: CompetitionActionState,
  formData: FormData,
): Promise<CompetitionActionState> {
  await requireOwner();

  const seasonId = sanitizePlainText(String(formData.get("seasonId") ?? ""), 64);

  if (!isValidUuid(seasonId)) {
    return {
      status: "error",
      message: "削除対象の年度が見つかりませんでした。",
    };
  }

  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    include: {
      _count: {
        select: {
          competitions: true,
        },
      },
    },
  });

  if (!season) {
    return {
      status: "error",
      message: "削除対象の年度が見つかりませんでした。",
    };
  }

  if (season._count.competitions > 0) {
    return {
      status: "error",
      message: "大会が紐づいているため年度を削除できません。",
    };
  }

  await prisma.season.delete({
    where: { id: seasonId },
  });

  revalidateCompetitionAdminPaths();

  return {
    status: "success",
    message: `${season.label} を削除しました。`,
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
  const startDateText = sanitizePlainText(String(formData.get("startDate") ?? ""), 20);
  const endDateText = sanitizePlainText(String(formData.get("endDate") ?? ""), 20);
  const publishedAtText = sanitizePlainText(String(formData.get("publishedAt") ?? ""), 20);
  const sortOrder = parseInteger(String(formData.get("sortOrder") ?? "0"));
  const status = String(formData.get("status") ?? "DRAFT") as CompetitionStatus;
  const startDate = parseDateInput(startDateText, "date");
  const endDate = parseDateInput(endDateText, "date");
  const publishedAt = status === "PUBLISHED" ? parseDateInput(publishedAtText, "jstDateTime") ?? new Date() : null;

  if (
    !isValidUuid(seasonId) ||
    !name ||
    !slug ||
    !isValidSlug(slug) ||
    !["LEAGUE", "CUP", "OTHER"].includes(type) ||
    !["DRAFT", "PUBLISHED", "CLOSED"].includes(status) ||
    Number.isNaN(sortOrder ?? Number.NaN) ||
    isInvalidDateValue(startDate) ||
    isInvalidDateValue(endDate) ||
    isInvalidDateValue(publishedAt)
  ) {
    return {
      status: "error",
      message: "大会情報の入力内容を確認してください。",
    };
  }

  if (startDate && endDate && startDate > endDate) {
    return {
      status: "error",
      message: "大会期間の開始日と終了日を確認してください。",
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
        startDate,
        endDate,
        publishedAt,
        sortOrder: sortOrder ?? 0,
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

  revalidateCompetitionAdminPaths();

  return {
    status: "success",
    message: `${name} を追加しました。`,
  };
}

export async function updateCompetition(
  _prevState: CompetitionActionState,
  formData: FormData,
): Promise<CompetitionActionState> {
  const scope = await requireOwner();

  const competitionId = sanitizePlainText(String(formData.get("competitionId") ?? ""), 64);
  const seasonId = sanitizePlainText(String(formData.get("seasonId") ?? ""), 64);
  const name = sanitizePlainText(String(formData.get("name") ?? ""), 80);
  const slug = normalizeSlug(String(formData.get("slug") ?? ""), 80);
  const type = String(formData.get("competitionType") ?? "LEAGUE") as CompetitionType;
  const edition = parseInteger(String(formData.get("edition") ?? ""));
  const summary = sanitizePlainText(String(formData.get("summary") ?? ""), 200);
  const startDateText = sanitizePlainText(String(formData.get("startDate") ?? ""), 20);
  const endDateText = sanitizePlainText(String(formData.get("endDate") ?? ""), 20);
  const publishedAtText = sanitizePlainText(String(formData.get("publishedAt") ?? ""), 20);
  const sortOrder = parseInteger(String(formData.get("sortOrder") ?? "0"));
  const status = String(formData.get("status") ?? "DRAFT") as CompetitionStatus;
  const startDate = parseDateInput(startDateText, "date");
  const endDate = parseDateInput(endDateText, "date");
  const publishedAt = status === "PUBLISHED" ? parseDateInput(publishedAtText, "jstDateTime") ?? new Date() : null;

  if (
    !isValidUuid(competitionId) ||
    !isValidUuid(seasonId) ||
    !name ||
    !slug ||
    !isValidSlug(slug) ||
    !["LEAGUE", "CUP", "OTHER"].includes(type) ||
    !["DRAFT", "PUBLISHED", "CLOSED"].includes(status) ||
    Number.isNaN(sortOrder ?? Number.NaN) ||
    isInvalidDateValue(startDate) ||
    isInvalidDateValue(endDate) ||
    isInvalidDateValue(publishedAt)
  ) {
    return {
      status: "error",
      message: "大会情報の入力内容を確認してください。",
    };
  }

  if (startDate && endDate && startDate > endDate) {
    return {
      status: "error",
      message: "大会期間の開始日と終了日を確認してください。",
    };
  }

  try {
    await prisma.competition.update({
      where: { id: competitionId },
      data: {
        seasonId,
        name,
        slug,
        competitionType: type,
        edition: edition ?? null,
        summary: summary || null,
        startDate,
        endDate,
        publishedAt,
        sortOrder: sortOrder ?? 0,
        status,
        updatedById: scope.admin.id,
      },
    });
  } catch {
    return {
      status: "error",
      message: "同じスラッグの大会が既に存在する可能性があります。",
    };
  }

  revalidatePath("/admin");
  revalidateCompetitionAdminPaths(competitionId);
  revalidatePath("/admin/results");

  return {
    status: "success",
    message: `${name} を更新しました。`,
  };
}

export async function deleteCompetition(
  _prevState: CompetitionActionState,
  formData: FormData,
): Promise<CompetitionActionState> {
  await requireOwner();

  const competitionId = sanitizePlainText(String(formData.get("competitionId") ?? ""), 64);

  if (!isValidUuid(competitionId)) {
    return {
      status: "error",
      message: "削除対象の大会が見つかりませんでした。",
    };
  }

  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    include: {
      _count: {
        select: {
          divisions: true,
          files: true,
          newsPosts: true,
        },
      },
    },
  });

  if (!competition) {
    return {
      status: "error",
      message: "削除対象の大会が見つかりませんでした。",
    };
  }

  const referenceCount = competition._count.divisions + competition._count.files + competition._count.newsPosts;

  if (referenceCount > 0) {
    return {
      status: "error",
      message: "リーグ、関連ファイル、ニュースが紐づいているため大会を削除できません。",
    };
  }

  await prisma.competition.delete({
    where: { id: competitionId },
  });

  revalidateCompetitionAdminPaths(competitionId);

  return {
    status: "success",
    message: `${competition.name} を削除しました。`,
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
  const slug = slugInput ? normalizeSlug(slugInput, 80) : normalizeDivisionSlug(name);
  const description = sanitizePlainText(String(formData.get("description") ?? ""), 400);
  const sortOrderInput = parseInteger(String(formData.get("sortOrder") ?? ""));
  const status = String(formData.get("status") ?? "DRAFT") as PublishStatus;

  if (
    !isValidUuid(competitionId) ||
    !name ||
    !slug ||
    !isValidSlug(slug) ||
    !["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)
  ) {
    return {
      status: "error",
      message: "リーグ情報の入力内容を確認してください。",
    };
  }

  try {
    const sortOrder = sortOrderInput ?? (await getNextDivisionSortOrder(competitionId, name));

    await prisma.division.create({
      data: {
        competitionId,
        name,
        slug,
        description: description || null,
        sortOrder,
        status,
      },
    });
  } catch {
    return {
      status: "error",
      message: "同じ大会内に同名のリーグまたは同じスラッグが存在する可能性があります。",
    };
  }

  revalidateCompetitionAdminPaths(competitionId);
  revalidatePath("/admin/assignments");

  return {
    status: "success",
    message: `${name} を追加しました。`,
  };
}

export async function updateDivision(
  _prevState: CompetitionActionState,
  formData: FormData,
): Promise<CompetitionActionState> {
  await requireOwner();

  const divisionId = sanitizePlainText(String(formData.get("divisionId") ?? ""), 64);
  const competitionId = sanitizePlainText(String(formData.get("competitionId") ?? ""), 64);
  const name = sanitizePlainText(String(formData.get("name") ?? ""), 80);
  const slug = normalizeSlug(String(formData.get("slug") ?? ""), 80);
  const description = sanitizePlainText(String(formData.get("description") ?? ""), 400);
  const sortOrder = parseInteger(String(formData.get("sortOrder") ?? "0"));
  const status = String(formData.get("status") ?? "DRAFT") as PublishStatus;

  if (
    !isValidUuid(divisionId) ||
    !isValidUuid(competitionId) ||
    !name ||
    !slug ||
    !isValidSlug(slug) ||
    !["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status) ||
    Number.isNaN(sortOrder ?? Number.NaN)
  ) {
    return {
      status: "error",
      message: "リーグ情報の入力内容を確認してください。",
    };
  }

  try {
    await prisma.division.update({
      where: { id: divisionId },
      data: {
        competitionId,
        name,
        slug,
        description: description || null,
        sortOrder: sortOrder ?? 0,
        status,
      },
    });
  } catch {
    return {
      status: "error",
      message: "同じ大会内に同じスラッグのリーグが存在する可能性があります。",
    };
  }

  revalidatePath("/admin");
  revalidateCompetitionAdminPaths(competitionId);
  revalidatePath("/admin/results");
  revalidatePath("/admin/assignments");

  return {
    status: "success",
    message: `${name} を更新しました。`,
  };
}

export async function deleteDivision(
  _prevState: CompetitionActionState,
  formData: FormData,
): Promise<CompetitionActionState> {
  await requireOwner();

  const divisionId = sanitizePlainText(String(formData.get("divisionId") ?? ""), 64);

  if (!isValidUuid(divisionId)) {
    return {
      status: "error",
      message: "削除対象のリーグが見つかりませんでした。",
    };
  }

  const division = await prisma.division.findUnique({
    where: { id: divisionId },
    include: {
      _count: {
        select: {
          teams: true,
          matches: true,
          standings: true,
          editorAssignments: true,
        },
      },
    },
  });

  if (!division) {
    return {
      status: "error",
      message: "削除対象のリーグが見つかりませんでした。",
    };
  }

  const referenceCount =
    division._count.teams + division._count.matches + division._count.standings + division._count.editorAssignments;

  if (referenceCount > 0) {
    return {
      status: "error",
      message: "所属チーム、試合、順位表、担当割当が紐づいているためリーグを削除できません。",
    };
  }

  await prisma.division.delete({
    where: { id: divisionId },
  });

  revalidatePath("/admin");
  revalidateCompetitionAdminPaths(division.competitionId);
  revalidatePath("/admin/results");
  revalidatePath("/admin/assignments");

  return {
    status: "success",
    message: `${division.name} を削除しました。`,
  };
}

export async function assignTeamToDivision(
  _prevState: CompetitionActionState,
  formData: FormData,
): Promise<CompetitionActionState> {
  await requireOwner();

  const divisionId = sanitizePlainText(String(formData.get("divisionId") ?? ""), 64);
  const teamId = sanitizePlainText(String(formData.get("teamId") ?? ""), 64);
  const sortOrderInput = parseInteger(String(formData.get("sortOrder") ?? ""));

  if (!isValidUuid(divisionId) || !isValidUuid(teamId)) {
    return {
      status: "error",
      message: "リーグとチームを選択してください。",
    };
  }

  const division = await prisma.division.findUnique({
    where: {
      id: divisionId,
    },
    select: {
      competitionId: true,
    },
  });

  if (!division) {
    return {
      status: "error",
      message: "リーグを選択してください。",
    };
  }

  const existing = await prisma.divisionTeam.findFirst({
    where: {
      divisionId,
      teamId,
    },
  });

  if (!existing) {
    const sortOrder = sortOrderInput ?? (await getNextDivisionTeamSortOrder(divisionId));

    await prisma.divisionTeam.create({
      data: {
        divisionId,
        teamId,
        sortOrder,
      },
    });
  }

  revalidateCompetitionAdminPaths(division.competitionId);

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

  const assignment = await prisma.divisionTeam.findUnique({
    where: {
      id: assignmentId,
    },
    select: {
      division: {
        select: {
          competitionId: true,
        },
      },
    },
  });

  if (!assignment) {
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

  revalidateCompetitionAdminPaths(assignment.division.competitionId);

  return {
    status: "success",
    message: "リーグ所属チームを解除しました。",
  };
}

async function getNextDivisionSortOrder(competitionId: string, divisionName: string) {
  const letterMatch = divisionName.trim().match(/^([A-Z])/i);

  if (letterMatch) {
    return letterMatch[1].toUpperCase().charCodeAt(0) - 64;
  }

  const lastDivision = await prisma.division.findFirst({
    where: { competitionId },
    orderBy: [{ sortOrder: "desc" }],
    select: { sortOrder: true },
  });

  return (lastDivision?.sortOrder ?? 0) + 1;
}

async function getNextDivisionTeamSortOrder(divisionId: string) {
  const lastAssignment = await prisma.divisionTeam.findFirst({
    where: { divisionId },
    orderBy: [{ sortOrder: "desc" }],
    select: { sortOrder: true },
  });

  return (lastAssignment?.sortOrder ?? 0) + 1;
}

function parseDateInput(value: string, mode: "date" | "jstDateTime") {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return new Date(Number.NaN);
  }

  const [, year, month, day] = match;

  if (mode === "jstDateTime") {
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), -9, 0, 0));
  }

  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 0, 0, 0));
}

function isInvalidDateValue(value: Date | null) {
  return value instanceof Date && Number.isNaN(value.getTime());
}

function revalidateCompetitionAdminPaths(competitionId?: string | null) {
  revalidatePath("/admin/competitions");
  revalidatePath("/admin/competitions/list");

  if (competitionId) {
    revalidatePath(`/admin/competitions/${competitionId}`);
  }
}
