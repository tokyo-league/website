export type MatchExcelPreviewRow = {
  sourceRow: number;
  /** 空欄は試合日未設定として取り込みます。 */
  matchDate: string | null;
  homeTeamId: string;
  homeTeamName: string;
  homeScore: number;
  awayTeamId: string;
  awayTeamName: string;
  awayScore: number;
  venueName: string;
  operation: "create" | "update";
};

export type MatchExcelPreview = {
  sheetName: string;
  rows: MatchExcelPreviewRow[];
  skippedRows: number;
  errors: string[];
  /** 所属チームと一致せず、名寄せが必要なExcel上のチーム名。 */
  unmatchedTeamNames: string[];
  warnings: string[];
};
