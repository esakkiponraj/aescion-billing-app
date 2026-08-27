import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { QuotationService } from './quotations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthTokenPayload } from '@aescion/shared-types';
import { Permission } from '@aescion/capability-config';

@Controller('quotations')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class QuotationController {
  constructor(private quotationService: QuotationService) {}

  @Get()
  @RequirePermissions(Permission.QUOTATION_VIEW)
  async findAll(@CurrentUser() user: AuthTokenPayload, @Req() req: any, @Query('status') status?: string) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId;
    return this.quotationService.findAll(user.organizationId, branchId, status);
  }

  @Get(':id')
  @RequirePermissions(Permission.QUOTATION_VIEW)
  async findOne(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.quotationService.findOne(user.organizationId, id);
  }

  @Post()
  @RequirePermissions(Permission.QUOTATION_CREATE)
  async create(
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: any,
    @Body() body: any
  ) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId || '';
    return this.quotationService.create(user.organizationId, branchId, user.userId, user.email, body);
  }

  @Put(':id')
  @RequirePermissions(Permission.QUOTATION_CREATE)
  async update(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body() body: any
  ) {
    return this.quotationService.update(user.organizationId, id, user.userId, user.email, body);
  }

  @Put(':id/status')
  @RequirePermissions(Permission.QUOTATION_CREATE)
  async updateStatus(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body('status') status: string
  ) {
    return this.quotationService.updateStatus(user.organizationId, id, user.userId, user.email, status);
  }

  @Post(':id/convert')
  @RequirePermissions(Permission.QUOTATION_CONVERT)
  async convert(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string
  ) {
    return this.quotationService.convertToInvoice(user.organizationId, id, user.userId, user.email);
  }
}
