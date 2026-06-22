import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const members = [
  ["顧問", "宮崎 昇作", ""],
  ["会長", "三木 健一郎", "後援会会長"],
  ["特任理事", "山藤 武久", ""],
  ["副会長", "湯澤 茂", "海外交流"],
  ["副会長", "田島 政文", "U7,8,9,10フェス"],
  ["理事長", "真田 実", "事務局"],
  ["理事", "浅田 春美", "総務"],
  ["理事", "丸山 雄介", "U7,8,9,10フェス"],
  ["理事", "上田 道弘", "山藤杯"],
  ["理事", "岩間 孝俊", "広報"],
  ["理事", "福田 茂", "会計"],
  ["理事", "大田 謙一", "会計"],
  ["理事", "五十嵐 正", "西川杯"],
  ["会計監査", "桜井 保明", ""],
];

async function main() {
  const existingCount = await prisma.boardMember.count();

  if (existingCount > 0) {
    console.log(`Board members already exist (${existingCount}); skipped.`);
    return;
  }

  await prisma.boardMember.createMany({
    data: members.map(([role, name, duty], index) => ({
      role,
      name,
      duty: duty || null,
      sortOrder: (index + 1) * 10,
    })),
  });

  console.log(`Seeded ${members.length} board members.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
