"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import {
  addPerson,
  updatePerson,
  removePerson,
  setParents,
  type PersonInput,
} from "@/lib/people";
import { addUnion, removeUnion } from "@/lib/unions";
import { setPhoto, removePhoto } from "@/lib/photos";

async function familyIdOr404(slug: string) {
  const family = await prisma.family.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!family) redirect("/");
  return family.id;
}

function back(slug: string, problem?: string): never {
  redirect(`/f/${slug}/manage${problem ? `?error=${problem}` : ""}`);
}

function readPerson(formData: FormData): PersonInput {
  return {
    givenName: String(formData.get("givenName") ?? ""),
    familyName: String(formData.get("familyName") ?? ""),
    birthYear: String(formData.get("birthYear") ?? ""),
    deathYear: String(formData.get("deathYear") ?? ""),
    gender: String(formData.get("gender") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    aliases: String(formData.get("aliases") ?? ""),
  };
}

export async function addPersonAction(slug: string, formData: FormData) {
  const familyId = await familyIdOr404(slug);
  const result = await addPerson(familyId, readPerson(formData));
  back(slug, result.ok ? undefined : result.problem);
}

export async function updatePersonAction(slug: string, formData: FormData) {
  const familyId = await familyIdOr404(slug);
  const personId = String(formData.get("personId") ?? "");
  const result = await updatePerson(familyId, personId, readPerson(formData));
  back(slug, result.ok ? undefined : result.problem);
}

export async function removePersonAction(slug: string, formData: FormData) {
  const familyId = await familyIdOr404(slug);
  await removePerson(familyId, String(formData.get("personId") ?? ""));
  back(slug);
}

export async function setParentsAction(slug: string, formData: FormData) {
  const familyId = await familyIdOr404(slug);
  const childId = String(formData.get("childId") ?? "");
  const parentIds = formData.getAll("parentId").map(String);
  const result = await setParents(familyId, childId, parentIds);
  back(slug, result.ok ? undefined : result.problem);
}

export async function addUnionAction(slug: string, formData: FormData) {
  const familyId = await familyIdOr404(slug);
  const result = await addUnion(familyId, {
    partnerAId: String(formData.get("partnerAId") ?? ""),
    partnerBId: String(formData.get("partnerBId") ?? ""),
    kind: String(formData.get("kind") ?? ""),
    startYear: String(formData.get("startYear") ?? ""),
    endYear: String(formData.get("endYear") ?? ""),
  });
  back(slug, result.ok ? undefined : result.problem);
}

export async function removeUnionAction(slug: string, formData: FormData) {
  const familyId = await familyIdOr404(slug);
  await removeUnion(familyId, String(formData.get("unionId") ?? ""));
  back(slug);
}

export async function setPhotoAction(slug: string, formData: FormData) {
  const familyId = await familyIdOr404(slug);
  const personId = String(formData.get("personId") ?? "");
  const file = formData.get("photo");
  const result =
    file instanceof File
      ? await setPhoto(familyId, personId, file)
      : ({ ok: false as const, problem: "not-found" as const });
  back(slug, result.ok ? undefined : result.problem);
}

export async function removePhotoAction(slug: string, formData: FormData) {
  const familyId = await familyIdOr404(slug);
  await removePhoto(familyId, String(formData.get("personId") ?? ""));
  back(slug);
}
