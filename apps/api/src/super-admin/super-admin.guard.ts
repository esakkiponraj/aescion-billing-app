import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RoleType, AuthTokenPayload } from '@aescion/shared-types';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthTokenPayload;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (user.roleType !== RoleType.SUPER_ADMIN && user.roleType !== ('SUPER_ADMIN' as any)) {
      throw new ForbiddenException('Access denied. Super Admin platform privileges required.');
    }

    return true;
  }
}
