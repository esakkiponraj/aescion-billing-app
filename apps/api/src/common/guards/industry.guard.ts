import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BusinessType } from '@aescion/shared-types';
import { REQUIRE_INDUSTRY_KEY } from '../decorators/require-industry.decorator';

@Injectable()
export class IndustryGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredIndustries = this.reflector.getAllAndOverride<BusinessType[]>(REQUIRE_INDUSTRY_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    // If no industry restriction is declared, this is a common module
    if (!requiredIndustries || requiredIndustries.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Platform Super Admin has administrative overview access
    if (user?.roleType === 'SUPER_ADMIN') {
      return true;
    }

    const tenantIndustry = (request.businessType || request.organization?.businessType) as BusinessType;
    if (!tenantIndustry) {
      throw new ForbiddenException('Tenant industry context could not be determined.');
    }

    const isEntitled = requiredIndustries.includes(tenantIndustry);
    if (!isEntitled) {
      throw new ForbiddenException(
        `Module not entitled for '${tenantIndustry}' industry pack. This feature is restricted to: ${requiredIndustries.join(', ')}.`
      );
    }

    return true;
  }
}
