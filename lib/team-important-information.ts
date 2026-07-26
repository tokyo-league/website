export const importantTeamInformation = [
  {
    id: "heat-safety",
    label: "夏季・必読",
    title: "暑さ対策・熱中症予防",
    description: "暑い時期の試合参加前に確認する、安全管理と対応のご案内です。",
    href: "/teams/important/heat-safety",
    type: "guide" as const,
  },
  {
    id: "match-standards",
    label: "通年・必読",
    title: "試合開催基準・中止判断",
    description: "荒天・会場状況などに応じた判断と、連絡確認の手順です。",
    href: "/teams/important/match-standards",
    type: "guide" as const,
  },
  {
    id: "league-regulations",
    label: "公式資料",
    title: "東京リーグ リーグ戦要綱",
    description: "大会の要綱、規約、各種様式は資料ダウンロードでご確認ください。",
    href: "/downloads",
    type: "download" as const,
  },
] as const;

export async function getLeagueRegulationsHref() {
  try {
    const document = await prisma.download.findFirst({
      where: {
        status: PublishStatus.PUBLISHED,
        AND: [
          { title: { contains: "リーグ", mode: "insensitive" } },
          { title: { contains: "要綱", mode: "insensitive" } },
        ],
      },
      select: { asset: { select: { storageKey: true } } },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    });

    return (await resolveAssetUrl(document?.asset.storageKey)) ?? "/downloads";
  } catch {
    return "/downloads";
  }
}
import { PublishStatus } from "@prisma/client";
import { resolveAssetUrl } from "@/lib/asset-url";
import { prisma } from "@/lib/prisma";
