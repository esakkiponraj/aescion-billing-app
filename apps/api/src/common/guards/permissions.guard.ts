import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleType } from '@aescion/shared-types';
import { Permission } from '@aescion/capability-config';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User is not authenticated');
    }

    // OWNER and SUPER_ADMIN have full bypass
    if (user.roleType === RoleType.OWNER || user.roleType === RoleType.SUPER_ADMIN) {
      return true;
    }

    const userPermissions: string[] = user.permissions || [];
    const hasPermission = requiredPermissions.some((perm) => userPermissions.includes(perm));

    if (!hasPermission) {
      throw new ForbiddenException(`Missing required permissions: ${requiredPermissions.join(', ')}`);
    }

    return true;
  }
}
