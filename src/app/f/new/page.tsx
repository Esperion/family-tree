import { redirect } from "next/navigation";

import { getViewer } from "@/lib/authz";
import { createFamilyAction } from "@/app/actions/families";

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, string> = {
  "not-signed-in": "You need to sign in to create a family.",
  "missing-name": "Give the family a name.",
};

export default async function NewFamilyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer) redirect("/signin");

  const { error } = await searchParams;
  const message = error ? (MESSAGES[error] ?? "Something went wrong.") : null;

  return (
    <main className="page">
      <header className="masthead">
        <p className="eyebrow">Families / new</p>
        <h1>New family</h1>
        <p className="sub">You&apos;ll be its first editor. You can add people right after.</p>
      </header>

      {message && <p className="signin-error">{message}</p>}

      <form className="stack-form" action={createFamilyAction}>
        <label htmlFor="name">Name</label>
        <input id="name" name="name" type="text" required autoFocus />

        <label htmlFor="description">Description</label>
        <input id="description" name="description" type="text" placeholder="optional" />

        <label htmlFor="visibility">Visibility</label>
        <select id="visibility" name="visibility" defaultValue="PRIVATE">
          <option value="PRIVATE">Private — only editors can see it</option>
          <option value="PUBLIC">Public — anyone can view the tree</option>
        </select>

        <button type="submit" className="button">
          Create family
        </button>
      </form>
    </main>
  );
}
