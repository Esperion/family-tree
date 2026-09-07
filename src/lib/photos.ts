import { put, del } from "@vercel/blob";

import { prisma } from "@/lib/db";
import { assertCanEdit } from "@/lib/authz";

/** Photo upload only works when a Vercel Blob store is wired up. */
export const photosEnabled = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

const MAX_BYTES = 4 * 1024 * 1024; // server actions on Vercel cap the body ~4.5MB
const OK_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export type PhotoProblem = "not-configured" | "bad-type" | "too-big" | "not-found";

export async function setPhoto(familyId: string, personId: string, file: File) {
  await assertCanEdit(familyId);

  if (!photosEnabled) return { ok: false as const, problem: "not-configured" as const };
  if (!file || file.size === 0) return { ok: false as const, problem: "not-found" as const };
  if (!OK_TYPES.has(file.type)) return { ok: false as const, problem: "bad-type" as const };
  if (file.size > MAX_BYTES) return { ok: false as const, problem: "too-big" as const };

  const person = await prisma.person.findFirst({
    where: { id: personId, familyId },
    select: { photoUrl: true },
  });
  if (!person) return { ok: false as const, problem: "not-found" as const };

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const blob = await put(`people/${personId}.${ext}`, file, {
    access: "public",
    addRandomSuffix: true,
  });

  if (person.photoUrl) await del(person.photoUrl).catch(() => undefined);
  await prisma.person.update({ where: { id: personId }, data: { photoUrl: blob.url } });
  return { ok: true as const };
}

export async function removePhoto(familyId: string, personId: string) {
  await assertCanEdit(familyId);

  const person = await prisma.person.findFirst({
    where: { id: personId, familyId },
    select: { photoUrl: true },
  });
  if (person?.photoUrl) {
    if (photosEnabled) await del(person.photoUrl).catch(() => undefined);
    await prisma.person.update({ where: { id: personId }, data: { photoUrl: null } });
  }
  return { ok: true as const };
}
