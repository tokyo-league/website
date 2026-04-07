import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const competitionSlug = process.argv[2];

if (!competitionSlug) {
  console.error("Usage: node scripts/inspect-competition-divisions.mjs <competition-slug>");
  process.exit(1);
}

async function main() {
  const divisions = await prisma.division.findMany({
    where: {
      competition: {
        slug: competitionSlug,
      },
    },
    select: {
      name: true,
      slug: true,
      sourceUrl: true,
      resultImagePath: true,
      sortOrder: true,
    },
    orderBy: {
      sortOrder: "asc",
    },
  });

  console.log(JSON.stringify(divisions, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
