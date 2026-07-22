import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/prisma";

export const ABOUT_CONTENT_PAGE_SLUG = "about-content";

export type AboutContent = {
  overview: {
    name: string;
    founded: string;
    participatingTeams: string;
    generalMeetingReception: string;
  };
  mainActivities: string[];
  fundamentalPrinciple: string;
  effortGoals: string[];
};

export const defaultAboutContent: AboutContent = {
  overview: {
    name: "東京少年サッカー連盟",
    founded: "1979年 東京23区の少年サッカーチーム13チームで創立",
    participatingTeams: "現在都内の少年チーム88チームが参加",
    generalMeetingReception: "年6回開催、必要に応じて臨時開催",
  },
  mainActivities: [
    "参加チームにより年2回のリーグ戦を展開",
    "オープン大会を年1回開催し、加盟チームが一会場に集まる機会をつくる",
    "国際交流大会を年1回実施する",
    "参加チームの選手育成を進める",
    "少年審判員の育成と審判講習会の実施を行う",
  ],
  fundamentalPrinciple:
    "加盟するチーム関係者が互いに協働し、サッカーを通じて少年少女の健やかな成長を支え、その資質を高めていくことを基本に据えています。その積み重ねを通じて、連盟の活動が社会にも貢献することを目指します。",
  effortGoals: [
    "サッカーの競技力を高め、リーグ運営では子どもたちが活動できる試合会場を継続して提供できるよう努める。",
    "すべての子どもたちが試合に参加できるよう、長期的な視点で活動し、日々の練習や試合を通じて人としての基礎を育む。",
    "加盟チームは連盟の活動に積極的に参加し、企画や運営に協力する。",
    "東京リーグに関わるすべての活動が、サッカー競技に限らず社会的にも有益なものとなるよう努める。",
  ],
};

export async function getAboutContent(): Promise<AboutContent> {
  noStore();

  try {
    const page = await prisma.page.findUnique({
      where: { slug: ABOUT_CONTENT_PAGE_SLUG },
      select: { body: true },
    });

    return parseAboutContent(page?.body);
  } catch {
    return defaultAboutContent;
  }
}

export function parseAboutContent(body: string | null | undefined): AboutContent {
  if (!body) return defaultAboutContent;

  try {
    const parsed = JSON.parse(body) as Partial<AboutContent>;
    const overview = parsed.overview;

    if (
      !overview ||
      typeof overview.name !== "string" ||
      typeof overview.founded !== "string" ||
      typeof overview.participatingTeams !== "string" ||
      typeof overview.generalMeetingReception !== "string" ||
      !overview.name ||
      !overview.founded ||
      !overview.participatingTeams ||
      !overview.generalMeetingReception ||
      !isTextList(parsed.mainActivities) ||
      typeof parsed.fundamentalPrinciple !== "string" ||
      !parsed.fundamentalPrinciple ||
      !isTextList(parsed.effortGoals)
    ) {
      return defaultAboutContent;
    }

    return {
      overview: {
        name: overview.name,
        founded: overview.founded,
        participatingTeams: overview.participatingTeams,
        generalMeetingReception: overview.generalMeetingReception,
      },
      mainActivities: parsed.mainActivities,
      fundamentalPrinciple: parsed.fundamentalPrinciple,
      effortGoals: parsed.effortGoals,
    };
  } catch {
    return defaultAboutContent;
  }
}

function isTextList(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string" && Boolean(item));
}
