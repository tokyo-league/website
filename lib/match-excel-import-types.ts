export type MatchExcelPreviewRow = {
  sourceRow: number;
  matchDate: string;
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
