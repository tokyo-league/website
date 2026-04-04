import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const LOGIN_PATH = "/login?callbackUrl=/admin";

export type AdminScope = {
  admin: {
    id: string;
    email: string;
    name: string;
    role: "OWNER" | "EDITOR";
  };
  accessibleDivisions: Array<{
    id: string;
    name: string;
    competitionName: string;
    permissions: string[];
  }>;
  canManageAssignments: boolean;
};

export async function getAdminScope(): Promise<AdminScope> {
  const session = await auth();

  if (!session?.user?.email) {
    redirect(LOGIN_PATH);
  }

  const admin = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      divisionPermissions: {
        include: {
          division: {
            include: {
              competition: true,
            },
          },
        },
        orderBy: [{ division: { competition: { sortOrder: "asc" } } }, { division: { sortOrder: "asc" } }],
      },
    },
  });

  if (!admin) {
    redirect(LOGIN_PATH);
  }

  if (admin.role === "OWNER") {
    const divisions = await prisma.division.findMany({
      include: {
        competition: true,
      },
      orderBy: [{ competition: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    });

    return {
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
      accessibleDivisions: divisions.map((division) => ({
        id: division.id,
        name: division.name,
        competitionName: division.competition.name,
        permissions: ["DIVISION_MANAGER"],
      })),
      canManageAssignments: true,
    };
  }

  const accessibleDivisions = admin.divisionPermissions.map((assignment) => ({
    id: assignment.division.id,
    name: assignment.division.name,
    competitionName: assignment.division.competition.name,
    permissions: admin.divisionPermissions
      .filter((item) => item.divisionId === assignment.divisionId)
      .map((item) => item.permission),
  }));

  const uniqueDivisions = accessibleDivisions.filter(
    (division, index, all) => all.findIndex((item) => item.id === division.id) === index,
  );

  return {
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    },
    accessibleDivisions: uniqueDivisions,
    canManageAssignments: false,
  };
}

export async function requireOwner() {
  const scope = await getAdminScope();

  if (scope.admin.role !== "OWNER") {
    redirect("/admin");
  }

  return scope;
}
