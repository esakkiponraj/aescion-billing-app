import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { SupermarketService } from './supermarket.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { IndustryGuard } from '../common/guards/industry.guard';
import { RequireIndustry } from '../common/decorators/require-industry.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthTokenPayload, BusinessType } from '@aescion/shared-types';

@Controller('supermarket')
@UseGuards(JwtAuthGuard, TenantGuard, IndustryGuard)
@RequireIndustry(BusinessType.SUPERMARKET)
export class SupermarketController {
  constructor(private supermarketService: SupermarketService) {}

  @Get('weighing-item/:code')
  async getWeighingItem(@CurrentUser() user: AuthTokenPayload, @Param('code') code: string) {
    return this.supermarketService.getWeightScaleProduct(user.organizationId, code);
  }

  @Get('registers-status')
  async getRegistersStatus(@CurrentUser() user: AuthTokenPayload, @Req() req: any) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId;
    return this.supermarketService.getRegistersStatus(user.organizationId, branchId);
  }
}
