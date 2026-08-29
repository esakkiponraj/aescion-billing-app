import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../common/prisma.service';
import { RoleType } from '@aescion/shared-types';
import { validateDomainPermissions } from '@aescion/capability-config';
import { AuditService } from '../common/services/audit.service';
import { EventsGateway } from '../realtime/events.gateway';

@Injectable()
export class TeamService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private eventsGateway: EventsGateway
  ) {}

  async getMembers(organizationId: string) {
    return this.prisma.membership.findMany({
      where: { organizationId },
      include: {
        user: { select: { id: true, email: true, username: true, firstName: true, lastName: true, mobileNumber: true, isActive: true } },
        branch: true,
        role: true
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  async getRoles(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { businessType: true }
    });

    const roles = await this.prisma.role.findMany({
      where: {
        OR: [{ organizationId }, { organizationId: null, isSystem: true }]
      },
      orderBy: { name: 'asc' }
    });

    const businessType = org?.businessType || 'RETAIL';

    if (businessType === 'RESTAURANT') {
      const allowedRoleTypes = ['OWNER', 'MANAGER', 'ACCOUNTANT', 'CASHIER', 'INVENTORY_STAFF', 'WAITER', 'KITCHEN', 'CUSTOM'];
      const excludedNames = ['SUPER_ADMIN', 'SUPER ADMIN', 'TECHNICIAN', 'CAPTAIN'];
      return roles.filter((r) => {
        const typeMatch = allowedRoleTypes.includes(r.roleType);
        const notExcluded = !excludedNames.includes(r.name.toUpperCase()) && !excludedNames.includes(r.roleType.toUpperCase());
        return (typeMatch && notExcluded) || (r.organizationId === organizationId);
      });
    }

    if (businessType === 'SERVICE') {
      const allowedRoleTypes = ['OWNER', 'MANAGER', 'ACCOUNTANT', 'CASHIER', 'INVENTORY_STAFF', 'TECHNICIAN', 'CUSTOM'];
      const excludedNames = ['SUPER_ADMIN', 'SUPER ADMIN', 'WAITER', 'KITCHEN'];
      return roles.filter((r) => {
        const typeMatch = allowedRoleTypes.includes(r.roleType);
        const notExcluded = !excludedNames.includes(r.name.toUpperCase()) && !excludedNames.includes(r.roleType.toUpperCase());
        return (typeMatch && notExcluded) || (r.organizationId === organizationId);
      });
    }

    // For non-restaurant industries, exclude Restaurant-specific roles (WAITER, KITCHEN), Service (TECHNICIAN), and platform SUPER_ADMIN
    return roles.filter((r) => {
      const isRestaurantRole = r.roleType === 'WAITER' || r.roleType === 'KITCHEN' || r.name.toUpperCase() === 'WAITER' || r.name.toUpperCase() === 'KITCHEN';
      const isServiceRole = r.roleType === 'TECHNICIAN' || r.name.toUpperCase() === 'TECHNICIAN';
      const isSuperAdmin = r.roleType === 'SUPER_ADMIN' || r.name.toUpperCase() === 'SUPER ADMIN';
      return (!isRestaurantRole && !isServiceRole && !isSuperAdmin) || (r.organizationId === organizationId);
    });
  }

  async addMember(organizationId: string, userId: string, userName: string, data: {
    firstName: string;
    lastName?: string;
    email?: string;
    username: string;
    password: string;
    roleId?: string;
    roleName?: string;
    roleType?: string;
    branchId?: string;
  }) {
    const userEmail = data.email ? data.email.toLowerCase() : `${data.username.toLowerCase()}@aescion.local`;
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: userEmail, mode: 'insensitive' } },
          { username: { equals: data.username, mode: 'insensitive' } }
        ]
      }
    });

    if (existing) {
      throw new ConflictException('A user with this email or username already exists.');
    }

    let targetRoleId = data.roleId;
    const searchRole = data.roleType || data.roleName;
    if (!targetRoleId && searchRole) {
      const foundRole = await this.prisma.role.findFirst({
        where: {
          organizationId,
          OR: [
            { roleType: { equals: searchRole, mode: 'insensitive' } },
            { name: { equals: searchRole, mode: 'insensitive' } }
          ]
        }
      });
      if (foundRole) targetRoleId = foundRole.id;
    }

    if (!targetRoleId) {
      const defaultRole = await this.prisma.role.findFirst({
        where: {
          organizationId,
          roleType: 'CASHIER'
        }
      });
      targetRoleId = defaultRole?.id;
    }

    if (!targetRoleId) {
      // Fallback: create role for this org if none exists
      const newRole = await this.prisma.role.create({
        data: {
          organizationId,
          name: data.roleName || 'Cashier',
          roleType: 'CASHIER',
          permissions: ['pos:access', 'pos:create_bill', 'invoice:view', 'invoice:create', 'payment:collect', 'restaurant:tables', 'restaurant:kot'],
          isSystem: false
        }
      });
      targetRoleId = newRole.id;
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const createdMembership = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName || '',
          email: userEmail,
          username: data.username.toLowerCase(),
          passwordHash,
          isActive: true
        }
      });

      const membership = await tx.membership.create({
        data: {
          userId: newUser.id,
          organizationId,
          branchId: data.branchId || null,
          roleId: targetRoleId,
          isActive: true
        },
        include: { user: true, role: true, branch: true }
      });

      await this.auditService.log({
        organizationId,
        branchId: data.branchId,
        userId,
        userName,
        action: 'TEAM_MEMBER_ADDED',
        entityType: 'USER',
        entityId: newUser.id,
        details: { email: userEmail, roleId: targetRoleId }
      });

      return membership;
    });

    this.eventsGateway.emitTeamUpdated(organizationId, createdMembership);
    return createdMembership;
  }

  async updateMember(organizationId: string, memberId: string, userId: string, userName: string, data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    roleId?: string;
    branchId?: string;
    isActive?: boolean;
    password?: string;
  }) {
    const membership = await this.prisma.membership.findFirst({
      where: { id: memberId, organizationId },
      include: { user: true }
    });

    if (!membership) throw new NotFoundException('Team member not found');

    const updated = await this.prisma.$transaction(async (tx) => {
      if (data.firstName || data.lastName || data.email || data.password || data.isActive !== undefined) {
        const userData: any = {};
        if (data.firstName) userData.firstName = data.firstName;
        if (data.lastName) userData.lastName = data.lastName;
        if (data.email) userData.email = data.email.toLowerCase();
        if (data.isActive !== undefined) userData.isActive = data.isActive;
        if (data.password) userData.passwordHash = await bcrypt.hash(data.password, 10);

        await tx.user.update({
          where: { id: membership.userId },
          data: userData
        });
      }

      const updatedMembership = await tx.membership.update({
        where: { id: membership.id },
        data: {
          roleId: data.roleId || membership.roleId,
          branchId: data.branchId !== undefined ? (data.branchId || null) : membership.branchId,
          isActive: data.isActive !== undefined ? data.isActive : membership.isActive
        },
        include: { user: true, role: true, branch: true }
      });

      await this.auditService.log({
        organizationId,
        userId,
        userName,
        action: 'TEAM_MEMBER_UPDATED',
        entityType: 'USER',
        entityId: membership.userId,
        details: { roleId: data.roleId, branchId: data.branchId, isActive: data.isActive }
      });

      return updatedMembership;
    });

    this.eventsGateway.emitTeamUpdated(organizationId, updated);
    return updated;
  }

  async createCustomRole(organizationId: string, userId: string, userName: string, data: { name: string; permissions: string[] }) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { businessType: true }
    });
    if (!org) throw new NotFoundException('Organization not found');

    const validation = validateDomainPermissions(org.businessType, data.permissions || []);
    if (!validation.valid) {
      throw new BadRequestException(`Cannot assign permissions outside ${org.businessType} domain: ${validation.invalidPermissions.join(', ')}`);
    }

    const role = await this.prisma.role.create({
      data: {
        organizationId,
        name: data.name,
        roleType: RoleType.CUSTOM,
        permissions: data.permissions || [],
        isSystem: false
      }
    });

    await this.auditService.log({
      organizationId,
      userId,
      userName,
      action: 'CUSTOM_ROLE_CREATED',
      entityType: 'ROLE',
      entityId: role.id,
      details: { name: data.name, permissionsCount: data.permissions?.length }
    });

    return role;
  }

  async updateRole(organizationId: string, roleId: string, userId: string, userName: string, data: { name?: string; permissions: string[] }) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');

    if (role.roleType === RoleType.OWNER) {
      throw new ForbiddenException('The core Owner system role permissions cannot be altered.');
    }

    if (role.organizationId && role.organizationId !== organizationId) {
      throw new ForbiddenException('Cannot edit roles belonging to another organization.');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { businessType: true }
    });
    if (!org) throw new NotFoundException('Organization not found');

    const validation = validateDomainPermissions(org.businessType, data.permissions || []);
    if (!validation.valid) {
      throw new BadRequestException(`Cannot assign permissions outside ${org.businessType} domain: ${validation.invalidPermissions.join(', ')}`);
    }

    const updated = await this.prisma.role.update({
      where: { id: role.id },
      data: {
        name: data.name || role.name,
        permissions: data.permissions
      }
    });

    await this.auditService.log({
      organizationId,
      userId,
      userName,
      action: 'ROLE_UPDATED',
      entityType: 'ROLE',
      entityId: role.id,
      details: { name: updated.name, permissionsCount: data.permissions.length }
    });

    return updated;
  }
}
