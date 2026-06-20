import readExcelFile from "read-excel-file/node";
import type { MatchExcelPreview, MatchExcelPreviewRow } from "@/lib/match-excel-import-types";

type DivisionTeam = {
  id: string;
  name: string;
  shortName?: string | null;
};

type ExistingMatch = {
  homeTeamId: string;
  awayTeamId: string;
};

type CellValue = string | number | boolean | Date | null;

const MAX_IMPORT_ROWS = 200;

export async function parseMatchResultsWorkbook(
  buffer: Buffer,
  teams: DivisionTeam[],
  existingMatches: ExistingMatch[],
): Promise<MatchExcelPreview> {
  const sheets = await readExcelFile(buffer);
  const sheet =
    sheets.find((item) => normalizeLabel(item.sheet) === "管理表") ??
    sheets.find((item) => findHeaderRow(item.data as CellValue[][]) !== -1);

  if (!sheet) {
    return {
      sheetName: "",
      rows: [],
      skippedRows: 0,
      errors: ["「管理表」シートが見つかりません。東京リーグの結果管理表を選択してください。"],
      warnings: [],
    };
  }

  const data = sheet.data as CellValue[][];
  const headerIndex = findHeaderRow(data);

  if (headerIndex === -1) {
    return {
      sheetName: sheet.sheet.trim(),
      rows: [],
      skippedRows: 0,
      errors: ["管理表の見出し（チーム名・得点・年月日）を確認できませんでした。"],
      warnings: [],
    };
  }

  const teamLookup = buildTeamLookup(teams);
  const existingPairs = new Set(existingMatches.map((match) => buildPairKey(match.homeTeamId, match.awayTeamId)));
  const importedPairs = new Set<string>();
  const rows: MatchExcelPreviewRow[] = [];
  const errors: string[] = [];
  let skippedRows = 0;

  for (let index = headerIndex + 1; index < data.length; index += 1) {
    const row = data[index] ?? [];
    const sourceRow = index + 1;
    const homeName = cleanText(row[1], 80);
    const awayName = cleanText(row[3], 80);
    const homeScore = toScore(row[2]);
    const awayScore = toScore(row[4]);
    if (!homeName || !awayName || homeScore === null || awayScore === null) {
      if (homeScore !== null || awayScore !== null || (homeName && awayName && !isBrokenReference(awayName))) {
        errors.push(`${sourceRow}行目: チーム名と両チームの得点を確認してください。`);
      } else {
        skippedRows += 1;
      }
      continue;
    }

    if (isBrokenReference(homeName) || isBrokenReference(awayName)) {
      skippedRows += 1;
      continue;
    }

    const homeTeam = teamLookup.get(normalizeTeamName(homeName));
    const awayTeam = teamLookup.get(normalizeTeamName(awayName));

    if (!homeTeam || !awayTeam) {
      const missing = [!homeTeam ? homeName : "", !awayTeam ? awayName : ""].filter(Boolean).join(" / ");
      errors.push(`${sourceRow}行目: 「${missing}」を選択中リーグの所属チームと照合できません。`);
      continue;
    }

    if (homeTeam.id === awayTeam.id) {
      errors.push(`${sourceRow}行目: 同じチーム同士の対戦になっています。`);
      continue;
    }

    const matchDate = toIsoDate(row[5]);

    if (!matchDate) {
      errors.push(`${sourceRow}行目: 試合日を確認してください。`);
      continue;
    }

    const pairKey = buildPairKey(homeTeam.id, awayTeam.id);

    if (importedPairs.has(pairKey)) {
      errors.push(`${sourceRow}行目: ${homeTeam.name} 対 ${awayTeam.name} がExcel内で重複しています。`);
      continue;
    }

    importedPairs.add(pairKey);
    rows.push({
      sourceRow,
      matchDate,
      homeTeamId: homeTeam.id,
      homeTeamName: homeTeam.name,
      homeScore,
      awayTeamId: awayTeam.id,
      awayTeamName: awayTeam.name,
      awayScore,
      venueName: cleanText(row[7], 80),
      operation: existingPairs.has(pairKey) ? "update" : "create",
    });

    if (rows.length >= MAX_IMPORT_ROWS) {
      errors.push(`一度に入稿できる試合は${MAX_IMPORT_ROWS}件までです。`);
      break;
    }
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push("得点と試合日が入力された試合を見つけられませんでした。");
  }

  const warnings = skippedRows > 0
    ? [`未入力の組み合わせ ${skippedRows} 行は入稿対象から除外します。`]
    : [];

  return {
    sheetName: sheet.sheet.trim(),
    rows,
    skippedRows,
    errors,
    warnings,
  };
}

function findHeaderRow(rows: CellValue[][]) {
  return rows.slice(0, 20).findIndex((row) => {
    const labels = row.map((value) => normalizeLabel(cleanText(value, 40)));
    return labels[1] === "チーム名" && labels[2] === "得点" && labels[3] === "チーム名" && labels[4] === "得点";
  });
}

function buildTeamLookup(teams: DivisionTeam[]) {
  const lookup = new Map<string, DivisionTeam>();

  for (const team of teams) {
    for (const label of [team.name, team.shortName]) {
      if (label) lookup.set(normalizeTeamName(label), team);
    }
  }

  return lookup;
}

function normalizeTeamName(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("ja").replace(/[\s\u3000・･._\-‐‑‒–—―]/g, "");
}

function normalizeLabel(value: string) {
  return value.normalize("NFKC").replace(/[\s\u3000]/g, "");
}

function cleanText(value: CellValue | undefined, maxLength: number) {
  if (value === null || value === undefined) return "";
  return String(value).normalize("NFKC").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function toScore(value: CellValue | undefined) {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 99) return value;
  if (typeof value === "string" && /^\d{1,2}$/.test(value.trim())) return Number(value.trim());
  return null;
}

function toIsoDate(value: CellValue | undefined) {
  let date: Date | null = null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    date = value;
  } else if (typeof value === "number" && value >= 1 && value <= 100000) {
    date = new Date(Date.UTC(1899, 11, 30) + Math.floor(value) * 86_400_000);
  } else if (typeof value === "string") {
    const normalized = value.trim().replace(/[.年]/g, "-").replace(/[月]/g, "-").replace(/日/g, "");
    const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  }

  if (!date || Number.isNaN(date.getTime())) return "";
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isBrokenReference(value: string) {
  return value.includes("#REF!");
}

function buildPairKey(teamAId: string, teamBId: string) {
  return [teamAId, teamBId].sort().join(":");
}
