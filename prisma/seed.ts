/**
 * Seed the database with demo families.
 *
 * The Meyer / Roth family's 13 people live in `src/lib/family.ts` as the
 * canonical fixture used by the unit tests. The Okonkwo family is defined inline
 * here just to give the directory a second entry.
 *
 * Idempotent: each family is deleted by slug (cascading to its people and edges)
 * and rebuilt, so `npm run db:seed` can be re-run at will.
 */
import { PrismaClient, type Visibility } from "@prisma/client";

import { family as meyerRoth } from "../src/lib/family";

const prisma = new PrismaClient();

interface SeedPerson {
  id: string;
  name: string;
  birthYear?: number;
  deathYear?: number;
  parents: string[];
}

/** Seed names are all "Given Family"; split on the first space. */
function splitName(full: string): { givenName: string; familyName: string | null } {
  const at = full.indexOf(" ");
  return at === -1
    ? { givenName: full, familyName: null }
    : { givenName: full.slice(0, at), familyName: full.slice(at + 1) };
}

async function seedFamily(spec: {
  slug: string;
  name: string;
  description: string;
  visibility: Visibility;
  people: SeedPerson[];
}) {
  await prisma.family.deleteMany({ where: { slug: spec.slug } });

  const family = await prisma.family.create({
    data: {
      slug: spec.slug,
      name: spec.name,
      description: spec.description,
      visibility: spec.visibility,
    },
  });

  for (const person of spec.people) {
    const { givenName, familyName } = splitName(person.name);
    await prisma.person.create({
      data: {
        id: `${spec.slug}:${person.id}`,
        familyId: family.id,
        givenName,
        familyName,
        birthYear: person.birthYear ?? null,
        deathYear: person.deathYear ?? null,
      },
    });
  }

  let edges = 0;
  for (const person of spec.people) {
    for (const parentId of person.parents) {
      await prisma.parentChild.create({
        data: {
          familyId: family.id,
          parentId: `${spec.slug}:${parentId}`,
          childId: `${spec.slug}:${person.id}`,
        },
      });
      edges += 1;
    }
  }

  console.log(`Seeded "${family.name}" (/${family.slug}): ${spec.people.length} people, ${edges} links.`);
}

const okonkwo: SeedPerson[] = [
  { id: "ada", name: "Ada Okonkwo", birthYear: 1940, deathYear: 2015, parents: [] },
  { id: "emeka", name: "Emeka Okonkwo", birthYear: 1938, deathYear: 2009, parents: [] },
  { id: "ngozi", name: "Ngozi Okonkwo", birthYear: 1965, parents: ["ada", "emeka"] },
  { id: "chidi", name: "Chidi Okonkwo", birthYear: 1968, parents: ["ada", "emeka"] },
  { id: "amara", name: "Amara Okonkwo", birthYear: 1992, parents: ["ngozi"] },
];

async function main() {
  await seedFamily({
    slug: "meyer-roth",
    name: "Meyer / Roth",
    description: "The original proof-of-concept family: 13 people across four generations.",
    visibility: "PUBLIC",
    people: meyerRoth,
  });

  await seedFamily({
    slug: "okonkwo",
    name: "Okonkwo",
    description: "A smaller public family, three generations.",
    visibility: "PUBLIC",
    people: okonkwo,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
