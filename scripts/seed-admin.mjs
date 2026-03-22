import process from "node:process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const email = process.env.SEED_ADMIN_EMAIL;
const name = process.env.SEED_ADMIN_NAME ?? "Tokyo League Admin";

if (!email) {
  console.error("SEED_ADMIN_EMAIL is required.");
  process.exit(1);
}

try {
  const admin = await prisma.user.upsert({
    where: { email },
    update: { name },
    create: {
      email,
      name,
      role: "OWNER",
    },
  });

  console.log(`Seeded admin: ${admin.email}`);
} finally {
  await prisma.$disconnect();
}
