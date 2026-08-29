import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createOrResetAdmin() {
  const adminEmail = 'admin@aescion.com';
  const adminUsername = 'admin';
  const plainPassword = 'Password123!';
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  // 1. Check or create Main Organization
  let org = await prisma.organization.findFirst({
    include: { branches: true }
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'AESCION Commerce Enterprise',
        legalName: 'AESCION Technologies Private Limited',
        businessType: 'SUPERMARKET',
        taxMode: 'EXCLUSIVE',
        country: 'IN',
        currency: 'INR',
        phone: '9876543210',
        email: adminEmail,
        branches: {
          create: {
            name: 'Main Flagship Counter',
            code: 'MAIN',
            phone: '9876543210',
            city: 'Chennai',
            state: 'Tamil Nadu',
            isMain: true
          }
        }
      },
      include: { branches: true }
    });
  }

  const branch = org.branches[0] || (await prisma.branch.create({
    data: {
      organizationId: org.id,
      name: 'Main Flagship Counter',
      code: 'MAIN',
      isMain: true
    }
  }));

  // 2. Check or create OWNER role
  let ownerRole = await prisma.role.findFirst({
    where: {
      name: 'OWNER',
      OR: [{ organizationId: org.id }, { organizationId: null, isSystem: true }]
    }
  });

  if (!ownerRole) {
    ownerRole = await prisma.role.create({
      data: {
        organizationId: org.id,
        name: 'OWNER',
        roleType: 'OWNER',
        isSystem: true,
        permissions: ['*']
      }
    });
  }

  // 3. Upsert User
  let user = await prisma.user.findFirst({
    where: {
      OR: [{ email: adminEmail }, { username: adminUsername }]
    }
  });

  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        email: adminEmail,
        username: adminUsername,
        passwordHash,
        isActive: true,
        firstName: 'Super',
        lastName: 'Admin'
      }
    });
  } else {
    user = await prisma.user.create({
      data: {
        email: adminEmail,
        username: adminUsername,
        firstName: 'Super',
        lastName: 'Admin',
        mobileNumber: '9876543210',
        passwordHash,
        isActive: true
      }
    });
  }

  // 4. Ensure Membership with OWNER Role
  const membership = await prisma.membership.findFirst({
    where: { userId: user.id, organizationId: org.id }
  });

  if (!membership) {
    await prisma.membership.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        branchId: branch.id,
        roleId: ownerRole.id,
        isActive: true
      }
    });
  } else {
    await prisma.membership.update({
      where: { id: membership.id },
      data: {
        roleId: ownerRole.id,
        branchId: branch.id,
        isActive: true
      }
    });
  }

  console.log('\n================================================================');
  console.log('👑 SUPER ADMIN / OWNER CREDENTIALS INITIALIZED & VERIFIED');
  console.log('================================================================');
  console.log(`👤 Username:     ${adminUsername}`);
  console.log(`📧 Email:        ${adminEmail}`);
  console.log(`🔑 Password:     ${plainPassword}`);
  console.log(`🏢 Organization: ${org.name}`);
  console.log(`📍 Branch:       ${branch.name}`);
  console.log(`🛡️ Role:         OWNER / SUPER_ADMIN`);
  console.log('================================================================\n');
}

createOrResetAdmin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
