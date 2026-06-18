export const VERIFIED_FROM_RESULT_IMAGE_NOTE = "公式結果画像目視照合済み";
export const UNVERIFIED_OCR_STANDING_NOTE = "過去結果画像OCR未照合";
export const UNVERIFIED_OCR_MATCH_NOTE = "過去結果画像OCR取り込み";

type HistoricalStanding = {
  note?: string | null;
};

type HistoricalMatch = {
  note?: string | null;
};

export function getPublishedHistoricalStandings<T extends readonly HistoricalStanding[]>(
  resultImagePath: string | null | undefined,
  standings: T,
): Array<T[number]> {
  if (!resultImagePath) return [...standings];

  return standings.filter((standing) => standing.note === VERIFIED_FROM_RESULT_IMAGE_NOTE) as Array<T[number]>;
}

export function getPublishedHistoricalMatches<T extends readonly HistoricalMatch[]>(
  resultImagePath: string | null | undefined,
  matches: T,
): Array<T[number]> {
  if (!resultImagePath) return [...matches];

  return matches.filter((match) => match.note !== UNVERIFIED_OCR_MATCH_NOTE) as Array<T[number]>;
}
