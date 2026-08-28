import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { RoleType } from '@aescion/shared-types';

export async function bootstrapSuperAdmin(prisma: PrismaClient) {
  const superAdminEmail = 'superadmin@aescion.com';
  const superAdminPassword = 'Aescion@Super#2026';

  let platformOrg = await prisma.organization.findFirst({
    where: { name: 'AESCION Platform Super Admin' }
  });

  if (!platformOrg) {
    platformOrg = await prisma.organization.create({
      data: {
        name: 'AESCION Platform Super Admin',
        legalName: 'AESCION Enterprise Platform HQ',
        businessType: 'RETAIL',
        currency: 'INR',
        country: 'India',
        email: superAdminEmail,
        phone: '+91 9000000000',
        address: 'Platform Control Center',
        city: 'Bengaluru',
        state: 'Karnataka',
        pinCode: '560001',
        gstStatus: false
      }
    });
  }

  let mainBranch = await prisma.branch.findFirst({
    where: { organizationId: platformOrg.id }
  });

  if (!mainBranch) {
    mainBranch = await prisma.branch.create({
      data: {
        organizationId: platformOrg.id,
        name: 'Platform Operations HQ',
        code: 'PLATFORM-HQ',
        isMain: true,
        isActive: true
      }
    });
  }

  let superAdminRole = await prisma.role.findFirst({
    where: {
      organizationId: platformOrg.id,
      roleType: RoleType.SUPER_ADMIN
    }
  });

  if (!superAdminRole) {
    superAdminRole = await prisma.role.create({
      data: {
        organizationId: platformOrg.id,
        name: 'Platform Super Administrator',
        roleType: RoleType.SUPER_ADMIN,
        permissions: ['*'],
        isSystem: true
      }
    });
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: superAdminEmail },
        { username: 'superadmin' }
      ]
    }
  });

  const passwordHash = await bcrypt.hash(superAdminPassword, 10);

  let userId: string;
  if (!existingUser) {
    const newUser = await prisma.user.create({
      data: {
        email: superAdminEmail,
        username: 'superadmin',
        passwordHash,
        firstName: 'Platform',
        lastName: 'Super Admin',
        mobileNumber: '+91 9000000000',
        isActive: true
      }
    });
    userId = newUser.id;
  } else {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        passwordHash,
        isActive: true
      }
    });
    userId = existingUser.id;
  }

  const existingMembership = await prisma.membership.findFirst({
    where: {
      userId,
      organizationId: platformOrg.id
    }
  });

  if (!existingMembership) {
    await prisma.membership.create({
      data: {
        userId,
        organizationId: platformOrg.id,
        branchId: mainBranch.id,
        roleId: superAdminRole.id,
        isActive: true
      }
    });
  } else {
    await prisma.membership.update({
      where: { id: existingMembership.id },
      data: {
        roleId: superAdminRole.id,
        isActive: true
      }
    });
  }

  return {
    organizationId: platformOrg.id,
    userId,
    email: superAdminEmail
  };
}
