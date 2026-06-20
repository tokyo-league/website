import { NextResponse } from "next/server";
import { getAdminScope } from "@/lib/admin-access";
import { parseMatchResultsWorkbook } from "@/lib/match-excel-import";
import { prisma } from "@/lib/prisma";
import { isValidUuid, sanitizePlainText } from "@/lib/security";

export const runtime = "nodejs";

const EXCEL_IMPORT_MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const scope = await getAdminScope();
    const formData = await request.formData();
    const divisionId = sanitizePlainText(String(formData.get("divisionId") ?? ""), 64);
    const file = formData.get("file");

    if (!isValidUuid(divisionId)) {
      return NextResponse.json({ message: "対象リーグを確認してください。" }, { status: 400 });
    }

    const canEdit = scope.admin.role === "OWNER" || scope.accessibleDivisions.some((division) => division.id === divisionId);

    if (!canEdit) {
      return NextResponse.json({ message: "このリーグを編集する権限がありません。" }, { status: 403 });
    }

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ message: "Excelファイルを選択してください。" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json({ message: "入稿できるファイルは .xlsx 形式です。" }, { status: 400 });
    }

    if (file.size > EXCEL_IMPORT_MAX_BYTES) {
      return NextResponse.json({ message: "Excelファイルは5MB以下にしてください。" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      return NextResponse.json({ message: "Excelファイルの内容を確認してください。" }, { status: 400 });
    }

    const division = await prisma.division.findUnique({
      where: { id: divisionId },
      select: {
        teams: {
          select: {
            team: { select: { id: true, name: true, shortName: true } },
          },
        },
        matches: { select: { homeTeamId: true, awayTeamId: true } },
      },
    });

    if (!division) {
      return NextResponse.json({ message: "対象リーグが見つかりませんでした。" }, { status: 404 });
    }

    const preview = await parseMatchResultsWorkbook(
      buffer,
      division.teams.map((assignment) => assignment.team),
      division.matches,
    );

    return NextResponse.json(preview);
  } catch (error) {
    console.error("Excel match preview failed", error);
    return NextResponse.json(
      { message: "Excelを読み取れませんでした。ファイルが破損していないか確認してください。" },
      { status: 400 },
    );
  }
}
