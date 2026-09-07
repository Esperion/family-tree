import type { UnionKind } from "@prisma/client";

import { prisma } from "@/lib/db";
import { assertCanEdit } from "@/lib/authz";

function toYear(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 && n < 3000 ? n : null;
}

export type AddUnionProblem = "same-person" | "outside-family" | "duplicate";

export async function addUnion(
  familyId: string,
  input: { partnerAId: string; partnerBId: string; kind: string; startYear: string; endYear: string },
) {
  await assertCanEdit(familyId);

  const { partnerAId, partnerBId } = input;
  if (!partnerAId || !partnerBId || partnerAId === partnerBId) {
    return { ok: false as const, problem: "same-person" as const };
  }

  const inFamily = await prisma.person.findMany({
    where: { id: { in: [partnerAId, partnerBId] }, familyId },
    select: { id: true },
  });
  if (inFamily.length !== 2) {
    return { ok: false as const, problem: "outside-family" as const };
  }

  // A union is unordered: check both arrangements.
  const clash = await prisma.union.findFirst({
    where: {
      familyId,
      OR: [
        { partnerAId, partnerBId },
        { partnerAId: partnerBId, partnerBId: partnerAId },
      ],
    },
    select: { id: true },
  });
  if (clash) return { ok: false as const, problem: "duplicate" as const };

  const kind: UnionKind = input.kind === "PARTNERSHIP" ? "PARTNERSHIP" : "MARRIAGE";
  await prisma.union.create({
    data: {
      familyId,
      partnerAId,
      partnerBId,
      kind,
      startYear: toYear(input.startYear),
      endYear: toYear(input.endYear),
    },
  });
  return { ok: true as const };
}

export async function removeUnion(familyId: string, unionId: string) {
  await assertCanEdit(familyId);
  await prisma.union.deleteMany({ where: { id: unionId, familyId } });
  return { ok: true as const };
}

export async function listUnions(familyId: string) {
  return prisma.union.findMany({
    where: { familyId },
    orderBy: { startYear: "asc" },
    include: {
      partnerA: { select: { id: true, givenName: true, familyName: true } },
      partnerB: { select: { id: true, givenName: true, familyName: true } },
    },
  });
}
