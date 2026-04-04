"use server";

import { revalidatePath } from "next/cache";
import { AdminRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/admin-access";

export async function createAdminUser(formData: FormData) {
  await requireOwner();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "EDITOR") as AdminRole;

  if (!email || !name || !["OWNER", "EDITOR"].includes(role)) {
    return;
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
}

export async function createDivisionAssignment(formData: FormData) {
  await requireOwner();

  const userId = String(formData.get("userId") ?? "");
  const divisionId = String(formData.get("divisionId") ?? "");

  if (!userId || !divisionId) {
    return;
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
