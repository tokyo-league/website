import { expect, test } from "@playwright/test";
import * as XLSX from "xlsx";
import { parseMatchResultsWorkbook } from "@/lib/match-excel-import";

for (const format of ["xls", "xlsx"] as const) {
  test(`${format}の管理表から日本語チーム名・試合日・得点を読み取れる`, async () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["", "チーム名", "得点", "チーム名", "得点", "年月日", "", "会場"],
      [1, "東京FC", 3, "品川SC", 1, "2026年11月19日", "", "東京グラウンド"],
      [2, "東京FC", null, "未消化SC", null, "2026年11月20日"],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "管理表");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: format === "xls" ? "biff8" : "xlsx" });

    const preview = await parseMatchResultsWorkbook(buffer, [
      { id: "tokyo", name: "東京FC" },
      { id: "shinagawa", name: "品川SC" },
    ], [{ homeTeamId: "shinagawa", awayTeamId: "tokyo" }], format);

    expect(preview.sheetName).toBe("管理表");
    expect(preview.errors).toEqual([]);
    expect(preview.unmatchedTeamNames).toEqual([]);
    expect(preview.skippedRows).toBe(1);
    expect(preview.rows).toEqual([{
      sourceRow: 2,
      matchDate: "2026-11-19",
      homeTeamId: "tokyo",
      homeTeamName: "東京FC",
      homeScore: 3,
      awayTeamId: "shinagawa",
      awayTeamName: "品川SC",
      awayScore: 1,
      venueName: "東京グラウンド",
      operation: "update",
    }]);
  });
}
