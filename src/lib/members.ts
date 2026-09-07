import { prisma } from "@/lib/db";
import { getViewer, assertCanEdit, assertCanManage } from "@/lib/authz";

export interface MemberRow {
  userId: string;
  name: string | null;
  email: string;
  isSuperAdmin: boolean;
  isCreator: boolean;
  isSelf: boolean;
}

export async function listMembers(family: {
  id: string;
  createdById: string | null;
}): Promise<MemberRow[]> {
  const viewer = await getViewer();
  const rows = await prisma.membership.findMany({
    where: { familyId: family.id, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    select: {
      user: {
        select: { id: true, name: true, email: true, isSuperAdmin: true },
      },
    },
  });

  return rows.map(({ user }) => ({
    userId: user.id,
    name: user.name,
    email: user.email,
    isSuperAdmin: user.isSuperAdmin,
    isCreator: user.id === family.createdById,
    isSelf: user.id === viewer?.id,
  }));
}

export type InviteResult =
  | { ok: true }
  | { ok: false; problem: "no-such-user" | "already-member" };

/** Add an existing user as an editor of the family. */
export async function inviteEditor(
  family: { id: string; createdById: string | null },
  rawEmail: string,
): Promise<InviteResult> {
  await assertCanManage(family);

  const email = rawEmail.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) return { ok: false, problem: "no-such-user" };

  const existing = await prisma.membership.findUnique({
    where: { userId_familyId: { userId: user.id, familyId: family.id } },
    select: { status: true },
  });
  if (existing?.status === "ACTIVE") return { ok: false, problem: "already-member" };

  await prisma.membership.upsert({
    where: { userId_familyId: { userId: user.id, familyId: family.id } },
    create: { userId: user.id, familyId: family.id, status: "ACTIVE" },
    update: { status: "ACTIVE" },
  });
  return { ok: true };
}

export type RemoveResult =
  | { ok: true }
  | { ok: false; problem: "is-creator" };

/** Remove another member. Creator/admin only; the creator can't be removed. */
export async function removeMember(
  family: { id: string; createdById: string | null },
  targetUserId: string,
): Promise<RemoveResult> {
  await assertCanManage(family);
  if (targetUserId === family.createdById) return { ok: false, problem: "is-creator" };

  await prisma.membership.deleteMany({
    where: { familyId: family.id, userId: targetUserId },
  });
  return { ok: true };
}

/** Give up your own editor access. The creator must hand off or delete instead. */
export async function leaveFamily(family: {
  id: string;
  createdById: string | null;
}): Promise<RemoveResult> {
  const viewer = await assertCanEdit(family.id);
  if (viewer.id === family.createdById) return { ok: false, problem: "is-creator" };

  await prisma.membership.deleteMany({
    where: { familyId: family.id, userId: viewer.id },
  });
  return { ok: true };
}
