import { prisma } from "@/lib/prisma";

export type BoardMemberItem = {
  id: string;
  role: string;
  name: string;
  duty: string;
};

export const defaultBoardMembers: BoardMemberItem[] = [
  { id: "default-adviser", role: "顧問", name: "宮崎 昇作", duty: "" },
  { id: "default-chairperson", role: "会長", name: "三木 健一郎", duty: "後援会会長" },
  { id: "default-special-director", role: "特任理事", name: "山藤 武久", duty: "" },
  { id: "default-vice-chairperson-1", role: "副会長", name: "湯澤 茂", duty: "海外交流" },
  { id: "default-vice-chairperson-2", role: "副会長", name: "田島 政文", duty: "U7,8,9,10フェス" },
  { id: "default-executive-director", role: "理事長", name: "真田 実", duty: "事務局" },
  { id: "default-director-1", role: "理事", name: "浅田 春美", duty: "総務" },
  { id: "default-director-2", role: "理事", name: "丸山 雄介", duty: "U7,8,9,10フェス" },
  { id: "default-director-3", role: "理事", name: "上田 道弘", duty: "山藤杯" },
  { id: "default-director-4", role: "理事", name: "岩間 孝俊", duty: "広報" },
  { id: "default-director-5", role: "理事", name: "福田 茂", duty: "会計" },
  { id: "default-director-6", role: "理事", name: "大田 謙一", duty: "会計" },
  { id: "default-director-7", role: "理事", name: "五十嵐 正", duty: "西川杯" },
  { id: "default-auditor", role: "会計監査", name: "桜井 保明", duty: "" },
];

export async function getBoardMembers(): Promise<BoardMemberItem[]> {
  try {
    const members = await prisma.boardMember.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return members.map((member) => ({
      id: member.id,
      role: member.role,
      name: member.name,
      duty: member.duty ?? "",
    }));
  } catch (error) {
    console.error("getBoardMembers failed; using the default board list", error);
    return defaultBoardMembers;
  }
}
