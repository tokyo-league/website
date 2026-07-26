import type { CompetitionType } from "@prisma/client";

export const competitionCategories = {
  "tokyo-league": {
    slug: "tokyo-league",
    name: "東京リーグ",
    kicker: "Tokyo League",
    description: "各年度のリーグ戦結果、リーグ別の所属チーム、順位表を確認できます。",
    competitionTypes: ["LEAGUE"] as CompetitionType[],
  },
  "sando-cup": {
    slug: "sando-cup",
    name: "山藤杯",
    kicker: "Sando Cup",
    description: "5年生FES 山藤杯の各年度の決勝大会結果を確認できます。",
    competitionTypes: ["CUP"] as CompetitionType[],
  },
} as const;

export type CompetitionCategorySlug = keyof typeof competitionCategories;

export function getCompetitionCategory(slug: string) {
  return competitionCategories[slug as CompetitionCategorySlug] ?? null;
}

export function getCompetitionCategorySlug(type: CompetitionType): CompetitionCategorySlug | null {
  if (type === "LEAGUE") return "tokyo-league";
  if (type === "CUP") return "sando-cup";
  return null;
}
