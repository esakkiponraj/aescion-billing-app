import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { RestaurantService } from './restaurant.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthTokenPayload, KitchenStatus } from '@aescion/shared-types';
import { Permission } from '@aescion/capability-config';

@Controller('restaurant')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class RestaurantController {
  constructor(private restaurantService: RestaurantService) {}

  @Get('tables')
  @RequirePermissions(Permission.RESTAURANT_TABLES)
  async getTables(@CurrentUser() user: AuthTokenPayload, @Req() req: any) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId;
    return this.restaurantService.getTables(user.organizationId, branchId);
  }

  @Get('kots')
  @RequirePermissions(Permission.RESTAURANT_KOT)
  async getKOTs(@CurrentUser() user: AuthTokenPayload, @Req() req: any, @Query('status') status?: string) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId;
    return this.restaurantService.getKOTs(user.organizationId, branchId, status);
  }

  @Post('kots')
  @RequirePermissions(Permission.RESTAURANT_KOT)
  async sendKOT(@CurrentUser() user: AuthTokenPayload, @Req() req: any, @Body() body: any) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId || '';
    return this.restaurantService.sendKOT(user.organizationId, branchId, user.userId, user.email, body);
  }

  @Put('kots/:id/status')
  @RequirePermissions(Permission.RESTAURANT_KITCHEN)
  async updateKOTStatus(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body('status') status: KitchenStatus
  ) {
    return this.restaurantService.updateKOTStatus(user.organizationId, id, status);
  }

  @Post('tables/:id/close')
  @RequirePermissions(Permission.RESTAURANT_TABLES)
  async closeTable(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.restaurantService.closeTable(user.organizationId, id);
  }
}
