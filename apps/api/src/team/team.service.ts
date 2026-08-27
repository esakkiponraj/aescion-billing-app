import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../common/prisma.service';
import { RoleType } from '@aescion/shared-types';
import { AuditService } from '../common/services/audit.service';

@Injectable()
export class TeamService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService
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
    return this.prisma.role.findMany({
      where: {
        OR: [{ organizationId }, { organizationId: null, isSystem: true }]
      },
      orderBy: { name: 'asc' }
    });
  }

  async addMember(organizationId: string, userId: string, userName: string, data: {
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    password: string;
    roleId: string;
    branchId?: string;
  }) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: data.email, mode: 'insensitive' } },
          { username: { equals: data.username, mode: 'insensitive' } }
        ]
      }
    });

    if (existing) {
      throw new ConflictException('A user with this email or username already exists.');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    return this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email.toLowerCase(),
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
          roleId: data.roleId,
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
        details: { email: data.email, roleId: data.roleId }
      });

      return membership;
    });
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

    return this.prisma.$transaction(async (tx) => {
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
  }

  async createCustomRole(organizationId: string, userId: string, userName: string, data: { name: string; permissions: string[] }) {
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

    if (role.isSystem && role.roleType === RoleType.OWNER) {
      throw new ForbiddenException('The core Owner system role permissions cannot be altered.');
    }

    if (!role.isSystem && role.organizationId !== organizationId) {
      throw new ForbiddenException('Cannot edit roles belonging to another organization.');
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
