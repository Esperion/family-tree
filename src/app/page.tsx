import { FamilyTree } from "@/components/FamilyTree";
import { family, generations } from "@/lib/family";

export default function Home() {
  const rows = generations(family);

  return (
    <main className="page">
      <header className="masthead">
        <p className="eyebrow">Proof of concept</p>
        <h1>Family Tree</h1>
        <p className="sub">
          {family.length} people across {rows.length} generations, derived on the server from a
          single seed file. Every generation, relationship and count on this page is computed —
          none of it is stored.
        </p>
      </header>

      <FamilyTree people={family} />

      <footer className="foot">
        <p>
          Pushed to GitHub, verified by Actions, deployed by Vercel. Nothing in this pipeline runs
          on a development machine.
        </p>
      </footer>
    </main>
  );
}
