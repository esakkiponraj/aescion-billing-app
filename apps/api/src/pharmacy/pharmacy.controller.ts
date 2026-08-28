import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { PharmacyService } from './pharmacy.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { IndustryGuard } from '../common/guards/industry.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { RequireIndustry } from '../common/decorators/require-industry.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthTokenPayload, BusinessType } from '@aescion/shared-types';
import { Permission } from '@aescion/capability-config';

@Controller('pharmacy')
@UseGuards(JwtAuthGuard, TenantGuard, IndustryGuard, PermissionsGuard)
@RequireIndustry(BusinessType.PHARMACY)
export class PharmacyController {
  constructor(private pharmacyService: PharmacyService) {}

  @Get('medicines')
  @RequirePermissions(Permission.PRODUCT_VIEW)
  async getMedicines(@CurrentUser() user: AuthTokenPayload, @Query('search') search?: string) {
    return this.pharmacyService.getMedicines(user.organizationId, search);
  }

  @Get('batches')
  @RequirePermissions(Permission.STOCK_VIEW)
  async getBatches(@CurrentUser() user: AuthTokenPayload, @Req() req: any) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId;
    return this.pharmacyService.getBatches(user.organizationId, branchId);
  }

  @Get('expiry-alerts')
  @RequirePermissions(Permission.STOCK_VIEW)
  async getExpiryAlerts(@CurrentUser() user: AuthTokenPayload, @Req() req: any) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId;
    return this.pharmacyService.getExpiryAlerts(user.organizationId, branchId);
  }

  @Post('medicines')
  @RequirePermissions(Permission.PRODUCT_CREATE)
  async createMedicine(
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: any,
    @Body() body: any
  ) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId || '';
    return this.pharmacyService.createMedicine(user.organizationId, branchId, user.userId, user.email, body);
  }
}
