export function isE2ETestMode() {
  return process.env.E2E_TEST_MODE === "1" && process.env.NODE_ENV !== "production";
}

export const e2eMockCompetition = {
  id: "e2e-competition-103",
  slug: "tokyo-league-103",
  name: "第103回 東京リーグ",
  summary: "リーグ別の結果画像、所属チーム、過去結果のアーカイブを確認できます。",
  competitionType: "LEAGUE" as const,
  status: "PUBLISHED" as const,
  sourceUrl: "https://tokyo-league.jp/game/",
  resultFilePath: null,
  edition: 103,
  season: {
    year: 2026,
    label: "2026年度",
    isCurrent: true,
  },
  divisions: [
    {
      id: "e2e-division-a",
      slug: "a-league",
      name: "Aリーグ",
      sourceUrl: "https://tokyo-league.jp/league/a%e3%83%aa%e3%83%bc%e3%82%b0-23/",
      status: "PUBLISHED" as const,
      sortOrder: 1,
      resultImagePath: "/site-assets/results/Fリーグ-6.jpg",
      description: "所属チーム一覧と結果画像を掲載しています。",
      teams: [
        { id: "team-a1", sortOrder: 1, team: { id: "team-a1", name: "クリアージュFCジュニア", region: "東京", logoPath: "/site-assets/teams/logos/retouched/fckumano-logo-512.png" } },
        { id: "team-a2", sortOrder: 2, team: { id: "team-a2", name: "バディサッカークラブ", region: "世田谷区", logoPath: "/site-assets/teams/logos/retouched/minamiayasefc-logo-512.png" } },
        { id: "team-a3", sortOrder: 3, team: { id: "team-a3", name: "暁星アストラ・ジュニア", region: "千代田区", logoPath: "/site-assets/teams/logos/retouched/suginami-cedars-logo-512.png" } },
      ],
      standings: [
        { id: "standing-1", rank: 1, played: 10, points: 30, goalDifference: 20, team: { name: "クリアージュFCジュニア" } },
        { id: "standing-2", rank: 2, played: 10, points: 22, goalDifference: 11, team: { name: "バディサッカークラブ" } },
      ],
      matches: [
        {
          id: "match-1",
          matchDate: new Date("2026-04-01T00:00:00+09:00"),
          status: "PLAYED" as const,
          note: "E2Eテスト用のサンプルデータ",
          venue: { name: "会場未設定" },
          homeTeamId: "team-a1",
          awayTeamId: "team-a2",
          homeTeam: { name: "クリアージュFCジュニア" },
          awayTeam: { name: "バディサッカークラブ" },
          homeScore: 2,
          awayScore: 1,
        },
      ],
    },
    {
      id: "e2e-division-b",
      slug: "b-league",
      name: "Bリーグ",
      sourceUrl: "https://tokyo-league.jp/league/b%e3%83%aa%e3%83%bc%e3%82%b0-23/",
      status: "PUBLISHED" as const,
      sortOrder: 2,
      resultImagePath: "/site-assets/results/Bリーグ-3.jpg",
      description: "所属チーム一覧と結果画像を掲載しています。",
      teams: [
        { id: "team-b1", sortOrder: 1, team: { id: "team-b1", name: "FC熊野", region: "板橋区", logoPath: "/site-assets/teams/logos/retouched/fckumano-logo-512.png" } },
      ],
      standings: [],
      matches: [],
    },
    {
      id: "e2e-division-c",
      slug: "c-league",
      name: "Cリーグ",
      sourceUrl: "https://tokyo-league.jp/league/c%e3%83%aa%e3%83%bc%e3%82%b0-23/",
      status: "PUBLISHED" as const,
      sortOrder: 3,
      resultImagePath: "/site-assets/results/Eリーグ-4.jpg",
      description: "所属チーム一覧と結果画像を掲載しています。",
      teams: [],
      standings: [],
      matches: [],
    },
  ],
};
