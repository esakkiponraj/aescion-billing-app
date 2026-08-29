import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthTokenPayload, RoleType } from '@aescion/shared-types';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'aescion_super_secure_enterprise_jwt_secret_key_2026_production'
    });
  }

  async validate(payload: AuthTokenPayload): Promise<AuthTokenPayload> {
    if (!payload || !payload.userId) {
      throw new UnauthorizedException('Token payload is invalid');
    }

    // Super Admin platform check
    if (payload.roleType === RoleType.SUPER_ADMIN) {
      const user = await this.prisma.user.findUnique({ where: { id: payload.userId } });
      if (!user || !user.isActive) {
        throw new UnauthorizedException('Super Admin account is inactive or not found');
      }
      return payload;
    }

    if (!payload.organizationId) {
      throw new UnauthorizedException('Token payload missing organization identifier');
    }

    // Authoritatively check active User and Membership in PostgreSQL
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId: payload.userId,
        organizationId: payload.organizationId,
        isActive: true
      },
      include: {
        user: true,
        role: true,
        branch: true
      }
    });

    if (!membership || !membership.user.isActive) {
      throw new UnauthorizedException('This user account or membership has been deactivated');
    }

    // Return authoritative role and permissions directly from PostgreSQL
    return {
      userId: membership.userId,
      email: membership.user.email,
      organizationId: membership.organizationId,
      branchId: membership.branchId || payload.branchId,
      roleId: membership.role.id,
      roleType: membership.role.roleType as RoleType,
      permissions: membership.role.permissions
    };
  }
}

