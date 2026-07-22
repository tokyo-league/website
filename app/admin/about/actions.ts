"use server";

import { PublishStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { ABOUT_CONTENT_PAGE_SLUG, type AboutContent } from "@/lib/about-content";
import { requireOwner } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { sanitizeMultilineText, sanitizePlainText } from "@/lib/security";
import { isE2ETestMode } from "@/lib/test-mode";

export type AboutContentActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function updateAboutContent(
  _prevState: AboutContentActionState,
  formData: FormData,
): Promise<AboutContentActionState> {
  try {
    const scope = await requireOwner();
    const content = parseAboutContentForm(formData);

    if (!content) {
      return { status: "error", message: "すべての項目を入力してください。箇条書きは1行につき1項目です。" };
    }

    if (!isE2ETestMode()) {
      await prisma.page.upsert({
        where: { slug: ABOUT_CONTENT_PAGE_SLUG },
        create: {
          slug: ABOUT_CONTENT_PAGE_SLUG,
          title: "東京リーグについて",
          body: JSON.stringify(content),
          status: PublishStatus.PUBLISHED,
          publishedAt: new Date(),
          updatedById: scope.admin.id,
        },
        update: {
          body: JSON.stringify(content),
          status: PublishStatus.PUBLISHED,
          publishedAt: new Date(),
          updatedById: scope.admin.id,
        },
      });
    }

    revalidatePath("/about");
    revalidatePath("/admin/about");
    return { status: "success", message: "「東京リーグについて」の内容を更新しました。" };
  } catch (error) {
    console.error("updateAboutContent failed", error);
    return { status: "error", message: "「東京リーグについて」の内容更新に失敗しました。" };
  }
}

function parseAboutContentForm(formData: FormData): AboutContent | null {
  const name = sanitizePlainText(String(formData.get("name") ?? ""), 100);
  const founded = sanitizePlainText(String(formData.get("founded") ?? ""), 200);
  const participatingTeams = sanitizePlainText(String(formData.get("participatingTeams") ?? ""), 200);
  const generalMeetingReception = sanitizePlainText(String(formData.get("generalMeetingReception") ?? ""), 200);
  const mainActivities = parseLines(formData.get("mainActivities"), 20, 200);
  const fundamentalPrinciple = sanitizeMultilineText(String(formData.get("fundamentalPrinciple") ?? ""), 1200);
  const effortGoals = parseLines(formData.get("effortGoals"), 20, 500);

  if (
    !name ||
    !founded ||
    !participatingTeams ||
    !generalMeetingReception ||
    mainActivities.length === 0 ||
    !fundamentalPrinciple ||
    effortGoals.length === 0
  ) {
    return null;
  }

  return {
    overview: { name, founded, participatingTeams, generalMeetingReception },
    mainActivities,
    fundamentalPrinciple,
    effortGoals,
  };
}

function parseLines(value: FormDataEntryValue | null, maxItems: number, maxLength: number) {
  return sanitizeMultilineText(String(value ?? ""), maxItems * (maxLength + 1))
    .split("\n")
    .map((line) => sanitizePlainText(line, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}
