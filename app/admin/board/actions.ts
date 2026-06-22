"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/admin-access";
import { isValidUuid, sanitizePlainText } from "@/lib/security";
import { isE2ETestMode } from "@/lib/test-mode";

export type BoardActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function createBoardMember(
  _prevState: BoardActionState,
  formData: FormData,
): Promise<BoardActionState> {
  try {
    await requireOwner();
    const payload = parseBoardMember(formData);

    if (!payload.ok) return payload.error;

    if (!isE2ETestMode()) {
      const lastMember = await prisma.boardMember.findFirst({
        orderBy: [{ sortOrder: "desc" }, { createdAt: "desc" }],
        select: { sortOrder: true },
      });

      await prisma.boardMember.create({
        data: {
          ...payload.data,
          sortOrder: (lastMember?.sortOrder ?? 0) + 10,
        },
      });
    }

    revalidateBoardPaths();
    return { status: "success", message: `${payload.data.name}さんを理事会へ追加しました。` };
  } catch (error) {
    console.error("createBoardMember failed", error);
    return { status: "error", message: "理事会メンバーの追加に失敗しました。" };
  }
}

export async function updateBoardMember(
  _prevState: BoardActionState,
  formData: FormData,
): Promise<BoardActionState> {
  try {
    await requireOwner();
    const memberId = sanitizePlainText(String(formData.get("memberId") ?? ""), 64);
    const payload = parseBoardMember(formData);

    if (!isValidUuid(memberId) || !payload.ok) {
      return { status: "error", message: "更新する理事会メンバーの内容を確認してください。" };
    }

    if (!isE2ETestMode()) {
      const result = await prisma.boardMember.updateMany({
        where: { id: memberId },
        data: payload.data,
      });

      if (result.count === 0) {
        return { status: "error", message: "更新対象の理事会メンバーが見つかりません。" };
      }
    }

    revalidateBoardPaths();
    return { status: "success", message: `${payload.data.name}さんの情報を更新しました。` };
  } catch (error) {
    console.error("updateBoardMember failed", error);
    return { status: "error", message: "理事会メンバーの更新に失敗しました。" };
  }
}

export async function deleteBoardMember(
  _prevState: BoardActionState,
  formData: FormData,
): Promise<BoardActionState> {
  try {
    await requireOwner();
    const memberId = sanitizePlainText(String(formData.get("memberId") ?? ""), 64);

    if (!isValidUuid(memberId)) {
      return { status: "error", message: "削除する理事会メンバーを確認してください。" };
    }

    if (!isE2ETestMode()) {
      const result = await prisma.boardMember.deleteMany({ where: { id: memberId } });
      if (result.count === 0) {
        return { status: "error", message: "削除対象の理事会メンバーが見つかりません。" };
      }
    }

    revalidateBoardPaths();
    return { status: "success", message: "理事会メンバーを削除しました。" };
  } catch (error) {
    console.error("deleteBoardMember failed", error);
    return { status: "error", message: "理事会メンバーの削除に失敗しました。" };
  }
}

function parseBoardMember(formData: FormData) {
  const role = sanitizePlainText(String(formData.get("role") ?? ""), 60);
  const name = sanitizePlainText(String(formData.get("name") ?? ""), 80);
  const duty = sanitizePlainText(String(formData.get("duty") ?? ""), 120);

  if (!role || !name) {
    return {
      ok: false as const,
      error: { status: "error" as const, message: "役職と氏名は必須です。" },
    };
  }

  return { ok: true as const, data: { role, name, duty: duty || null } };
}

function revalidateBoardPaths() {
  revalidatePath("/admin/board");
  revalidatePath("/about");
}
