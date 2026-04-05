"use server";

import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { MatchStatus, PublishStatus } from "@prisma/client";
import { getAdminScope } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { isValidUuid, parseInteger, sanitizePlainText } from "@/lib/security";

export type ResultActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function updateDivisionResultImage(
  _prevState: ResultActionState,
  formData: FormData,
): Promise<ResultActionState> {
  const scope = await getAdminScope();
  const divisionId = sanitizePlainText(String(formData.get("divisionId") ?? ""), 64);
  const currentResultImagePath = sanitizePlainText(String(formData.get("currentResultImagePath") ?? ""), 255);
  const description = sanitizePlainText(String(formData.get("description") ?? ""), 400);

  if (!isValidUuid(divisionId)) {
    return { status: "error", message: "対象リーグが見つかりませんでした。" };
  }

  if (!canEditDivision(scope, divisionId)) {
    return { status: "error", message: "このリーグを編集する権限がありません。" };
  }

  let resultImagePath: string | null = currentResultImagePath || null;

  try {
    const uploadedResultPath = await uploadResultImage(formData.get("resultImageFile"));
    resultImagePath = uploadedResultPath ?? resultImagePath;
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "結果画像のアップロードに失敗しました。",
    };
  }

  await prisma.division.update({
    where: { id: divisionId },
    data: {
      resultImagePath,
      description: description || null,
      status: PublishStatus.PUBLISHED,
      lastUpdatedAt: new Date(),
    },
  });

  revalidatePath("/admin/results");

  return {
    status: "success",
    message: "結果画像を更新しました。",
  };
}

export async function createMatch(
  _prevState: ResultActionState,
  formData: FormData,
): Promise<ResultActionState> {
  const scope = await getAdminScope();
  const divisionId = sanitizePlainText(String(formData.get("divisionId") ?? ""), 64);
  const homeTeamId = sanitizePlainText(String(formData.get("homeTeamId") ?? ""), 64);
  const awayTeamId = sanitizePlainText(String(formData.get("awayTeamId") ?? ""), 64);
  const matchDateText = sanitizePlainText(String(formData.get("matchDate") ?? ""), 20);
  const venueName = sanitizePlainText(String(formData.get("venueName") ?? ""), 80);
  const homeScore = parseInteger(String(formData.get("homeScore") ?? ""));
  const awayScore = parseInteger(String(formData.get("awayScore") ?? ""));
  const note = sanitizePlainText(String(formData.get("note") ?? ""), 240);

  if (!isValidUuid(divisionId) || !isValidUuid(homeTeamId) || !isValidUuid(awayTeamId) || !matchDateText) {
    return { status: "error", message: "試合情報の入力内容を確認してください。" };
  }

  if (homeTeamId === awayTeamId) {
    return { status: "error", message: "同じチーム同士では登録できません。" };
  }

  if (!canEditDivision(scope, divisionId)) {
    return { status: "error", message: "このリーグを編集する権限がありません。" };
  }

  const matchDate = new Date(matchDateText);

  if (Number.isNaN(matchDate.getTime())) {
    return { status: "error", message: "試合日を確認してください。" };
  }

  const venueId = await resolveVenueId(venueName);

  await prisma.match.create({
    data: {
      divisionId,
      matchDate,
      venueId,
      homeTeamId,
      awayTeamId,
      homeScore: homeScore ?? null,
      awayScore: awayScore ?? null,
      status: homeScore !== null && awayScore !== null ? MatchStatus.PLAYED : MatchStatus.SCHEDULED,
      note: note || null,
      createdById: scope.admin.id,
      updatedById: scope.admin.id,
    },
  });

  revalidatePath("/admin/results");

  return {
    status: "success",
    message: "試合結果を追加しました。",
  };
}

export async function updateMatch(
  _prevState: ResultActionState,
  formData: FormData,
): Promise<ResultActionState> {
  const scope = await getAdminScope();
  const matchId = sanitizePlainText(String(formData.get("matchId") ?? ""), 64);
  const divisionId = sanitizePlainText(String(formData.get("divisionId") ?? ""), 64);
  const homeTeamId = sanitizePlainText(String(formData.get("homeTeamId") ?? ""), 64);
  const awayTeamId = sanitizePlainText(String(formData.get("awayTeamId") ?? ""), 64);
  const matchDateText = sanitizePlainText(String(formData.get("matchDate") ?? ""), 20);
  const venueName = sanitizePlainText(String(formData.get("venueName") ?? ""), 80);
  const homeScore = parseInteger(String(formData.get("homeScore") ?? ""));
  const awayScore = parseInteger(String(formData.get("awayScore") ?? ""));
  const note = sanitizePlainText(String(formData.get("note") ?? ""), 240);

  if (!isValidUuid(matchId) || !isValidUuid(divisionId) || !isValidUuid(homeTeamId) || !isValidUuid(awayTeamId)) {
    return { status: "error", message: "試合情報の入力内容を確認してください。" };
  }

  if (homeTeamId === awayTeamId) {
    return { status: "error", message: "同じチーム同士では登録できません。" };
  }

  if (!canEditDivision(scope, divisionId)) {
    return { status: "error", message: "このリーグを編集する権限がありません。" };
  }

  const matchDate = new Date(matchDateText);

  if (Number.isNaN(matchDate.getTime())) {
    return { status: "error", message: "試合日を確認してください。" };
  }

  const venueId = await resolveVenueId(venueName);

  await prisma.match.update({
    where: { id: matchId },
    data: {
      matchDate,
      venueId,
      homeTeamId,
      awayTeamId,
      homeScore: homeScore ?? null,
      awayScore: awayScore ?? null,
      status: homeScore !== null && awayScore !== null ? MatchStatus.PLAYED : MatchStatus.SCHEDULED,
      note: note || null,
      updatedById: scope.admin.id,
    },
  });

  revalidatePath("/admin/results");

  return {
    status: "success",
    message: "試合結果を更新しました。",
  };
}

