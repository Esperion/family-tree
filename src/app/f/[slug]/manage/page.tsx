import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { canEdit } from "@/lib/authz";
import { listPeopleForManage } from "@/lib/people";
import { listUnions } from "@/lib/unions";
import { formatAliases } from "@/lib/aliases";
import { photosEnabled } from "@/lib/photos";
import {
  addPersonAction,
  updatePersonAction,
  removePersonAction,
  setParentsAction,
  addUnionAction,
  removeUnionAction,
  setPhotoAction,
  removePhotoAction,
} from "@/app/actions/people";

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, string> = {
  "missing-name": "A person needs at least a given name.",
  "too-many": "A person can have at most two parents here.",
  self: "A person can't be their own parent.",
  cycle: "That would make someone their own ancestor.",
  "outside-family": "Pick people from this family.",
  "same-person": "A couple needs two different people.",
  duplicate: "That couple is already recorded.",
  "not-configured": "Photo upload isn't set up on this deployment.",
  "bad-type": "Photos must be JPEG, PNG, WebP or GIF.",
  "too-big": "That image is too large (max 4 MB).",
  "not-found": "Couldn't find that person.",
};

function fullName(p: { givenName: string; familyName: string | null }) {
  return p.familyName ? `${p.givenName} ${p.familyName}` : p.givenName;
}

