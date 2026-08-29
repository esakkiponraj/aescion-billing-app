import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function bootstrapSuperAdmin() {
  const superAdminEmail = 'superadmin@aescion.com';
  const superAdminUsername = 'superadmin';
  const superAdminPassword = 'Aescion@Super#2026';
  const passwordHash = await bcrypt.hash(superAdminPassword, 10);

  // 1. Check or create Platform Admin Organization
  let platformOrg = await prisma.organization.findFirst({
    where: { name: 'AESCION Platform Administration' },
    include: { branches: true }
  });

  if (!platformOrg) {
    platformOrg = await prisma.organization.create({
      data: {
        name: 'AESCION Platform Administration',
        legalName: 'AESCION Global Technologies Inc.',
        businessType: 'SUPERMARKET',
        country: 'IN',
        currency: 'INR',
        phone: '+18005550199',
        email: superAdminEmail,
        branches: {
          create: {
            name: 'Platform Operations Center',
            code: 'PLATFORM_HQ',
            isMain: true
          }
        }
      },
      include: { branches: true }
    });
  }

  const platformBranch = platformOrg.branches[0] || (await prisma.branch.create({
    data: {
      organizationId: platformOrg.id,
      name: 'Platform Operations Center',
      code: 'PLATFORM_HQ',
      isMain: true
    }
  }));

  // 2. Check or create SUPER_ADMIN role
  let superAdminRole = await prisma.role.findFirst({
    where: {
      roleType: 'SUPER_ADMIN',
      OR: [{ organizationId: platformOrg.id }, { isSystem: true }]
    }
  });

  if (!superAdminRole) {
    superAdminRole = await prisma.role.create({
      data: {
        organizationId: platformOrg.id,
        name: 'SUPER_ADMIN',
        roleType: 'SUPER_ADMIN',
        isSystem: true,
        permissions: ['*']
      }
    });
  }

  // 3. Upsert Super Admin User
  const user = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {
      username: superAdminUsername,
      passwordHash,
      isActive: true,
      firstName: 'Platform',
      lastName: 'SuperAdmin'
    },
    create: {
      email: superAdminEmail,
      username: superAdminUsername,
      firstName: 'Platform',
      lastName: 'SuperAdmin',
      passwordHash,
      isActive: true
    }
  });

  // 4. Ensure Membership with SUPER_ADMIN role
  const existingMembership = await prisma.membership.findFirst({
    where: {
      userId: user.id,
      organizationId: platformOrg.id
    }
  });

  if (!existingMembership) {
    await prisma.membership.create({
      data: {
        userId: user.id,
        organizationId: platformOrg.id,
        branchId: platformBranch.id,
        roleId: superAdminRole.id,
        isActive: true
      }
    });
  } else {
    await prisma.membership.update({
      where: { id: existingMembership.id },
      data: {
        roleId: superAdminRole.id,
        branchId: platformBranch.id,
        isActive: true
      }
    });
  }

  console.log('✅ Official Super Admin account bootstrapped: superadmin@aescion.com');
}

bootstrapSuperAdmin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