export async function deleteMatch(
  _prevState: ResultActionState,
  formData: FormData,
): Promise<ResultActionState> {
  const scope = await getAdminScope();
  const matchId = sanitizePlainText(String(formData.get("matchId") ?? ""), 64);
  const divisionId = sanitizePlainText(String(formData.get("divisionId") ?? ""), 64);

  if (!isValidUuid(matchId) || !isValidUuid(divisionId)) {
    return { status: "error", message: "削除対象の試合が見つかりませんでした。" };
  }

  if (!canEditDivision(scope, divisionId)) {
    return { status: "error", message: "このリーグを編集する権限がありません。" };
  }

  await prisma.match.delete({
    where: { id: matchId },
  });

  revalidatePath("/admin/results");

  return {
    status: "success",
    message: "試合結果を削除しました。",
  };
}

export async function upsertStanding(
  _prevState: ResultActionState,
  formData: FormData,
): Promise<ResultActionState> {
  const scope = await getAdminScope();
  const divisionId = sanitizePlainText(String(formData.get("divisionId") ?? ""), 64);
  const teamId = sanitizePlainText(String(formData.get("teamId") ?? ""), 64);
  const rank = parseInteger(String(formData.get("rank") ?? ""));
  const played = parseInteger(String(formData.get("played") ?? "0"));
  const won = parseInteger(String(formData.get("won") ?? "0"));
  const drawn = parseInteger(String(formData.get("drawn") ?? "0"));
  const lost = parseInteger(String(formData.get("lost") ?? "0"));
  const goalsFor = parseInteger(String(formData.get("goalsFor") ?? "0"));
  const goalsAgainst = parseInteger(String(formData.get("goalsAgainst") ?? "0"));
  const points = parseInteger(String(formData.get("points") ?? "0"));

  if (!isValidUuid(divisionId) || !isValidUuid(teamId) || !rank) {
    return { status: "error", message: "順位表の入力内容を確認してください。" };
  }

  if (!canEditDivision(scope, divisionId)) {
    return { status: "error", message: "このリーグを編集する権限がありません。" };
  }

  await prisma.standing.upsert({
    where: {
      divisionId_teamId: {
        divisionId,
        teamId,
      },
    },
    update: {
      rank,
      played: played ?? 0,
      won: won ?? 0,
      drawn: drawn ?? 0,
      lost: lost ?? 0,
      goalsFor: goalsFor ?? 0,
      goalsAgainst: goalsAgainst ?? 0,
      goalDifference: (goalsFor ?? 0) - (goalsAgainst ?? 0),
      points: points ?? 0,
    },
    create: {
      divisionId,
      teamId,
      rank,
      played: played ?? 0,
      won: won ?? 0,
      drawn: drawn ?? 0,
      lost: lost ?? 0,
      goalsFor: goalsFor ?? 0,
      goalsAgainst: goalsAgainst ?? 0,
      goalDifference: (goalsFor ?? 0) - (goalsAgainst ?? 0),
      points: points ?? 0,
    },
  });

  revalidatePath("/admin/results");

  return {
    status: "success",
    message: "順位表を更新しました。",
  };
}

export async function deleteStanding(
  _prevState: ResultActionState,
  formData: FormData,
): Promise<ResultActionState> {
  const scope = await getAdminScope();
  const standingId = sanitizePlainText(String(formData.get("standingId") ?? ""), 64);
  const divisionId = sanitizePlainText(String(formData.get("divisionId") ?? ""), 64);

  if (!isValidUuid(standingId) || !isValidUuid(divisionId)) {
    return { status: "error", message: "削除対象の順位表行が見つかりませんでした。" };
  }

  if (!canEditDivision(scope, divisionId)) {
    return { status: "error", message: "このリーグを編集する権限がありません。" };
  }

  await prisma.standing.delete({
    where: { id: standingId },
  });

  revalidatePath("/admin/results");

  return {
    status: "success",
    message: "順位表の行を削除しました。",
  };
}

