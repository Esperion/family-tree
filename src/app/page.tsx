import Link from "next/link";
import type { Visibility } from "@prisma/client";

import { getViewer } from "@/lib/authz";
import { listDirectory } from "@/lib/families";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; mine?: string; visibility?: string }>;
}) {
  const sp = await searchParams;
  const viewer = await getViewer();

  const mine = sp.mine === "1";
  const visibility: Visibility | undefined =
    sp.visibility === "PUBLIC" || sp.visibility === "PRIVATE" ? sp.visibility : undefined;

  const families = await listDirectory({ q: sp.q?.trim() || undefined, mine, visibility });

  return (
    <main className="page">
      <header className="masthead">
        <p className="eyebrow">Proof of concept</p>
        <h1>Families</h1>
        <p className="sub">
          {viewer
            ? "Public families, plus the ones you can edit."
            : "Public families. Sign in to create your own or edit one you belong to."}
        </p>
      </header>

      <div className="dir-toolbar">
        <form className="dir-filters" method="get">
          <input
            type="search"
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Search by name"
            aria-label="Search families by name"
          />
          <select name="visibility" defaultValue={visibility ?? ""} aria-label="Visibility">
            <option value="">Any visibility</option>
            <option value="PUBLIC">Public</option>
            <option value="PRIVATE">Private</option>
          </select>
          {viewer && (
            <label className="dir-mine">
              <input type="checkbox" name="mine" value="1" defaultChecked={mine} />
              Only mine
            </label>
          )}
          <button type="submit" className="button button-secondary">
            Filter
          </button>
        </form>

        {viewer && (
          <Link href="/f/new" className="button">
            New family
          </Link>
        )}
      </div>

      {families.length === 0 ? (
        <p className="sub">No families match.</p>
      ) : (
        <ul className="dir-grid">
          {families.map((family) => (
            <li key={family.id} className="dir-card">
              <div className="dir-card-head">
                <h2>
                  <Link href={`/f/${family.slug}`}>{family.name}</Link>
                </h2>
                <span className={`badge badge-${family.visibility.toLowerCase()}`}>
                  {family.visibility.toLowerCase()}
                </span>
              </div>
              {family.description && <p className="dir-card-desc">{family.description}</p>}
              <p className="dir-card-meta">
                {family.peopleCount} {family.peopleCount === 1 ? "person" : "people"}
                {family.isEditor && " · you can edit"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
