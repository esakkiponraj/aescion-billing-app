import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../common/prisma.service';
import { LoginInput } from '@aescion/validation';
import { AuthTokenPayload, BusinessType, LoginResponse, RoleType } from '@aescion/shared-types';
import { INDUSTRY_DEFAULT_CAPABILITIES } from '@aescion/capability-config';
import { AuditService } from '../common/services/audit.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private auditService: AuditService
  ) {}

  async login(dto: LoginInput): Promise<LoginResponse> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: dto.identifier, mode: 'insensitive' } },
          { username: { equals: dto.identifier, mode: 'insensitive' } }
        ]
      },
      include: {
        memberships: {
          where: { isActive: true },
          include: {
            organization: true,
            branch: true,
            role: true
          }
        }
      }
    });

    if (!user) {
      throw new UnauthorizedException('Invalid identifier or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('This user account has been deactivated');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid identifier or password');
    }

    if (!user.memberships || user.memberships.length === 0) {
      throw new UnauthorizedException('No active organization memberships found for this user');
    }

    // Default to the first active membership
    const activeMembership = user.memberships[0];
    const organization = activeMembership.organization;
    const branch = activeMembership.branch || (await this.prisma.branch.findFirst({ where: { organizationId: organization.id, isMain: true } }))!;
    const role = activeMembership.role;

    const allBranches = await this.prisma.branch.findMany({
      where: { organizationId: organization.id, isActive: true }
    });

    const capabilities = INDUSTRY_DEFAULT_CAPABILITIES[organization.businessType as BusinessType] || [];

    const tokenPayload: AuthTokenPayload = {
      userId: user.id,
      email: user.email,
      organizationId: organization.id,
      branchId: branch?.id,
      roleId: role.id,
      roleType: role.roleType as RoleType,
      permissions: role.permissions
    };

    const accessToken = this.jwtService.sign(tokenPayload, {
      secret: process.env.JWT_SECRET || 'aescion_super_secure_enterprise_jwt_secret_key_2026_production',
      expiresIn: process.env.JWT_EXPIRATION || '1d'
    });

    const refreshToken = this.jwtService.sign(tokenPayload, {
      secret: process.env.JWT_REFRESH_SECRET || 'aescion_refresh_token_super_secret_key_2026_production',
      expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d'
    });

    await this.auditService.log({
      organizationId: organization.id,
      branchId: branch?.id,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      action: 'AUTH_LOGIN',
      entityType: 'USER',
      entityId: user.id
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        mobileNumber: user.mobileNumber || undefined,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      organization: {
        id: organization.id,
        name: organization.name,
        legalName: organization.legalName || undefined,
        businessType: organization.businessType as BusinessType,
        logoUrl: organization.logoUrl || undefined,
        phone: organization.phone || undefined,
        email: organization.email || undefined,
        address: organization.address || undefined,
        city: organization.city || undefined,
        state: organization.state || undefined,
        pinCode: organization.pinCode || undefined,
        country: organization.country,
        currency: organization.currency,
        timezone: organization.timezone,
        gstStatus: organization.gstStatus,
        gstin: organization.gstin || undefined,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt
      },
      branches: allBranches.map((b) => ({
        id: b.id,
        organizationId: b.organizationId,
        name: b.name,
        code: b.code,
        address: b.address || undefined,
        city: b.city || undefined,
        state: b.state || undefined,
        phone: b.phone || undefined,
        isMain: b.isMain,
        isActive: b.isActive,
        createdAt: b.createdAt
      })),
      activeBranch: {
        id: branch.id,
        organizationId: branch.organizationId,
        name: branch.name,
        code: branch.code,
        address: branch.address || undefined,
        city: branch.city || undefined,
        state: branch.state || undefined,
        phone: branch.phone || undefined,
        isMain: branch.isMain,
        isActive: branch.isActive,
        createdAt: branch.createdAt
      },
      activeRole: {
        id: role.id,
        organizationId: role.organizationId || undefined,
        name: role.name,
        roleType: role.roleType as RoleType,
        permissions: role.permissions,
        isSystem: role.isSystem
      },
      permissions: role.permissions,
      capabilities
    };
  }

  async getMe(userId: string, organizationId: string, branchId?: string): Promise<LoginResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { organizationId, isActive: true },
          include: {
            organization: true,
            branch: true,
            role: true
          }
        }
      }
    });

    if (!user || user.memberships.length === 0) {
      throw new UnauthorizedException('User session not found');
    }

    const membership = user.memberships[0];
    const organization = membership.organization;
    const targetBranchId = branchId || membership.branchId || undefined;

    let branch = targetBranchId
      ? await this.prisma.branch.findFirst({
          where: { id: targetBranchId, organizationId }
        })
      : null;

    if (!branch) {
      branch = (await this.prisma.branch.findFirst({ where: { organizationId, isMain: true } }))!;
    }

    const allBranches = await this.prisma.branch.findMany({
      where: { organizationId, isActive: true }
    });

    const role = membership.role;
    const capabilities = INDUSTRY_DEFAULT_CAPABILITIES[organization.businessType as BusinessType] || [];

    const tokenPayload: AuthTokenPayload = {
      userId: user.id,
      email: user.email,
      organizationId: organization.id,
      branchId: branch?.id,
      roleId: role.id,
      roleType: role.roleType as RoleType,
      permissions: role.permissions
    };

    const accessToken = this.jwtService.sign(tokenPayload, {
      secret: process.env.JWT_SECRET || 'aescion_super_secure_enterprise_jwt_secret_key_2026_production',
      expiresIn: process.env.JWT_EXPIRATION || '1d'
    });

    const refreshToken = this.jwtService.sign(tokenPayload, {
      secret: process.env.JWT_REFRESH_SECRET || 'aescion_refresh_token_super_secret_key_2026_production',
      expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d'
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        mobileNumber: user.mobileNumber || undefined,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      organization: {
        id: organization.id,
        name: organization.name,
        legalName: organization.legalName || undefined,
        businessType: organization.businessType as BusinessType,
        logoUrl: organization.logoUrl || undefined,
        phone: organization.phone || undefined,
        email: organization.email || undefined,
        address: organization.address || undefined,
        city: organization.city || undefined,
        state: organization.state || undefined,
        pinCode: organization.pinCode || undefined,
        country: organization.country,
        currency: organization.currency,
        timezone: organization.timezone,
        gstStatus: organization.gstStatus,
        gstin: organization.gstin || undefined,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt
      },
      branches: allBranches.map((b) => ({
        id: b.id,
        organizationId: b.organizationId,
        name: b.name,
        code: b.code,
        address: b.address || undefined,
        city: b.city || undefined,
        state: b.state || undefined,
        phone: b.phone || undefined,
        isMain: b.isMain,
        isActive: b.isActive,
        createdAt: b.createdAt
      })),
      activeBranch: {
        id: branch.id,
        organizationId: branch.organizationId,
        name: branch.name,
        code: branch.code,
        address: branch.address || undefined,
        city: branch.city || undefined,
        state: branch.state || undefined,
        phone: branch.phone || undefined,
        isMain: branch.isMain,
        isActive: branch.isActive,
        createdAt: branch.createdAt
      },
      activeRole: {
        id: role.id,
        organizationId: role.organizationId || undefined,
        name: role.name,
        roleType: role.roleType as RoleType,
        permissions: role.permissions,
        isSystem: role.isSystem
      },
      permissions: role.permissions,
      capabilities
    };
  }
}
