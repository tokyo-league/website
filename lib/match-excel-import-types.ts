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
  warnings: string[];
};
