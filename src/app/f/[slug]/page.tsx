import Link from "next/link";
import { notFound } from "next/navigation";

import { FamilyTree } from "@/components/FamilyTree";
import { generations } from "@/lib/family";
import { loadFamilyGraph } from "@/lib/family-data";
import { prisma } from "@/lib/db";
import { canView, canEdit } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function FamilyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const family = await prisma.family.findUnique({ where: { slug } });
  // A private family the viewer can't see is indistinguishable from a missing one.
  if (!family || !(await canView(family))) notFound();

  const people = await loadFamilyGraph(family.id);
  const rows = generations(people);
  const editable = await canEdit(family.id);

  return (
    <main className="page">
      <header className="masthead">
        <p className="eyebrow">
          <Link href="/">Families</Link> / {family.slug}
          {family.visibility === "PRIVATE" && " · private"}
        </p>
        <h1>{family.name}</h1>
        {family.description && <p className="sub">{family.description}</p>}
        <p className="sub">
          {people.length} {people.length === 1 ? "person" : "people"} across {rows.length}{" "}
          {rows.length === 1 ? "generation" : "generations"}, derived at render time.
          {editable && (
            <>
              {" "}
              <Link href={`/f/${family.slug}/manage`}>Manage</Link>
            </>
          )}
        </p>
      </header>

      {people.length > 0 ? (
        <FamilyTree people={people} />
      ) : (
        <p className="sub">
          No people yet.{" "}
          {editable && <Link href={`/f/${family.slug}/manage`}>Add the first one</Link>}
        </p>
      )}
    </main>
  );
}
