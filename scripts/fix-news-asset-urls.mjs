import { head } from "@vercel/blob";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const assets = await prisma.asset.findMany({
    where: {
      newsEyecatches: {
        some: {},
      },
    },
    select: {
      id: true,
      storageKey: true,
    },
  });

  let updated = 0;

  for (const asset of assets) {
    if (
      !asset.storageKey ||
      asset.storageKey.startsWith("http://") ||
      asset.storageKey.startsWith("https://") ||
      asset.storageKey.startsWith("/")
    ) {
      continue;
    }

    try {
      const blob = await head(asset.storageKey);
      await prisma.asset.update({
        where: { id: asset.id },
        data: {
          storageKey: blob.url,
        },
      });
      updated += 1;
    } catch (error) {
      console.error(`Failed to resolve asset ${asset.id}:`, error);
    }
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
