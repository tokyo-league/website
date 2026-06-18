import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const VERIFIED_NOTE = "公式結果画像目視照合済み";

const corrections = [
  {
    competitionSlug: "tokyo-league-100",
    divisionSlug: "f-league",
    sourceImagePath: "/site-assets/results/Fリーグ-7.jpg",
    rows: [
      { team: "TOKYO NADESHIKO FC", rank: 1, played: 9, won: 6, drawn: 2, lost: 1, goalsFor: 36, goalsAgainst: 5, goalDifference: 31, points: 20 },
      { team: "高島平SC", rank: 2, played: 9, won: 6, drawn: 0, lost: 3, goalsFor: 33, goalsAgainst: 12, goalDifference: 21, points: 18 },
      { team: "後地FCドルフィンズ", rank: 3, played: 7, won: 6, drawn: 1, lost: 0, goalsFor: 53, goalsAgainst: 5, goalDifference: 48, points: 17 },
      { team: "池二FC", rank: 4, played: 9, won: 5, drawn: 2, lost: 2, goalsFor: 27, goalsAgainst: 18, goalDifference: 9, points: 17 },
      { team: "渋谷東部JFC", rank: 5, played: 8, won: 5, drawn: 0, lost: 3, goalsFor: 40, goalsAgainst: 13, goalDifference: 27, points: 14 },
      { team: "東伊興SSS", rank: 6, played: 8, won: 4, drawn: 2, lost: 2, goalsFor: 18, goalsAgainst: 16, goalDifference: 2, points: 13 },
      { team: "南綾瀬FC", rank: 7, played: 9, won: 2, drawn: 1, lost: 6, goalsFor: 11, goalsAgainst: 35, goalDifference: -24, points: 7 },
      { team: "東京朝鮮第四FC", rank: 8, played: 8, won: 2, drawn: 0, lost: 6, goalsFor: 18, goalsAgainst: 37, goalDifference: -19, points: 5 },
      { team: "世田谷和光FC", rank: 9, played: 8, won: 0, drawn: 0, lost: 8, goalsFor: 2, goalsAgainst: 74, goalDifference: -72, points: -1 },
      { team: "舎人SSS", rank: 10, played: 5, won: 0, drawn: 0, lost: 5, goalsFor: 2, goalsAgainst: 25, goalDifference: -23, points: -4 },
    ],
  },
];

try {
  for (const correction of corrections) {
    const division = await prisma.division.findFirst({
      where: {
        slug: correction.divisionSlug,
        competition: { slug: correction.competitionSlug },
      },
      include: {
        standings: { include: { team: true } },
      },
    });

    if (!division) throw new Error(`${correction.competitionSlug}/${correction.divisionSlug} が見つかりません。`);
    if (division.resultImagePath !== correction.sourceImagePath) {
      throw new Error(`正本画像が一致しません: ${division.resultImagePath ?? "未設定"}`);
    }
    if (division.standings.length !== correction.rows.length) {
      throw new Error(`順位表行数が一致しません: DB=${division.standings.length} 正本=${correction.rows.length}`);
    }

    const standingsByTeam = new Map(division.standings.map((standing) => [standing.team.name, standing]));
    for (const row of correction.rows) {
      if (!standingsByTeam.has(row.team)) throw new Error(`チームが見つかりません: ${row.team}`);
      if (row.played !== row.won + row.drawn + row.lost) throw new Error(`試合数が不正です: ${row.team}`);
      if (row.goalDifference !== row.goalsFor - row.goalsAgainst) throw new Error(`得失点が不正です: ${row.team}`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.standing.updateMany({
        where: { divisionId: division.id },
        data: { rank: { increment: 100 } },
      });

      for (const row of correction.rows) {
        const standing = standingsByTeam.get(row.team);
        const { team: _team, ...data } = row;
        await tx.standing.update({
          where: { id: standing.id },
          data: { ...data, note: VERIFIED_NOTE },
        });
      }
    });

    console.log(`${correction.competitionSlug}/${correction.divisionSlug}: ${correction.rows.length}行を目視照合済みとして更新しました。`);
  }
} finally {
  await prisma.$disconnect();
}
