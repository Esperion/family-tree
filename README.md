# Family Tree POC

A deliberately small Next.js app whose real purpose is to prove out an end-to-end
pipeline: **write in a Codespace → verify in GitHub Actions → deploy on Vercel**,
with no step running on a local machine.

## What the app does

Thirteen people across four generations. Each person records only their own
parents; everything else — children, generation depth, ancestry, descendants — is
**derived** at render time, so the data has a single source of truth and cannot
contradict itself.

The page is a React Server Component with no client-side JavaScript. Since
[Phase 0](#database-phase-0) the people live in Postgres, loaded per request;
[`src/lib/family.ts`](src/lib/family.ts) stays a file of pure derivation
functions (still the canonical fixture for the tests), and
[`src/lib/family-data.ts`](src/lib/family-data.ts) is the only code that touches
the database.

## Pipeline

| Stage | Where it runs | What happens |
| --- | --- | --- |
| Develop | GitHub Codespaces | Container defined by [`.devcontainer/`](.devcontainer/devcontainer.json) |
| Verify | GitHub Actions | Lint, typecheck, test, build — see [`ci.yml`](.github/workflows/ci.yml) |
| Deploy | Vercel | Auto-deploys `main`; every PR gets a preview URL |

Nothing here needs a local toolchain. That is the point.

## Commands

```bash
npm install      # once (runs `prisma generate` via postinstall)
npm run dev      # http://localhost:3000
npm run lint     # eslint
npm run typecheck# tsc --noEmit
npm test         # vitest
npm run build    # next build

npm run db:deploy  # apply migrations (prisma migrate deploy)
npm run db:migrate # create + apply a new migration in dev
npm run db:seed    # load the Meyer / Roth family
npm run db:studio  # browse the data
```

CI runs lint, typecheck, test and build on every push and pull request to
`main`.

## Tests

[`src/lib/family.test.ts`](src/lib/family.test.ts) covers the derivation logic
rather than the markup, including the cases that actually break tree code:

- **Seed integrity** — no dangling parent ids, nobody is their own parent.
- **Generation depth from the deepest line.** Daniel's parents are Erik
  (generation 0, married in) and Ruth (generation 1). The deeper line wins, so
  Daniel is generation 2 — a naive implementation returns 1.
- **De-duplication.** Ruth and Peter are both children of Tomas, so their shared
  descendants must not be counted twice.
- **Cycle safety.** Malformed data must terminate instead of overflowing the stack.

## Database (Phase 0)

Persistence is now real: Prisma + Postgres, schema in
[`prisma/schema.prisma`](prisma/schema.prisma). The schema lays down every table
the roadmap needs — Auth.js adapter models and the family-tree domain
(`Family`, `Membership`, `Person`, `ParentChild`, `Union`) — so later phases are
wiring, not migrations.

### Local setup

1. Provision **Neon Postgres** from the Vercel Marketplace (Vercel's own Postgres
   was retired in June 2025). Copy the **pooled** and **direct** connection
   strings.
2. `cp .env.example .env` and paste them into `DATABASE_URL` (pooled) and
   `DIRECT_URL` (direct). For a plain local Postgres, set both to the same value.
3. `npm install` — `postinstall` runs `prisma generate`.
4. `npm run db:deploy` — applies
   [`prisma/migrations/`](prisma/migrations/) to the empty database.
5. `npm run db:seed` — loads the Meyer / Roth family (13 people) from the
   fixture in `src/lib/family.ts`.
6. `npm run dev`.

To regenerate the initial migration from scratch instead of using the committed
one: `rm -rf prisma/migrations && npm run db:migrate -- --name init`.

### On Vercel

Add `DATABASE_URL` and `DIRECT_URL` to the project's environment variables, and
set the build command to `prisma migrate deploy && next build` so each deploy
applies pending migrations. `BLOB_READ_WRITE_TOKEN` is only needed from Phase 4
(person photos).

## Deploying to Vercel

Import the repository at [vercel.com/new](https://vercel.com/new). Next.js is
auto-detected. Set the environment variables and build command from the section
above; pushes to `main` go to production, pull requests get preview deployments.
Google sign-in (Phase 1) will work on production and `localhost` only — preview
URLs change per deploy and can't be registered as OAuth callbacks.
