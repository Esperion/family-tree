import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/db";
import { canEdit, canManage } from "@/lib/authz";
import { listMembers } from "@/lib/members";
import {
  inviteEditorAction,
  removeMemberAction,
  leaveFamilyAction,
} from "@/app/actions/members";

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, string> = {
  "no-such-user": "No account with that email. They need to sign up first.",
  "already-member": "That person is already an editor.",
  "is-creator": "The family creator can't be removed.",
};

export default async function MembersPage({
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

  const members = await listMembers(family);
  const manage = await canManage(family);
  const message = error ? (MESSAGES[error] ?? "Something went wrong.") : null;

  return (
    <main className="page">
      <header className="masthead">
        <p className="eyebrow">
          <Link href="/">Families</Link> / <Link href={`/f/${slug}`}>{slug}</Link> / members
        </p>
        <h1>Editors of {family.name}</h1>
        <p className="sub">
          Editors can add, edit and remove people and relationships.
          {manage ? " You can invite and remove editors." : ""}
        </p>
      </header>

      {message && <p className="signin-error">{message}</p>}

      <ul className="member-list">
        {members.map((member) => (
          <li key={member.userId} className="member-row">
            <div>
              <span className="member-name">{member.name ?? member.email}</span>{" "}
              {member.isCreator && <span className="badge badge-public">creator</span>}{" "}
              {member.isSuperAdmin && <span className="badge badge-admin">admin</span>}{" "}
              {member.isSelf && <span className="member-you">you</span>}
              <div className="member-email">{member.email}</div>
            </div>
            {manage && !member.isCreator && (
              <form action={removeMemberAction.bind(null, slug)}>
                <input type="hidden" name="userId" value={member.userId} />
                <button type="submit" className="link-button">
                  Remove
                </button>
              </form>
            )}
            {!manage && member.isSelf && (
              <form action={leaveFamilyAction.bind(null, slug)}>
                <button type="submit" className="link-button">
                  Leave
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>

      {manage && (
        <form className="stack-form" action={inviteEditorAction.bind(null, slug)}>
          <label htmlFor="email">Invite an editor by email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="they must already have an account"
          />
          <button type="submit" className="button">
            Add editor
          </button>
        </form>
      )}
    </main>
  );
}
