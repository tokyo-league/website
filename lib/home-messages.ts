import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/prisma";

export const HOME_MESSAGES_PAGE_SLUG = "home-messages";

export type HomeMessages = {
  mainMessage: string;
  leadMessage: string;
  subMessage: string;
};

export const defaultHomeMessages: HomeMessages = {
  mainMessage: "受け継ぐ誇りを、未来へ。",
  leadMessage: "サッカーを通じて、強く、正しく、たくましく。",
  subMessage:
    "東京リーグは、少年少女たちが真剣勝負の中で成長し、仲間とともに未来を切り拓くための舞台です。長い歴史を受け継ぎながら、次の一歩をつくります。",
};

export async function getHomeMessages(): Promise<HomeMessages> {
  noStore();

  try {
    const page = await prisma.page.findUnique({
      where: { slug: HOME_MESSAGES_PAGE_SLUG },
      select: { body: true },
    });

    return parseHomeMessages(page?.body);
  } catch {
    return defaultHomeMessages;
  }
}

export function parseHomeMessages(body: string | null | undefined): HomeMessages {
  if (!body) return defaultHomeMessages;

  try {
    const parsed = JSON.parse(body) as Partial<HomeMessages>;

    if (
      typeof parsed.mainMessage !== "string" ||
      typeof parsed.leadMessage !== "string" ||
      typeof parsed.subMessage !== "string" ||
      !parsed.mainMessage ||
      !parsed.leadMessage ||
      !parsed.subMessage
    ) {
      return defaultHomeMessages;
    }

    return {
      mainMessage: parsed.mainMessage,
      leadMessage: parsed.leadMessage,
      subMessage: parsed.subMessage,
    };
  } catch {
    return defaultHomeMessages;
  }
}
