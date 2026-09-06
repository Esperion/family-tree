# Family Tree POC

A deliberately small Next.js app whose real purpose is to prove out an end-to-end
pipeline: **write in a Codespace → verify in GitHub Actions → deploy on Vercel**,
with no step running on a local machine.

## What the app does

Thirteen people across four generations live in one seed file,
[`src/lib/family.ts`](src/lib/family.ts). Each person records only their own
parents. Everything else — children, generation depth, ancestry, descendants — is
**derived** at render time, so the data has a single source of truth and cannot
contradict itself.

The page is a React Server Component. There is no client-side JavaScript, no
database, and no API call.

## Pipeline

| Stage | Where it runs | What happens |
| --- | --- | --- |
| Develop | GitHub Codespaces | Container defined by [`.devcontainer/`](.devcontainer/devcontainer.json) |
| Verify | GitHub Actions | Lint, typecheck, test, build — see [`ci.yml`](.github/workflows/ci.yml) |
| Deploy | Vercel | Auto-deploys `main`; every PR gets a preview URL |

Nothing here needs a local toolchain. That is the point.

## Commands

```bash
npm install      # once
npm run dev      # http://localhost:3000
npm run lint     # eslint
npm run typecheck# tsc --noEmit
npm test         # vitest
npm run build    # next build
```

CI runs the last four on every push and pull request to `main`.

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

## Deploying to Vercel

Import the repository at [vercel.com/new](https://vercel.com/new). Next.js is
auto-detected, so no build configuration is required and no CLI or token is
needed — Vercel's GitHub integration handles it. Pushes to `main` go to
production; pull requests get preview deployments.

## Adding a database later

This POC has no persistence on purpose — it keeps the first pipeline run fast and
free of external accounts. To add it, provision **Neon Postgres** from the Vercel
Marketplace (Vercel's own Postgres product was retired in June 2025) and wire up
Prisma with both a pooled and a direct connection URL:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")   // pooled — for the app
  directUrl = env("DIRECT_URL")     // direct — for migrations
}
```

Then add `"postinstall": "prisma generate"` to `package.json`, or cached builds
will deploy a stale client.
