import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: { memberships: { include: { organization: true, role: true } } }
  });

  console.log('\n--- EXISTING REGISTERED USERS ---');
  for (const u of users) {
    console.log({
      id: u.id,
      email: u.email,
      username: u.username,
      name: `${u.firstName} ${u.lastName || ''}`,
      roles: u.memberships.map((m) => `${m.role?.name} @ ${m.organization.name}`)
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
