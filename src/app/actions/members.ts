"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { inviteEditor, removeMember, leaveFamily } from "@/lib/members";

async function familyBySlug(slug: string) {
  const family = await prisma.family.findUnique({
    where: { slug },
    select: { id: true, createdById: true },
  });
  if (!family) redirect("/");
  return family;
}

export async function inviteEditorAction(slug: string, formData: FormData) {
  const family = await familyBySlug(slug);
  const result = await inviteEditor(family, String(formData.get("email") ?? ""));
  redirect(`/f/${slug}/members${result.ok ? "" : `?error=${result.problem}`}`);
}

export async function removeMemberAction(slug: string, formData: FormData) {
  const family = await familyBySlug(slug);
  const result = await removeMember(family, String(formData.get("userId") ?? ""));
  redirect(`/f/${slug}/members${result.ok ? "" : `?error=${result.problem}`}`);
}

export async function leaveFamilyAction(slug: string) {
  const family = await familyBySlug(slug);
  const result = await leaveFamily(family);
  redirect(result.ok ? "/" : `/f/${slug}/members?error=${result.problem}`);
}
