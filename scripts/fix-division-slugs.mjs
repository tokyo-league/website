import process from "node:process";
import { PrismaClient, CompetitionType } from "@prisma/client";

const prisma = new PrismaClient();

function normalizeDivisionSlug(name) {
  const normalized = String(name).normalize("NFKC").trim();
  const match = normalized.match(/^([A-Za-z])\s*(?:リーグ|グループ)$/);

  if (match) {
    return `${match[1].toLowerCase()}-league`;
  }

  return normalized
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-") || "division";
}

async function main() {
  const divisions = await prisma.division.findMany({
    where: {
      competition: {
        competitionType: CompetitionType.LEAGUE,
      },
    },
    include: {
      competition: true,
    },
    orderBy: [{ competition: { edition: "desc" } }, { sortOrder: "asc" }],
  });

  let updated = 0;

  for (const division of divisions) {
    const desired = normalizeDivisionSlug(division.name);

    if (!desired || desired === division.slug) {
      continue;
    }

    let nextSlug = desired;
    let suffix = 2;

    // Keep uniqueness inside each competition.
    while (
      await prisma.division.findFirst({
        where: {
          competitionId: division.competitionId,
          slug: nextSlug,
          NOT: { id: division.id },
        },
        select: { id: true },
      })
    ) {
      nextSlug = `${desired}-${suffix}`;
      suffix += 1;
    }

    await prisma.division.update({
      where: { id: division.id },
      data: { slug: nextSlug },
    });

    updated += 1;
    console.log(`updated ${division.competition.name} / ${division.name}: ${division.slug} -> ${nextSlug}`);
  }

  console.log(`updated divisions: ${updated}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
