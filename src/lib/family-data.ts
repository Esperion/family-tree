import { prisma } from "@/lib/db";
import type { Person } from "@/lib/family";

/**
 * The boundary between Prisma rows and the domain model in `family.ts`.
 *
 * `family.ts` stays a file of pure functions over the `Person` shape
 * (`{ id, name, birthYear?, deathYear?, parents: string[] }`). This module is
 * the only place that knows those come from `Person` + `ParentChild` tables,
 * so the derivation logic and its tests never touch the database.
 */

/** Join a stored given/family name back into the single display name. */
function displayName(givenName: string, familyName: string | null): string {
  return familyName ? `${givenName} ${familyName}` : givenName;
}

/** Load one family's people, shaped for the pure helpers in `family.ts`. */
export async function loadFamilyGraph(familyId: string): Promise<Person[]> {
  const [people, edges] = await Promise.all([
    prisma.person.findMany({
      where: { familyId },
      // createdAt keeps founders first; id is a stable tiebreak for rows
      // inserted within the same millisecond by the seed.
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    }),
    prisma.parentChild.findMany({
      where: { familyId },
      select: { parentId: true, childId: true },
    }),
  ]);

  const parentsByChild = new Map<string, string[]>();
  for (const { parentId, childId } of edges) {
    const list = parentsByChild.get(childId);
    if (list) list.push(parentId);
    else parentsByChild.set(childId, [parentId]);
  }

  return people.map((person) => ({
    id: person.id,
    name: displayName(person.givenName, person.familyName),
    birthYear: person.birthYear ?? undefined,
    deathYear: person.deathYear ?? undefined,
    parents: parentsByChild.get(person.id) ?? [],
    aliases: person.aliases,
    photoUrl: person.photoUrl,
    gender: person.gender,
    notes: person.notes,
  }));
}

/** Couple links for the diagram, in the shape `layoutTree` expects. */
export async function loadUnions(familyId: string) {
  const rows = await prisma.union.findMany({
    where: { familyId },
    select: { partnerAId: true, partnerBId: true, kind: true, startYear: true },
  });
  return rows.map((row) => ({
    partnerAId: row.partnerAId,
    partnerBId: row.partnerBId,
    kind: row.kind,
    startYear: row.startYear,
  }));
}