export async function regenerateStandingsFromMatches(
  _prevState: ResultActionState,
  formData: FormData,
): Promise<ResultActionState> {
  try {
    const scope = await getAdminScope();
    const divisionId = sanitizePlainText(String(formData.get("divisionId") ?? ""), 64);

    if (!isValidUuid(divisionId)) {
      return { status: "error", message: "対象リーグが見つかりませんでした。" };
    }

    if (!canEditDivision(scope, divisionId)) {
      return { status: "error", message: "このリーグを編集する権限がありません。" };
    }

    const division = await prisma.division.findUnique({
      where: { id: divisionId },
      include: {
        teams: {
          include: { team: true },
        },
        matches: {
          where: {
            status: MatchStatus.PLAYED,
            homeScore: { not: null },
            awayScore: { not: null },
          },
          include: {
            homeTeam: true,
            awayTeam: true,
          },
          orderBy: [{ matchDate: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    if (!division) {
      return { status: "error", message: "対象リーグが見つかりませんでした。" };
    }

    if (division.matches.length === 0) {
      return { status: "error", message: "再計算できる試合結果がありません。" };
    }

    const teamNameMap = new Map<string, string>();

    for (const assignment of division.teams) {
      teamNameMap.set(assignment.teamId, assignment.team.name);
    }

    for (const match of division.matches) {
      teamNameMap.set(match.homeTeamId, match.homeTeam.name);
      teamNameMap.set(match.awayTeamId, match.awayTeam.name);
    }

    const participantTeamIds = Array.from(
      new Set([
        ...division.teams.map((assignment) => assignment.teamId),
        ...division.matches.flatMap((match) => [match.homeTeamId, match.awayTeamId]),
      ]),
    );

    if (participantTeamIds.length === 0) {
      return { status: "error", message: "再計算対象のチームが見つかりませんでした。" };
    }

    const table = new Map(
      participantTeamIds.map((teamId) => [
        teamId,
        {
          teamId,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
        },
      ]),
    );

    for (const match of division.matches) {
      const home = table.get(match.homeTeamId);
      const away = table.get(match.awayTeamId);

      if (!home || !away || match.homeScore === null || match.awayScore === null) {
        continue;
      }

      home.played += 1;
      away.played += 1;
      home.goalsFor += match.homeScore;
      home.goalsAgainst += match.awayScore;
      away.goalsFor += match.awayScore;
      away.goalsAgainst += match.homeScore;

      if (match.homeScore > match.awayScore) {
        home.won += 1;
        away.lost += 1;
        home.points += 3;
      } else if (match.homeScore < match.awayScore) {
        away.won += 1;
        home.lost += 1;
        away.points += 3;
      } else {
        home.drawn += 1;
        away.drawn += 1;
        home.points += 1;
        away.points += 1;
      }
    }

    const rows = Array.from(table.values())
      .map((row) => ({
        ...row,
        goalDifference: row.goalsFor - row.goalsAgainst,
      }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        const aName = teamNameMap.get(a.teamId) ?? "";
        const bName = teamNameMap.get(b.teamId) ?? "";
        return aName.localeCompare(bName, "ja");
      })
      .map((row, index) => ({
        ...row,
        rank: index + 1,
      }));

    await prisma.$transaction(async (tx) => {
      await tx.standing.deleteMany({
        where: { divisionId },
      });

      if (rows.length > 0) {
        await tx.standing.createMany({
          data: rows.map((row) => ({
            divisionId,
            teamId: row.teamId,
            rank: row.rank,
            played: row.played,
            won: row.won,
            drawn: row.drawn,
            lost: row.lost,
            goalsFor: row.goalsFor,
            goalsAgainst: row.goalsAgainst,
            goalDifference: row.goalDifference,
            points: row.points,
          })),
        });
      }
    });

    revalidatePath("/admin/results");

    return {
      status: "success",
      message: "試合結果から順位表を再計算しました。",
    };
  } catch (error) {
    console.error("regenerateStandingsFromMatches failed", error);
    return {
      status: "error",
      message: "順位表の再計算に失敗しました。ログを確認してください。",
    };
  }
}

function canEditDivision(
  scope: Awaited<ReturnType<typeof getAdminScope>>,
  divisionId: string,
) {
  return scope.admin.role === "OWNER" || scope.accessibleDivisions.some((division) => division.id === divisionId);
}

async function uploadResultImage(fileValue: FormDataEntryValue | null) {
  if (!(fileValue instanceof File) || fileValue.size === 0) {
    return null;
  }

  if (!fileValue.type.startsWith("image/")) {
    throw new Error("結果画像は画像ファイルのみアップロードできます。");
  }

  if (fileValue.size > 10 * 1024 * 1024) {
    throw new Error("結果画像は 10MB 以下にしてください。");
  }

  const safeName = sanitizePlainText(fileValue.name, 120).replace(/[^a-zA-Z0-9._-]/g, "-");
  const blob = await put(`results/${Date.now()}-${safeName}`, fileValue, {
    access: "public",
    addRandomSuffix: true,
  });

  return blob.url;
}

async function resolveVenueId(venueName: string) {
  if (!venueName) {
    return null;
  }

  const venue = await prisma.venue.upsert({
    where: { name: venueName },
    update: {},
    create: { name: venueName },
    select: { id: true },
  });

  return venue.id;
}
