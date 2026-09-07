import type { Prisma, Visibility } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getViewer, getEditableFamilyIds } from "@/lib/authz";
import { safeSlug } from "@/lib/slug";

export interface DirectoryEntry {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  visibility: Visibility;
  peopleCount: number;
  isEditor: boolean;
}

export interface DirectoryFilters {
  q?: string;
  mine?: boolean;
  visibility?: Visibility;
}

/** Families the viewer is allowed to see, narrowed by the filter bar. */
export async function listDirectory(
  filters: DirectoryFilters,
): Promise<DirectoryEntry[]> {
  const viewer = await getViewer();
  const editableIds = viewer ? await getEditableFamilyIds() : new Set<string>();

  const and: Prisma.FamilyWhereInput[] = [];

  // Visibility scope: a superadmin sees everything; everyone else sees public
  // families plus the ones they can edit.
  if (!viewer?.isSuperAdmin) {
    and.push({
      OR: [{ visibility: "PUBLIC" }, { id: { in: [...editableIds] } }],
    });
  }
  if (filters.q) and.push({ name: { contains: filters.q, mode: "insensitive" } });
  if (filters.visibility) and.push({ visibility: filters.visibility });
  if (filters.mine) and.push({ id: { in: [...editableIds] } });

  const families = await prisma.family.findMany({
    where: and.length ? { AND: and } : undefined,
    orderBy: { name: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      visibility: true,
      _count: { select: { people: true } },
    },
  });

  return families.map((family) => ({
    id: family.id,
    slug: family.slug,
    name: family.name,
    description: family.description,
    visibility: family.visibility,
    peopleCount: family._count.people,
    isEditor: editableIds.has(family.id),
  }));
}

export type CreateFamilyResult =
  | { ok: true; slug: string }
  | { ok: false; problem: "not-signed-in" | "missing-name" };

/** Create a family and make the caller its first editor. */
export async function createFamily(input: {
  name: string;
  description?: string;
  visibility: Visibility;
}): Promise<CreateFamilyResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, problem: "not-signed-in" };

  const name = input.name.trim();
  if (!name) return { ok: false, problem: "missing-name" };

  const base = safeSlug(name);
  let slug = base;
  for (
    let n = 2;
    await prisma.family.findUnique({ where: { slug }, select: { id: true } });
    n += 1
  ) {
    slug = `${base}-${n}`;
  }

  await prisma.family.create({
    data: {
      slug,
      name,
      description: input.description?.trim() || null,
      visibility: input.visibility,
      createdById: viewer.id,
      members: { create: { userId: viewer.id, status: "ACTIVE" } },
    },
  });

  return { ok: true, slug };
}
