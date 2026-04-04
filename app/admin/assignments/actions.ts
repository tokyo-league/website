"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/admin-access";

export async function createDivisionAssignment(formData: FormData) {
  await requireOwner();

  const userId = String(formData.get("userId") ?? "");
  const divisionId = String(formData.get("divisionId") ?? "");
  const permission = String(formData.get("permission") ?? "");

  if (!userId || !divisionId || !permission) {
    return;
  }

  const existing = await prisma.divisionEditorAssignment.findFirst({
    where: {
      userId,
      divisionId,
      permission: permission as "RESULTS_EDITOR" | "STANDINGS_EDITOR" | "DIVISION_MANAGER",
    },
  });

  if (!existing) {
    await prisma.divisionEditorAssignment.create({
      data: {
        userId,
        divisionId,
        permission: permission as "RESULTS_EDITOR" | "STANDINGS_EDITOR" | "DIVISION_MANAGER",
      },
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/competitions");
  revalidatePath("/admin/assignments");
}

export async function deleteDivisionAssignment(formData: FormData) {
  await requireOwner();

  const assignmentId = String(formData.get("assignmentId") ?? "");

  if (!assignmentId) {
    return;
  }

  await prisma.divisionEditorAssignment.delete({
    where: {
      id: assignmentId,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/competitions");
  revalidatePath("/admin/assignments");
}
