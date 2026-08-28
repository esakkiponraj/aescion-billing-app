import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AuthTokenPayload } from '@aescion/shared-types';
import { PrismaService } from '../prisma.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthTokenPayload;

    if (!user || !user.organizationId) {
      throw new ForbiddenException('Invalid tenant context. Access denied.');
    }

    // Attach verified organizationId from token
    request.organizationId = user.organizationId;

    // Fetch authoritative organization to ensure industry pack context
    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { id: true, name: true, businessType: true }
    });

    if (!org) {
      throw new ForbiddenException('Organization not found.');
    }

    request.organization = org;
    request.businessType = org.businessType;

    const requestedBranchId = request.headers['x-branch-id'] as string;
    if (requestedBranchId) {
      // Validate that requested branchId strictly belongs to the authenticated organization
      const validBranch = await this.prisma.branch.findFirst({
        where: {
          id: requestedBranchId,
          organizationId: user.organizationId
        }
      });

      if (!validBranch) {
        throw new ForbiddenException('Branch does not belong to your organization or does not exist.');
      }
      request.branchId = validBranch.id;
    } else {
      request.branchId = user.branchId;
    }

    return true;
  }
}
