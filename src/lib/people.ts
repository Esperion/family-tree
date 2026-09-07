import { prisma } from "@/lib/db";
import { assertCanEdit } from "@/lib/authz";
import { createsCycle, type Edge } from "@/lib/family-graph";
import { parseAliases } from "@/lib/aliases";

export interface PersonInput {
  givenName: string;
  familyName: string;
  birthYear: string;
  deathYear: string;
  gender: string;
  notes: string;
  aliases: string;
}

function toYear(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 && n < 3000 ? n : null;
}

function normalize(input: PersonInput) {
  return {
    givenName: input.givenName.trim(),
    familyName: input.familyName.trim() || null,
    birthYear: toYear(input.birthYear),
    deathYear: toYear(input.deathYear),
    gender: input.gender.trim() || null,
    notes: input.notes.trim() || null,
    aliases: parseAliases(input.aliases),
  };
}

export async function addPerson(familyId: string, input: PersonInput) {
  await assertCanEdit(familyId);
  const data = normalize(input);
  if (!data.givenName) return { ok: false as const, problem: "missing-name" as const };
  await prisma.person.create({ data: { familyId, ...data } });
  return { ok: true as const };
}

export async function updatePerson(
  familyId: string,
  personId: string,
  input: PersonInput,
) {
  await assertCanEdit(familyId);
  const data = normalize(input);
  if (!data.givenName) return { ok: false as const, problem: "missing-name" as const };
  await prisma.person.updateMany({ where: { id: personId, familyId }, data });
  return { ok: true as const };
}

export async function removePerson(familyId: string, personId: string) {
  await assertCanEdit(familyId);
  // Parent/child edges and unions cascade via the schema's onDelete: Cascade.
  await prisma.person.deleteMany({ where: { id: personId, familyId } });
  return { ok: true as const };
}

export type SetParentsProblem = "too-many" | "self" | "cycle" | "outside-family";

/** Replace a person's parents. At most two, same family, no cycles. */
export async function setParents(
  familyId: string,
  childId: string,
  parentIds: string[],
) {
  await assertCanEdit(familyId);

  const wanted = [...new Set(parentIds.filter(Boolean))];
  if (wanted.length > 2) return { ok: false as const, problem: "too-many" as const };
  if (wanted.includes(childId)) return { ok: false as const, problem: "self" as const };

  const inFamily = await prisma.person.findMany({
    where: { id: { in: [childId, ...wanted] }, familyId },
    select: { id: true },
  });
  const known = new Set(inFamily.map((p) => p.id));
  if (!known.has(childId) || wanted.some((id) => !known.has(id))) {
    return { ok: false as const, problem: "outside-family" as const };
  }

  const existing = await prisma.parentChild.findMany({
    where: { familyId },
    select: { parentId: true, childId: true },
  });
  // Edges as they would be after removing this child's current parents.
  const withoutChild: Edge[] = existing.filter((e) => e.childId !== childId);
  for (const parentId of wanted) {
    if (createsCycle(withoutChild, parentId, childId)) {
      return { ok: false as const, problem: "cycle" as const };
    }
    withoutChild.push({ parentId, childId });
  }

  await prisma.$transaction([
    prisma.parentChild.deleteMany({ where: { familyId, childId } }),
    ...wanted.map((parentId) =>
      prisma.parentChild.create({ data: { familyId, parentId, childId } }),
    ),
  ]);
  return { ok: true as const };
}

export async function listPeopleForManage(familyId: string) {
  const [people, edges] = await Promise.all([
    prisma.person.findMany({
      where: { familyId },
      orderBy: [{ birthYear: "asc" }, { givenName: "asc" }],
    }),
    prisma.parentChild.findMany({
      where: { familyId },
      select: { parentId: true, childId: true },
    }),
  ]);

  const parentsByChild = new Map<string, string[]>();
  for (const edge of edges) {
    const list = parentsByChild.get(edge.childId);
    if (list) list.push(edge.parentId);
    else parentsByChild.set(edge.childId, [edge.parentId]);
  }

  return people.map((person) => ({
    ...person,
    parentIds: parentsByChild.get(person.id) ?? [],
  }));
}
