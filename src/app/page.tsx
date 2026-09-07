import { FamilyTree } from "@/components/FamilyTree";
import { loadDefaultFamily } from "@/lib/family-data";
import { generations } from "@/lib/family";

// The page reads the database per request, so it can't be statically rendered
// at build time. Phase 2 adds per-family routes; this stays dynamic.
export const dynamic = "force-dynamic";

export default async function Home() {
  const family = await loadDefaultFamily();

  if (!family) {
    return (
      <main className="page">
        <header className="masthead">
          <p className="eyebrow">Proof of concept</p>
          <h1>Family Tree</h1>
          <p className="sub">
            No family has been seeded yet. Run <code>npm run db:deploy</code> then{" "}
            <code>npm run db:seed</code> to populate this page.
          </p>
        </header>
      </main>
    );
  }

  const rows = generations(family.people);

  return (
    <main className="page">
      <header className="masthead">
        <p className="eyebrow">Proof of concept</p>
        <h1>Family Tree</h1>
        <p className="sub">
          {family.people.length} people across {rows.length} generations, loaded from Postgres. Each
          person stores only their own parents; every generation, relationship and count on this page
          is still derived at render time.
        </p>
      </header>

      <FamilyTree people={family.people} />

      <footer className="foot">
        <p>
          Pushed to GitHub, verified by Actions, deployed by Vercel. Nothing in this pipeline runs on
          a development machine.
        </p>
      </footer>
    </main>
  );
}