export default async function ManagePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const { error } = await searchParams;

  const family = await prisma.family.findUnique({ where: { slug } });
  if (!family || !(await canEdit(family.id))) notFound();

  const people = await listPeopleForManage(family.id);
  const unions = await listUnions(family.id);
  const message = error ? (MESSAGES[error] ?? "Something went wrong.") : null;

  return (
    <main className="page">
      <header className="masthead">
        <p className="eyebrow">
          <Link href="/">Families</Link> / <Link href={`/f/${slug}`}>{slug}</Link> / manage
        </p>
        <h1>Manage {family.name}</h1>
        <p className="sub">
          {people.length} {people.length === 1 ? "person" : "people"}, {unions.length}{" "}
          {unions.length === 1 ? "couple" : "couples"}.
        </p>
      </header>

      {message && <p className="signin-error">{message}</p>}

      <section className="mng-section">
        <h2>Add a person</h2>
        <form className="stack-form" action={addPersonAction.bind(null, slug)}>
          <label htmlFor="a-given">Given name</label>
          <input id="a-given" name="givenName" required />
          <label htmlFor="a-family">Family name</label>
          <input id="a-family" name="familyName" />
          <label htmlFor="a-birth">Birth year</label>
          <input id="a-birth" name="birthYear" inputMode="numeric" />
          <label htmlFor="a-death">Death year</label>
          <input id="a-death" name="deathYear" inputMode="numeric" />
          <label htmlFor="a-aliases">Also known as (comma-separated)</label>
          <input id="a-aliases" name="aliases" placeholder="maiden name, nickname" />
          <button type="submit" className="button">
            Add person
          </button>
        </form>
      </section>

      <section className="mng-section">
        <h2>People</h2>
        {people.length === 0 && <p className="sub">No one yet.</p>}
        <ul className="mng-people">
          {people.map((person) => {
            const others = people.filter((p) => p.id !== person.id);
            const [p1 = "", p2 = ""] = person.parentIds;
            return (
              <li key={person.id}>
                <details className="mng-person">
                  <summary>
                    <strong>{fullName(person)}</strong>{" "}
                    <span className="mng-years">
                      {person.birthYear ?? "?"}
                      {person.deathYear ? `–${person.deathYear}` : ""}
                    </span>
                    {person.aliases.length > 0 && (
                      <span className="mng-aka"> aka {formatAliases(person.aliases)}</span>
                    )}
                  </summary>

                  <div className="mng-person-body">
                    <form
                      className="stack-form"
                      action={updatePersonAction.bind(null, slug)}
                    >
                      <input type="hidden" name="personId" value={person.id} />
                      <label>Given name
                        <input name="givenName" defaultValue={person.givenName} required />
                      </label>
                      <label>Family name
                        <input name="familyName" defaultValue={person.familyName ?? ""} />
                      </label>
                      <label>Birth year
                        <input name="birthYear" defaultValue={person.birthYear ?? ""} inputMode="numeric" />
                      </label>
                      <label>Death year
                        <input name="deathYear" defaultValue={person.deathYear ?? ""} inputMode="numeric" />
                      </label>
                      <label>Gender
                        <input name="gender" defaultValue={person.gender ?? ""} />
                      </label>
                      <label>Also known as
                        <input name="aliases" defaultValue={formatAliases(person.aliases)} />
                      </label>
                      <label>Notes
                        <textarea name="notes" defaultValue={person.notes ?? ""} rows={2} />
                      </label>
                      <button type="submit" className="button">Save</button>
                    </form>

                    <form
                      className="stack-form mng-parents"
                      action={setParentsAction.bind(null, slug)}
                    >
                      <input type="hidden" name="childId" value={person.id} />
                      <label>Parent 1
                        <select name="parentId" defaultValue={p1}>
                          <option value="">— none —</option>
                          {others.map((o) => (
                            <option key={o.id} value={o.id}>{fullName(o)}</option>
                          ))}
                        </select>
                      </label>
                      <label>Parent 2
                        <select name="parentId" defaultValue={p2}>
                          <option value="">— none —</option>
                          {others.map((o) => (
                            <option key={o.id} value={o.id}>{fullName(o)}</option>
                          ))}
                        </select>
                      </label>
                      <button type="submit" className="button button-secondary">Set parents</button>
                    </form>

                    {photosEnabled && (
                      <form
                        className="stack-form"
                        action={setPhotoAction.bind(null, slug)}
                        encType="multipart/form-data"
                      >
                        <input type="hidden" name="personId" value={person.id} />
                        <label>Photo
                          <input type="file" name="photo" accept="image/*" />
                        </label>
                        <div className="button-row">
                          <button type="submit" className="button button-secondary button-small">
                            Upload photo
                          </button>
                          {person.photoUrl && (
                            <button
                              type="submit"
                              className="button button-secondary button-small"
                              formAction={removePhotoAction.bind(null, slug)}
                            >
                              Remove photo
                            </button>
                          )}
                        </div>
                      </form>
                    )}

                    <form action={removePersonAction.bind(null, slug)}>
                      <input type="hidden" name="personId" value={person.id} />
                      <button type="submit" className="button button-danger button-small">
                        Remove {person.givenName}
                      </button>
                    </form>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mng-section">
        <h2>Couples</h2>
        <ul className="mng-unions">
          {unions.map((union) => (
            <li key={union.id}>
              {fullName(union.partnerA)} &amp; {fullName(union.partnerB)}
              {" · "}
              {union.kind.toLowerCase()}
              {union.startYear ? ` ${union.startYear}` : ""}
              {union.endYear ? `–${union.endYear}` : ""}
              <form action={removeUnionAction.bind(null, slug)} className="mng-inline">
                <input type="hidden" name="unionId" value={union.id} />
                <button type="submit" className="button button-danger button-small">Remove</button>
              </form>
            </li>
          ))}
          {unions.length === 0 && <li className="sub">No couples recorded.</li>}
        </ul>

        {people.length >= 2 && (
          <form className="stack-form" action={addUnionAction.bind(null, slug)}>
            <label>Partner 1
              <select name="partnerAId" defaultValue="">
                <option value="" disabled>— choose —</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>{fullName(p)}</option>
                ))}
              </select>
            </label>
            <label>Partner 2
              <select name="partnerBId" defaultValue="">
                <option value="" disabled>— choose —</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>{fullName(p)}</option>
                ))}
              </select>
            </label>
            <label>Kind
              <select name="kind" defaultValue="MARRIAGE">
                <option value="MARRIAGE">Marriage</option>
                <option value="PARTNERSHIP">Partnership</option>
              </select>
            </label>
            <label>From year
              <input name="startYear" inputMode="numeric" />
            </label>
            <label>To year
              <input name="endYear" inputMode="numeric" />
            </label>
            <button type="submit" className="button">Add couple</button>
          </form>
        )}
      </section>

    </main>
  );
}
