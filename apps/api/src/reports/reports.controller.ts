import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthTokenPayload } from '@aescion/shared-types';
import { Permission } from '@aescion/capability-config';

@Controller('reports')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('dashboard-pulse')
  @RequirePermissions(Permission.REPORT_SALES)
  async getDashboardPulse(
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: any,
    @Query('period') period?: 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM',
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string
  ) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId;
    return this.reportsService.getDashboardPulse(user.organizationId, branchId, period, fromDate, toDate);
  }

  @Get('summary')
  @RequirePermissions(Permission.REPORT_SALES)
  async getReportsSummary(
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: any
  ) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId;
    return this.reportsService.getReportsSummary(user.organizationId, branchId);
  }
}
