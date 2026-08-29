import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash1 = await bcrypt.hash('Password123!', 10);
  const hash2 = await bcrypt.hash('admin123', 10);

  // 1. Get or create Org
  let org = await prisma.organization.findFirst({
    include: { branches: true }
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'AESCION Commerce Flagship',
        businessType: 'SUPERMARKET',
        taxMode: 'EXCLUSIVE',
        phone: '9876543210',
        email: 'admin@aescion.com',
        branches: {
          create: {
            name: 'Flagship Branch',
            code: 'MAIN',
            isMain: true
          }
        }
      },
      include: { branches: true }
    });
  }

  const branch = org.branches[0] || (await prisma.branch.create({
    data: { organizationId: org.id, name: 'Flagship Branch', code: 'MAIN', isMain: true }
  }));

  // 2. Get or create Role
  let role = await prisma.role.findFirst({
    where: {
      name: 'OWNER',
      OR: [{ organizationId: org.id }, { organizationId: null, isSystem: true }]
    }
  });

  if (!role) {
    role = await prisma.role.create({
      data: {
        organizationId: org.id,
        name: 'OWNER',
        roleType: 'OWNER',
        isSystem: true,
        permissions: ['*']
      }
    });
  }

  // 3. Setup Account 1: admin@aescion.com / Password123!
  const u1 = await prisma.user.upsert({
    where: { email: 'admin@aescion.com' },
    update: {
      username: 'admin',
      passwordHash: hash1,
      isActive: true,
      firstName: 'Super',
      lastName: 'Admin'
    },
    create: {
      email: 'admin@aescion.com',
      username: 'admin',
      passwordHash: hash1,
      isActive: true,
      firstName: 'Super',
      lastName: 'Admin'
    }
  });

  const m1 = await prisma.membership.findFirst({
    where: { userId: u1.id, organizationId: org.id }
  });

  if (!m1) {
    await prisma.membership.create({
      data: {
        userId: u1.id,
        organizationId: org.id,
        branchId: branch.id,
        roleId: role.id,
        isActive: true
      }
    });
  } else {
    await prisma.membership.update({
      where: { id: m1.id },
      data: { roleId: role.id, branchId: branch.id, isActive: true }
    });
  }

  // 4. Setup Account 2: owner@aescion.com / admin123
  const u2 = await prisma.user.upsert({
    where: { email: 'owner@aescion.com' },
    update: {
      username: 'owner',
      passwordHash: hash2,
      isActive: true,
      firstName: 'Business',
      lastName: 'Owner'
    },
    create: {
      email: 'owner@aescion.com',
      username: 'owner',
      passwordHash: hash2,
      isActive: true,
      firstName: 'Business',
      lastName: 'Owner'
    }
  });

  const m2 = await prisma.membership.findFirst({
    where: { userId: u2.id, organizationId: org.id }
  });

  if (!m2) {
    await prisma.membership.create({
      data: {
        userId: u2.id,
        organizationId: org.id,
        branchId: branch.id,
        roleId: role.id,
        isActive: true
      }
    });
  } else {
    await prisma.membership.update({
      where: { id: m2.id },
      data: { roleId: role.id, branchId: branch.id, isActive: true }
    });
  }

  console.log('\n================================================================');
  console.log('✅ SUPER ADMIN ACCOUNTS INITIALIZED');
  console.log('================================================================');
  console.log('Account 1: admin@aescion.com (or "admin") / Password123!');
  console.log('Account 2: owner@aescion.com (or "owner") / admin123');
  console.log('================================================================\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
