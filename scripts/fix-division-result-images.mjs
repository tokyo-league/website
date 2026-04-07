import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const corrections = [
  {
    competitionSlug: "tokyo-league-101",
    divisionSlug: "b-league",
    resultImagePath: "/site-assets/results/Bリーグ-3.jpg",
  },
  {
    competitionSlug: "tokyo-league-101",
    divisionSlug: "e-league",
    resultImagePath: "/site-assets/results/Eリーグ-4.jpg",
  },
  {
    competitionSlug: "tokyo-league-101",
    divisionSlug: "f-league",
    resultImagePath: "/site-assets/results/Fリーグ-6.jpg",
  },
];

async function main() {
  const updated = [];

  for (const correction of corrections) {
    const division = await prisma.division.update({
      where: {
        competitionId_slug: {
          competitionId: (
            await prisma.competition.findUniqueOrThrow({
              where: { slug: correction.competitionSlug },
              select: { id: true },
            })
          ).id,
          slug: correction.divisionSlug,
        },
      },
      data: {
        resultImagePath: correction.resultImagePath,
      },
      select: {
        name: true,
        slug: true,
        resultImagePath: true,
        competition: {
          select: {
            slug: true,
          },
        },
      },
    });

    updated.push(division);
  }

  console.log(JSON.stringify({ updated }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
