import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ServiceJobService } from './service.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { IndustryGuard } from '../common/guards/industry.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { RequireIndustry } from '../common/decorators/require-industry.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthTokenPayload, BusinessType, ServiceJobStatus } from '@aescion/shared-types';
import { Permission } from '@aescion/capability-config';

@Controller('service-jobs')
@UseGuards(JwtAuthGuard, TenantGuard, IndustryGuard, PermissionsGuard)
@RequireIndustry(BusinessType.SERVICE)
export class ServiceJobController {
  constructor(private serviceJobService: ServiceJobService) {}

  @Get()
  @RequirePermissions(Permission.SERVICE_JOB_UPDATE)
  async findAll(@CurrentUser() user: AuthTokenPayload, @Req() req: any, @Query('status') status?: string) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId;
    return this.serviceJobService.findAll(user.organizationId, branchId, status);
  }

  @Get(':id')
  @RequirePermissions(Permission.SERVICE_JOB_UPDATE)
  async findOne(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.serviceJobService.findOne(user.organizationId, id);
  }

  @Post()
  @RequirePermissions(Permission.SERVICE_JOB_CREATE)
  async create(
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: any,
    @Body() body: any
  ) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId || '';
    return this.serviceJobService.create(user.organizationId, branchId, user.userId, user.email, body);
  }

  @Put(':id/status')
  @RequirePermissions(Permission.SERVICE_JOB_UPDATE)
  async updateStatus(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body('status') status: ServiceJobStatus,
    @Body('notes') notes?: string
  ) {
    return this.serviceJobService.updateStatus(user.organizationId, id, user.userId, user.email, status, notes);
  }

  @Put(':id/parts')
  @RequirePermissions(Permission.SERVICE_JOB_UPDATE)
  async updatePartsAndLabour(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body() body: any
  ) {
    return this.serviceJobService.updatePartsAndLabour(user.organizationId, id, user.userId, user.email, body);
  }
}
