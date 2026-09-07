/**
 * Seed the database with the original proof-of-concept family.
 *
 * The 13 people still live in `src/lib/family.ts` as the canonical fixture used
 * by the unit tests. This script is the one place that turns them into rows:
 * one PUBLIC family, people, then parent -> child edges.
 *
 * Idempotent: it deletes the seed family (cascading to its people and edges)
 * and rebuilds it, so `npm run db:seed` can be re-run at will.
 */
import { PrismaClient } from "@prisma/client";

import { family as seedPeople } from "../src/lib/family";

const prisma = new PrismaClient();

const SEED_SLUG = "meyer-roth";

/** Seed names are all "Given Family"; split on the first space. */
function splitName(full: string): { givenName: string; familyName: string | null } {
  const at = full.indexOf(" ");
  return at === -1
    ? { givenName: full, familyName: null }
    : { givenName: full.slice(0, at), familyName: full.slice(at + 1) };
}

async function main() {
  await prisma.family.deleteMany({ where: { slug: SEED_SLUG } });

  const family = await prisma.family.create({
    data: {
      slug: SEED_SLUG,
      name: "Meyer / Roth",
      description: "The original proof-of-concept family: 13 people across four generations.",
      visibility: "PUBLIC",
    },
  });

  // People first — reuse the fixture ids so the edge pass can reference them.
  for (const person of seedPeople) {
    const { givenName, familyName } = splitName(person.name);
    await prisma.person.create({
      data: {
        id: person.id,
        familyId: family.id,
        givenName,
        familyName,
        birthYear: person.birthYear ?? null,
        deathYear: person.deathYear ?? null,
      },
    });
  }

  // Then parent -> child edges.
  let edgeCount = 0;
  for (const person of seedPeople) {
    for (const parentId of person.parents) {
      await prisma.parentChild.create({
        data: { familyId: family.id, parentId, childId: person.id },
      });
      edgeCount += 1;
    }
  }

  console.log(
    `Seeded "${family.name}" (/${family.slug}): ${seedPeople.length} people, ${edgeCount} parent links.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
