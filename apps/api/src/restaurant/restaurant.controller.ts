import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { RestaurantService } from './restaurant.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { IndustryGuard } from '../common/guards/industry.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { RequireIndustry } from '../common/decorators/require-industry.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthTokenPayload, BusinessType, KitchenStatus, PaymentMethod } from '@aescion/shared-types';
import { Permission } from '@aescion/capability-config';

@Controller('restaurant')
@UseGuards(JwtAuthGuard, TenantGuard, IndustryGuard, PermissionsGuard)
@RequireIndustry(BusinessType.RESTAURANT)
export class RestaurantController {
  constructor(private restaurantService: RestaurantService) {}

  // ==========================================
  // TABLES
  // ==========================================

  @Get('tables')
  @RequirePermissions(Permission.RESTAURANT_TABLES)
  async getTables(
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: any,
    @Query('section') section?: string
  ) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId;
    return this.restaurantService.getTables(user.organizationId, branchId, section);
  }

  @Post('tables')
  @RequirePermissions(Permission.RESTAURANT_TABLES)
  async createTable(
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: any,
    @Body() body: { tableNumber: string; capacity?: number; section?: string }
  ) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId || '';
    return this.restaurantService.createTable(user.organizationId, branchId, user.userId, body);
  }

  @Put('tables/:id')
  @RequirePermissions(Permission.RESTAURANT_TABLES)
  async updateTable(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body() body: { tableNumber?: string; capacity?: number; section?: string; isActive?: boolean }
  ) {
    return this.restaurantService.updateTable(user.organizationId, id, user.userId, body);
  }

  @Delete('tables/:id')
  @RequirePermissions(Permission.RESTAURANT_TABLES)
  async deleteTable(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.restaurantService.deleteTable(user.organizationId, id, user.userId);
  }

  @Post('tables/:id/occupy')
  @RequirePermissions(Permission.RESTAURANT_TABLES)
  async occupyTable(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body('guestCount') guestCount?: number
  ) {
    return this.restaurantService.occupyTable(user.organizationId, id, guestCount, user.email);
  }

  @Post('tables/transfer')
  @RequirePermissions(Permission.RESTAURANT_TABLES)
  async transferTable(
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: any,
    @Body() body: { fromTableId: string; toTableId: string }
  ) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId || '';
    return this.restaurantService.transferTable(user.organizationId, branchId, user.userId, body.fromTableId, body.toTableId);
  }

  @Post('tables/:id/close')
  @RequirePermissions(Permission.RESTAURANT_TABLES)
  async closeTable(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.restaurantService.closeTable(user.organizationId, id);
  }

  // ==========================================
  // TABLE BILLING & SETTLEMENT
  // ==========================================

  @Get('tables/:id/bill-summary')
  @RequirePermissions(Permission.RESTAURANT_TABLES)
  async getTableBillSummary(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.restaurantService.getTableBillSummary(user.organizationId, id);
  }

  @Post('tables/:id/settle')
  @RequirePermissions(Permission.POS_CREATE_BILL)
  async settleTable(
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: {
      paymentMethod: PaymentMethod;
      amountPaid?: number;
      customerId?: string;
      discountAmount?: number;
      notes?: string;
    }
  ) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId || '';
    return this.restaurantService.settleTable(user.organizationId, branchId, user.userId, id, body);
  }

  // ==========================================
  // KOT OPERATIONS
  // ==========================================

  @Get('kots')
  @RequirePermissions(Permission.RESTAURANT_KOT)
  async getKOTs(
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: any,
    @Query('status') status?: string
  ) {
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
  @RequirePermissions(Permission.RESTAURANT_KITCHEN, Permission.RESTAURANT_KOT)
  async updateKOTStatus(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body('status') status: KitchenStatus
  ) {
    return this.restaurantService.updateKOTStatus(user.organizationId, id, status);
  }

  @Post('kots/:id/cancel')
  @RequirePermissions(Permission.RESTAURANT_KOT)
  async cancelKOT(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body('reason') reason?: string
  ) {
    return this.restaurantService.cancelKOT(user.organizationId, id, user.userId, reason);
  }

  // ==========================================
  // RESERVATIONS
  // ==========================================

  @Get('reservations')
  @RequirePermissions(Permission.RESTAURANT_TABLES)
  async getReservations(
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: any,
    @Query('date') date?: string,
    @Query('status') status?: string
  ) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId;
    return this.restaurantService.getReservations(user.organizationId, branchId, date, status);
  }

  @Post('reservations')
  @RequirePermissions(Permission.RESTAURANT_TABLES)
  async createReservation(
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: any,
    @Body() body: any
  ) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId || '';
    return this.restaurantService.createReservation(user.organizationId, branchId, user.userId, body);
  }

  @Put('reservations/:id/status')
  @RequirePermissions(Permission.RESTAURANT_TABLES)
  async updateReservationStatus(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body('status') status: string
  ) {
    return this.restaurantService.updateReservationStatus(user.organizationId, id, status);
  }
}
