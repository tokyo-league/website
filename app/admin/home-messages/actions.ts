"use server";

import { revalidatePath } from "next/cache";
import { PublishStatus } from "@prisma/client";
import { requireOwner } from "@/lib/admin-access";
import { HOME_MESSAGES_PAGE_SLUG } from "@/lib/home-messages";
import { prisma } from "@/lib/prisma";
import { sanitizePlainText } from "@/lib/security";
import { isE2ETestMode } from "@/lib/test-mode";

export type HomeMessagesActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function updateHomeMessages(
  _prevState: HomeMessagesActionState,
  formData: FormData,
): Promise<HomeMessagesActionState> {
  try {
    const scope = await requireOwner();
    const mainMessage = sanitizePlainText(String(formData.get("mainMessage") ?? ""), 100);
    const leadMessage = sanitizePlainText(String(formData.get("leadMessage") ?? ""), 140);
    const subMessage = sanitizePlainText(String(formData.get("subMessage") ?? ""), 400);

    if (!mainMessage || !leadMessage || !subMessage) {
      return { status: "error", message: "3つのメッセージをすべて入力してください。" };
    }

    if (!isE2ETestMode()) {
      await prisma.page.upsert({
        where: { slug: HOME_MESSAGES_PAGE_SLUG },
        create: {
          slug: HOME_MESSAGES_PAGE_SLUG,
          title: "トップページメッセージ",
          body: JSON.stringify({ mainMessage, leadMessage, subMessage }),
          status: PublishStatus.PUBLISHED,
          publishedAt: new Date(),
          updatedById: scope.admin.id,
        },
        update: {
          body: JSON.stringify({ mainMessage, leadMessage, subMessage }),
          status: PublishStatus.PUBLISHED,
          publishedAt: new Date(),
          updatedById: scope.admin.id,
        },
      });
    }

    revalidateHomeMessagePaths();
    return { status: "success", message: "トップページのメッセージを更新しました。" };
  } catch (error) {
    console.error("updateHomeMessages failed", error);
    return { status: "error", message: "トップページのメッセージ更新に失敗しました。" };
  }
}

function revalidateHomeMessagePaths() {
  revalidatePath("/");
  revalidatePath("/admin/home-messages");
  revalidatePath("/", "layout");
}
