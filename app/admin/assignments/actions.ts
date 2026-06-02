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

export async function createAdminUser(
  _prevState: AssignmentActionState,
  formData: FormData,
): Promise<AssignmentActionState> {
  const scope = await requireOwner();

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const name = sanitizePlainText(String(formData.get("name") ?? ""), 80);
  const role = String(formData.get("role") ?? "EDITOR") as AdminRole;

  if (!email || !name || !isValidEmail(email) || !["OWNER", "EDITOR"].includes(role)) {
    return {
      status: "error",
      message: "メールアドレス、表示名、ロールを確認してください。",
    };
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    const validation = await validateAdminRoleChange(existing.id, existing.role, role, scope.admin.id);

    if (validation) {
      return validation;
    }
  }

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email },
      update: {
        name,
        role,
        isActive: true,
      },
      create: {
        email,
        name,
        role,
        isActive: true,
      },
    });

    if (role === "OWNER") {
      await tx.divisionEditorAssignment.deleteMany({
        where: { userId: user.id },
      });
    }
  });

  revalidatePath("/admin");
  revalidatePath("/admin/competitions");
  revalidatePath("/admin/results");
  revalidatePath("/admin/assignments");

  return {
    status: "success",
    message: `${name} を ${role === "OWNER" ? "Owner" : "Editor"} として保存しました。`,
  };
}

export async function updateAdminUser(
  _prevState: AssignmentActionState,
  formData: FormData,
): Promise<AssignmentActionState> {
  const scope = await requireOwner();

  const userId = sanitizePlainText(String(formData.get("userId") ?? ""), 64);
  const name = sanitizePlainText(String(formData.get("name") ?? ""), 80);
  const role = String(formData.get("role") ?? "EDITOR") as AdminRole;

  if (!userId || !isValidUuid(userId) || !name || !["OWNER", "EDITOR"].includes(role)) {
    return {
      status: "error",
      message: "担当者、表示名、ロールを確認してください。",
    };
  }

  const existing = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!existing) {
    return {
      status: "error",
      message: "更新対象の担当者が見つかりませんでした。",
    };
  }

  const validation = await validateAdminRoleChange(existing.id, existing.role, role, scope.admin.id);

  if (validation) {
    return validation;
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        name,
        role,
      },
    });

    if (role === "OWNER") {
      await tx.divisionEditorAssignment.deleteMany({
        where: { userId },
      });
    }
  });

  revalidatePath("/admin");
  revalidatePath("/admin/competitions");
  revalidatePath("/admin/results");
  revalidatePath("/admin/assignments");

  return {
    status: "success",
    message: `${name} を ${role === "OWNER" ? "Owner" : "Editor"} として更新しました。`,
  };
}

export async function toggleAdminUserActive(
  _prevState: AssignmentActionState,
  formData: FormData,
): Promise<AssignmentActionState> {
  const scope = await requireOwner();

  const userId = sanitizePlainText(String(formData.get("userId") ?? ""), 64);
  const nextActive = String(formData.get("isActive") ?? "") === "true";

  if (!userId || !isValidUuid(userId)) {
    return {
      status: "error",
      message: "対象の担当者が見つかりませんでした。",
    };
  }

  if (userId === scope.admin.id && !nextActive) {
    return {
      status: "error",
      message: "ログイン中のOwnerは無効化できません。",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return {
      status: "error",
      message: "対象の担当者が見つかりませんでした。",
    };
  }

  if (user.role === "OWNER" && user.isActive && !nextActive) {
    const otherActiveOwnerCount = await prisma.user.count({
      where: {
        role: "OWNER",
        isActive: true,
        id: { not: userId },
      },
    });

    if (otherActiveOwnerCount === 0) {
      return {
        status: "error",
        message: "最後の有効なOwnerは無効化できません。",
      };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { isActive: nextActive },
    });

    if (!nextActive) {
      await tx.session.deleteMany({
        where: { userId },
      });
    }
  });

  revalidatePath("/admin");
  revalidatePath("/admin/competitions");
  revalidatePath("/admin/results");
  revalidatePath("/admin/assignments");

  return {
    status: "success",
    message: `${user.name} を${nextActive ? "有効化" : "無効化"}しました。`,
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

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isActive: true },
  });

  if (!user || user.role !== "EDITOR" || !user.isActive) {
    return {
      status: "error",
      message: "担当リーグは有効なEditorにのみ割り当てできます。",
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

export async function deleteAdminUser(
  _prevState: AssignmentActionState,
  formData: FormData,
): Promise<AssignmentActionState> {
  const scope = await requireOwner();

  const userId = sanitizePlainText(String(formData.get("userId") ?? ""), 64);

  if (!userId || !isValidUuid(userId)) {
    return {
      status: "error",
      message: "削除対象の担当者が見つかりませんでした。",
    };
  }

  if (userId === scope.admin.id) {
    return {
      status: "error",
      message: "ログイン中の Owner は削除できません。",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: {
          createdNews: true,
          updatedNews: true,
          createdAssets: true,
          createdComp: true,
          updatedComp: true,
          createdMatches: true,
          updatedMatches: true,
          createdDocs: true,
          updatedDocs: true,
          updatedPages: true,
          updatedContact: true,
        },
      },
    },
  });

  if (!user) {
    return {
      status: "error",
      message: "削除対象の担当者が見つかりませんでした。",
    };
  }

  if (user.role === "OWNER") {
    return {
      status: "error",
      message: "Owner は管理画面から削除できません。",
    };
  }

  const hasManagedContent =
    Object.values(user._count).reduce((sum, count) => sum + count, 0) > 0;

  if (hasManagedContent) {
    return {
      status: "error",
      message: "この担当者は更新履歴に紐づくため削除できません。",
    };
  }

  await prisma.$transaction([
    prisma.divisionEditorAssignment.deleteMany({
      where: { userId },
    }),
    prisma.account.deleteMany({
      where: { userId },
    }),
    prisma.session.deleteMany({
      where: { userId },
    }),
    prisma.user.delete({
      where: { id: userId },
    }),
  ]);

  revalidatePath("/admin");
  revalidatePath("/admin/competitions");
  revalidatePath("/admin/assignments");

  return {
    status: "success",
    message: `${user.name} を削除しました。`,
  };
}

async function validateAdminRoleChange(
  targetUserId: string,
  currentRole: AdminRole,
  nextRole: AdminRole,
  currentUserId: string,
): Promise<AssignmentActionState | null> {
  if (targetUserId === currentUserId && currentRole !== nextRole) {
    return {
      status: "error",
      message: "ログイン中のOwnerは自分のロールを変更できません。",
    };
  }

  if (currentRole === "OWNER" && nextRole === "EDITOR") {
    const otherOwnerCount = await prisma.user.count({
      where: {
        role: "OWNER",
        isActive: true,
        id: { not: targetUserId },
      },
    });

    if (otherOwnerCount === 0) {
      return {
        status: "error",
        message: "最後のOwnerはEditorへ変更できません。",
      };
    }
  }

  return null;
}
