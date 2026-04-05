import process from "node:process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.division.updateMany({
    where: {
      resultImagePath: {
        startsWith: "/site-assets/common/",
      },
    },
    data: {
      resultImagePath: null,
    },
  });

  console.log(JSON.stringify({ cleared: result.count }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
