/**
 * Grant the global admin flag to an existing user.
 *
 *   npm run grant-admin -- someone@example.com
 *
 * The user must have signed in at least once so their row exists.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const email = process.argv[2]?.trim().toLowerCase();

async function main() {
  if (!email || !email.includes("@")) {
    console.error("usage: npm run grant-admin -- <email>");
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user
    .update({
      where: { email },
      data: { isSuperAdmin: true },
      select: { email: true },
    })
    .catch(() => null);

  if (!user) {
    console.error(`No user with email "${email}". They must sign in once first.`);
    process.exitCode = 1;
    return;
  }

  console.log(`${user.email} is now a superadmin.`);
}

main().finally(() => prisma.$disconnect());
