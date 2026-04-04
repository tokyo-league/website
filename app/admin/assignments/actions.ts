"use server";

import { revalidatePath } from "next/cache";
import { AdminRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/admin-access";
import { isValidEmail, isValidUuid, normalizeEmail, sanitizePlainText } from "@/lib/security";

export type AssignmentActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialAssignmentActionState: AssignmentActionState = {
  status: "idle",
  message: "",
};

export async function createAdminUser(
  _prevState: AssignmentActionState,
  formData: FormData,
): Promise<AssignmentActionState> {
  await requireOwner();

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const name = sanitizePlainText(String(formData.get("name") ?? ""), 80);
  const role = String(formData.get("role") ?? "EDITOR") as AdminRole;

  if (!email || !name || !isValidEmail(email) || !["OWNER", "EDITOR"].includes(role)) {
    return {
      status: "error",
      message: "メールアドレス、表示名、ロールを確認してください。",
    };
  }

  await prisma.user.upsert({
    where: { email },
    update: {
      name,
      role,
    },
    create: {
      email,
      name,
      role,
    },
  });

  revalidatePath("/admin/assignments");

  return {
    status: "success",
    message: `${name} を ${role === "OWNER" ? "Owner" : "Editor"} として保存しました。`,
  };
}

export async function createDivisionAssignment(
  _prevState: AssignmentActionState,
  formData: FormData,
): Promise<AssignmentActionState> {
  await requireOwner();

  const userId = sanitizePlainText(String(formData.get("userId") ?? ""), 64);
  const divisionId = sanitizePlainText(String(formData.get("divisionId") ?? ""), 64);

  if (!userId || !divisionId || !isValidUuid(userId) || !isValidUuid(divisionId)) {
    return {
      status: "error",
      message: "担当者とリーグを選択してください。",
    };
  }

  const existing = await prisma.divisionEditorAssignment.findFirst({
    where: {
      userId,
      divisionId,
      permission: "DIVISION_MANAGER",
    },
  });

  if (!existing) {
    await prisma.divisionEditorAssignment.create({
      data: {
        userId,
        divisionId,
        permission: "DIVISION_MANAGER",
      },
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/competitions");
  revalidatePath("/admin/assignments");

  return {
    status: "success",
    message: existing ? "この担当リーグは既に割り当て済みです。" : "担当リーグを割り当てました。",
  };
}

export async function deleteDivisionAssignment(
  _prevState: AssignmentActionState,
  formData: FormData,
): Promise<AssignmentActionState> {
  await requireOwner();

  const assignmentId = sanitizePlainText(String(formData.get("assignmentId") ?? ""), 64);

  if (!assignmentId || !isValidUuid(assignmentId)) {
    return {
      status: "error",
      message: "解除対象が見つかりませんでした。",
    };
  }

  await prisma.divisionEditorAssignment.delete({
    where: {
      id: assignmentId,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/competitions");
  revalidatePath("/admin/assignments");

  return {
    status: "success",
    message: "担当リーグの割当を解除しました。",
  };
}
