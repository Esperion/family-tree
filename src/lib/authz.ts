import { cache } from "react";
import type { Visibility } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Authorization. Two roles: an editor (a Membership row) has full control of one
 * family; a superadmin (`User.isSuperAdmin`) has it everywhere. Destructive
 * family-level actions also require being the family's creator.
 *
 * Every helper reads the database fresh; `cache()` dedupes within a request.
 */

export type Viewer = {
  id: string;
  name: string | null;
  email: string;
  isSuperAdmin: boolean;
};

export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, isSuperAdmin: true },
  });
});

/** Ids of the families the viewer is an active member (editor) of. */
export const getEditableFamilyIds = cache(async (): Promise<Set<string>> => {
  const viewer = await getViewer();
  if (!viewer) return new Set();
  const rows = await prisma.membership.findMany({
    where: { userId: viewer.id, status: "ACTIVE" },
    select: { familyId: true },
  });
  return new Set(rows.map((row) => row.familyId));
});

export async function canView(family: {
  id: string;
  visibility: Visibility;
}): Promise<boolean> {
  if (family.visibility === "PUBLIC") return true;
  const viewer = await getViewer();
  if (!viewer) return false;
  if (viewer.isSuperAdmin) return true;
  return (await getEditableFamilyIds()).has(family.id);
}

export async function canEdit(familyId: string): Promise<boolean> {
  const viewer = await getViewer();
  if (!viewer) return false;
  if (viewer.isSuperAdmin) return true;
  return (await getEditableFamilyIds()).has(familyId);
}

export async function canManage(family: {
  createdById: string | null;
}): Promise<boolean> {
  const viewer = await getViewer();
  if (!viewer) return false;
  if (viewer.isSuperAdmin) return true;
  return family.createdById != null && family.createdById === viewer.id;
}

/** Throw unless the viewer may edit this family. For use in server actions. */
export async function assertCanEdit(familyId: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer || !(await canEdit(familyId))) {
    throw new Error("Not authorized to edit this family");
  }
  return viewer;
}

/** Throw unless the viewer may manage this family (creator or superadmin). */
export async function assertCanManage(family: {
  createdById: string | null;
}): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer || !(await canManage(family))) {
    throw new Error("Not authorized to manage this family");
  }
  return viewer;
}

export type FamilyRole = "admin" | "editor" | "viewer";

/** The viewer's standing in one family, for badges and conditional UI. */
export async function familyRole(family: {
  id: string;
  createdById: string | null;
}): Promise<FamilyRole> {
  const viewer = await getViewer();
  if (viewer?.isSuperAdmin) return "admin";
  if (viewer && (await getEditableFamilyIds()).has(family.id)) return "editor";
  return "viewer";
}
