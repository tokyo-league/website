"use server";

import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { MatchStatus, PublishStatus } from "@prisma/client";
import { getAdminScope } from "@/lib/admin-access";
import { VERIFIED_FROM_RESULT_IMAGE_NOTE } from "@/lib/historical-results";
import { assertImageFileAllowed } from "@/lib/image-file-validation";
import { prisma } from "@/lib/prisma";
import { isValidUuid, parseInteger, sanitizePlainText } from "@/lib/security";
import { getStarTableDivisionById } from "@/lib/standings-star-table-data";
import { renderStandingsStarTableSvg } from "@/lib/standings-star-table";
import { IMAGE_UPLOAD_MAX_BYTES } from "@/lib/upload-limits";

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

export async function useGeneratedStarTableAsResultImage(
  _prevState: ResultActionState,
  formData: FormData,
): Promise<ResultActionState> {
  const scope = await getAdminScope();
  const divisionId = sanitizePlainText(String(formData.get("divisionId") ?? ""), 64);
  const description = sanitizePlainText(String(formData.get("description") ?? ""), 400);

  if (!isValidUuid(divisionId)) {
    return { status: "error", message: "対象リーグが見つかりませんでした。" };
  }

  if (!canEditDivision(scope, divisionId)) {
    return { status: "error", message: "このリーグを編集する権限がありません。" };
  }

  const division = await getStarTableDivisionById(divisionId);

  if (!division || division.teams.length === 0) {
    return { status: "error", message: "星取表を作成できるチームがありません。" };
  }

  try {
    const svg = renderStandingsStarTableSvg(division);
    const safeName = `${division.competitionName}-${division.divisionName}-star-table.svg`
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/[^a-zA-Z0-9._\-\u3040-\u30ff\u3400-\u9fff]/g, "-");
    const file = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const blob = await put(`results/${Date.now()}-${safeName}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: "image/svg+xml;charset=utf-8",
    });

    await prisma.division.update({
      where: { id: divisionId },
      data: {
        resultImagePath: blob.url,
        description: description || null,
        status: PublishStatus.PUBLISHED,
        lastUpdatedAt: new Date(),
      },
    });

    revalidatePath("/admin/results");

    return {
      status: "success",
      message: "星取表画像を結果画像として登録しました。",
    };
  } catch (error) {
    console.error("useGeneratedStarTableAsResultImage failed", error);
    return {
      status: "error",
      message: "星取表画像の登録に失敗しました。Blob設定を確認してください。",
    };
  }
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

export async function importMatchesFromExcel(
  _prevState: ResultActionState,
  formData: FormData,
): Promise<ResultActionState> {
  try {
    const scope = await getAdminScope();
    const divisionId = sanitizePlainText(String(formData.get("divisionId") ?? ""), 64);
    const rowsJson = String(formData.get("rowsJson") ?? "");

    if (!isValidUuid(divisionId) || !rowsJson || rowsJson.length > 200_000) {
      return { status: "error", message: "Excel入稿データを確認してください。" };
    }

    if (!canEditDivision(scope, divisionId)) {
      return { status: "error", message: "このリーグを編集する権限がありません。" };
    }

    const parsed = JSON.parse(rowsJson) as unknown;

    if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 200) {
      return { status: "error", message: "入稿できる試合データは1〜200件です。" };
    }

    const rows = parsed.map((raw) => {
      const row = typeof raw === "object" && raw !== null ? raw as Record<string, unknown> : {};
      return {
        sourceRow: parseInteger(String(row.sourceRow ?? "")) ?? 0,
        matchDate: sanitizePlainText(String(row.matchDate ?? ""), 10),
        homeTeamId: sanitizePlainText(String(row.homeTeamId ?? ""), 64),
        awayTeamId: sanitizePlainText(String(row.awayTeamId ?? ""), 64),
        homeScore: parseInteger(String(row.homeScore ?? "")),
        awayScore: parseInteger(String(row.awayScore ?? "")),
        venueName: sanitizePlainText(String(row.venueName ?? ""), 80),
      };
    });

    const invalidRow = rows.find(
      (row) =>
        !isValidUuid(row.homeTeamId) ||
        !isValidUuid(row.awayTeamId) ||
        row.homeTeamId === row.awayTeamId ||
        !isValidImportDate(row.matchDate) ||
        row.homeScore === null ||
        row.awayScore === null ||
        row.homeScore < 0 ||
        row.awayScore < 0 ||
        row.homeScore > 99 ||
        row.awayScore > 99,
    );

    if (invalidRow) {
      return { status: "error", message: `${invalidRow.sourceRow || "不明"}行目の試合データを確認してください。` };
    }

    const division = await prisma.division.findUnique({
      where: { id: divisionId },
      select: {
        teams: { select: { teamId: true } },
        matches: {
          select: { id: true, homeTeamId: true, awayTeamId: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!division) {
      return { status: "error", message: "対象リーグが見つかりませんでした。" };
    }

    const teamIds = new Set(division.teams.map((assignment) => assignment.teamId));

    if (rows.some((row) => !teamIds.has(row.homeTeamId) || !teamIds.has(row.awayTeamId))) {
      return { status: "error", message: "所属チームと一致しない試合が含まれています。もう一度Excelを確認してください。" };
    }

    const pairKeys = rows.map((row) => buildMatchPairKey(row.homeTeamId, row.awayTeamId));

    if (new Set(pairKeys).size !== pairKeys.length) {
      return { status: "error", message: "同じ対戦カードが重複しています。" };
    }

    const existingByPair = new Map(
      division.matches.map((match) => [buildMatchPairKey(match.homeTeamId, match.awayTeamId), match]),
    );
    let createdCount = 0;
    let updatedCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const [index, row] of rows.entries()) {
        const venue = row.venueName
          ? await tx.venue.upsert({
              where: { name: row.venueName },
              update: {},
              create: { name: row.venueName },
              select: { id: true },
            })
          : null;
        const existing = existingByPair.get(buildMatchPairKey(row.homeTeamId, row.awayTeamId));
        const data = {
          matchDate: new Date(`${row.matchDate}T00:00:00.000Z`),
          venueId: venue?.id ?? null,
          homeTeamId: row.homeTeamId,
          awayTeamId: row.awayTeamId,
          homeScore: row.homeScore,
          awayScore: row.awayScore,
          status: MatchStatus.PLAYED,
          sortOrder: index + 1,
          updatedById: scope.admin.id,
        };

        if (existing) {
          await tx.match.update({ where: { id: existing.id }, data });
          updatedCount += 1;
        } else {
          await tx.match.create({
            data: {
              divisionId,
              ...data,
              createdById: scope.admin.id,
            },
          });
          createdCount += 1;
        }
      }

      await tx.division.update({
        where: { id: divisionId },
        data: {
          status: PublishStatus.PUBLISHED,
          lastUpdatedAt: new Date(),
        },
      });
    });

    revalidatePath("/admin/results");
    revalidatePath("/competitions");

    return {
      status: "success",
      message: `${rows.length}試合を反映しました（新規${createdCount}件・更新${updatedCount}件）。`,
    };
  } catch (error) {
    console.error("importMatchesFromExcel failed", error);
    return {
      status: "error",
      message: "Excel入稿の反映に失敗しました。内容を確認してもう一度お試しください。",
    };
  }
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

  const result = await prisma.standing.deleteMany({
    where: {
      id: standingId,
      divisionId,
    },
  });

  if (result.count === 0) {
    return { status: "error", message: "削除対象の順位表行が見つかりませんでした。" };
  }

  revalidatePath("/admin/results");

  return {
    status: "success",
    message: "順位表の行を削除しました。",
  };
}

export async function addStandingRow(
  _prevState: ResultActionState,
  formData: FormData,
): Promise<ResultActionState> {
  const scope = await getAdminScope();
  const divisionId = sanitizePlainText(String(formData.get("divisionId") ?? ""), 64);
  const teamId = sanitizePlainText(String(formData.get("teamId") ?? ""), 64);

  if (!isValidUuid(divisionId) || !isValidUuid(teamId)) {
    return { status: "error", message: "追加するリーグとチームを確認してください。" };
  }

  if (!canEditDivision(scope, divisionId)) {
    return { status: "error", message: "このリーグを編集する権限がありません。" };
  }

  const [team, existingStanding, lastStanding, lastAssignment] = await Promise.all([
    prisma.team.findUnique({
      where: { id: teamId },
      select: {
        name: true,
        status: true,
      },
    }),
    prisma.standing.findUnique({
      where: {
        divisionId_teamId: {
          divisionId,
          teamId,
        },
      },
      select: { id: true },
    }),
    prisma.standing.findFirst({
      where: { divisionId },
      orderBy: { rank: "desc" },
      select: { rank: true },
    }),
    prisma.divisionTeam.findFirst({
      where: { divisionId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    }),
  ]);

  if (!team || team.status !== "PUBLISHED") {
    return { status: "error", message: "公開中のチームを選択してください。" };
  }

  if (existingStanding) {
    return { status: "error", message: "このチームは既に順位表へ登録されています。" };
  }

  const rank = (lastStanding?.rank ?? 0) + 1;
  const sortOrder = (lastAssignment?.sortOrder ?? 0) + 1;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.divisionTeam.upsert({
        where: {
          divisionId_teamId: {
            divisionId,
            teamId,
          },
        },
        update: {},
        create: {
          divisionId,
          teamId,
          sortOrder,
        },
      });

      await tx.standing.create({
        data: {
          divisionId,
          teamId,
          rank,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
        },
      });
    });
  } catch (error) {
    console.error("addStandingRow failed", error);
    return {
      status: "error",
      message: "順位表行の追加に失敗しました。既に登録されていないか確認してください。",
    };
  }

  revalidatePath("/admin/results");
  revalidatePath("/admin/competitions");

  return {
    status: "success",
    message: `${team.name} を順位表に追加しました。`,
  };
}

export async function replaceStandings(
  _prevState: ResultActionState,
  formData: FormData,
): Promise<ResultActionState> {
  try {
    const scope = await getAdminScope();
    const divisionId = sanitizePlainText(String(formData.get("divisionId") ?? ""), 64);
    const rowsJson = String(formData.get("rowsJson") ?? "");

    if (!isValidUuid(divisionId) || !rowsJson) {
      return { status: "error", message: "順位表データを確認してください。" };
    }

    if (!canEditDivision(scope, divisionId)) {
      return { status: "error", message: "このリーグを編集する権限がありません。" };
    }

    const parsed = JSON.parse(rowsJson);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { status: "error", message: "順位表データがありません。" };
    }

    const rows = parsed
      .map((row) => ({
        teamId: sanitizePlainText(String(row.teamId ?? ""), 64),
        rank: parseInteger(String(row.rank ?? "")),
        played: parseInteger(String(row.played ?? "0")) ?? 0,
        won: parseInteger(String(row.won ?? "0")) ?? 0,
        drawn: parseInteger(String(row.drawn ?? "0")) ?? 0,
        lost: parseInteger(String(row.lost ?? "0")) ?? 0,
        goalsFor: parseInteger(String(row.goalsFor ?? "0")) ?? 0,
        goalsAgainst: parseInteger(String(row.goalsAgainst ?? "0")) ?? 0,
        points: parseInteger(String(row.points ?? "0")) ?? 0,
      }))
      .filter((row) => isValidUuid(row.teamId));

    if (rows.length === 0) {
      return { status: "error", message: "順位表データがありません。" };
    }

    const invalidRow = rows.find((row) => !row.rank || row.rank < 1);

    if (invalidRow) {
      return { status: "error", message: "順位は 1 以上で入力してください。" };
    }

    const uniqueTeamIds = new Set(rows.map((row) => row.teamId));
    const uniqueRanks = new Set(rows.map((row) => row.rank));

    if (uniqueTeamIds.size !== rows.length) {
      return { status: "error", message: "同じチームが重複しています。" };
    }

    if (uniqueRanks.size !== rows.length) {
      return { status: "error", message: "順位が重複しています。" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.standing.deleteMany({
        where: { divisionId },
      });

      await tx.standing.createMany({
        data: rows.map((row) => ({
          divisionId,
          teamId: row.teamId,
          rank: row.rank ?? 0,
          played: row.played,
          won: row.won,
          drawn: row.drawn,
          lost: row.lost,
          goalsFor: row.goalsFor,
          goalsAgainst: row.goalsAgainst,
          goalDifference: row.goalsFor - row.goalsAgainst,
          points: row.points,
          note: VERIFIED_FROM_RESULT_IMAGE_NOTE,
        })),
      });
    });

    revalidatePath("/admin/results");
    revalidatePath("/competitions", "layout");

    return {
      status: "success",
      message: `${rows.length}チーム分の順位表を保存し、試合結果ページへ反映しました。`,
    };
  } catch (error) {
    console.error("replaceStandings failed", error);
    return {
      status: "error",
      message: "順位表の保存に失敗しました。ログを確認してください。",
    };
  }
}

export async function regenerateStandingsFromMatches(
  _prevState: ResultActionState,
  formData: FormData,
): Promise<ResultActionState> {
  return rebuildStandingsFromMatches(formData, false);
}

export async function applyUnplayedMatchPointsAdjustment(
  _prevState: ResultActionState,
  formData: FormData,
): Promise<ResultActionState> {
  return rebuildStandingsFromMatches(formData, true);
}

async function rebuildStandingsFromMatches(
  formData: FormData,
  applyUnplayedMatchPointsAdjustment: boolean,
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

    if (division.matches.length === 0 && !applyUnplayedMatchPointsAdjustment) {
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

    if (applyUnplayedMatchPointsAdjustment) {
      const expectedMatchesPerTeam = Math.max(participantTeamIds.length - 1, 0);

      for (const row of table.values()) {
        row.points -= Math.max(expectedMatchesPerTeam - row.played, 0);
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

      await tx.division.update({
        where: { id: divisionId },
        data: {
          unplayedMatchPointsAdjustedAt: applyUnplayedMatchPointsAdjustment ? new Date() : null,
          lastUpdatedAt: new Date(),
        },
      });
    });

    revalidatePath("/admin/results");
    revalidatePath("/competitions", "layout");

    return {
      status: "success",
      message: applyUnplayedMatchPointsAdjustment
        ? `${rows.length}チームの未消化試合を▲表示・勝ち点-1で補正しました。`
        : `${division.matches.length}試合・${rows.length}チームから順位表を再計算しました。`,
    };
  } catch (error) {
    console.error("rebuildStandingsFromMatches failed", error);
    return {
      status: "error",
      message: applyUnplayedMatchPointsAdjustment
        ? "未消化試合の勝ち点補正に失敗しました。ログを確認してください。"
        : "順位表の再計算に失敗しました。ログを確認してください。",
    };
  }
}

function canEditDivision(
  scope: Awaited<ReturnType<typeof getAdminScope>>,
  divisionId: string,
) {
  return scope.admin.role === "OWNER" || scope.accessibleDivisions.some((division) => division.id === divisionId);
}

function buildMatchPairKey(teamAId: string, teamBId: string) {
  return [teamAId, teamBId].sort().join(":");
}

function isValidImportDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

async function uploadResultImage(fileValue: FormDataEntryValue | null) {
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
      label: "結果画像",
      maxSizeBytes: IMAGE_UPLOAD_MAX_BYTES,
    },
  });

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
