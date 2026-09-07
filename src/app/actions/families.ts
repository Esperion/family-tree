"use server";

import { redirect } from "next/navigation";
import type { Visibility } from "@prisma/client";

import { createFamily } from "@/lib/families";

export async function createFamilyAction(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const description = String(formData.get("description") ?? "");
  const visibility: Visibility =
    String(formData.get("visibility")) === "PUBLIC" ? "PUBLIC" : "PRIVATE";

  const result = await createFamily({ name, description, visibility });

  if (!result.ok) {
    redirect(`/f/new?error=${result.problem}`);
  }

  redirect(`/f/${result.slug}`);
}
