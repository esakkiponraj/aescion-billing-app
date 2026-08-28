import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { WholesaleService } from './wholesale.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { IndustryGuard } from '../common/guards/industry.guard';
import { RequireIndustry } from '../common/decorators/require-industry.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthTokenPayload, BusinessType } from '@aescion/shared-types';

@Controller('wholesale')
@UseGuards(JwtAuthGuard, TenantGuard, IndustryGuard)
@RequireIndustry(BusinessType.WHOLESALE)
export class WholesaleController {
  constructor(private wholesaleService: WholesaleService) {}

  @Get('orders')
  async getSalesOrdersAlias(@CurrentUser() user: AuthTokenPayload, @Req() req: any, @Query('status') status?: string) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId;
    return this.wholesaleService.getSalesOrders(user.organizationId, branchId, status);
  }

  @Get('sales-orders')
  async getSalesOrders(@CurrentUser() user: AuthTokenPayload, @Req() req: any, @Query('status') status?: string) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId;
    return this.wholesaleService.getSalesOrders(user.organizationId, branchId, status);
  }

  @Get('sales-orders/:id')
  async getSalesOrderById(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.wholesaleService.getSalesOrderById(user.organizationId, id);
  }

  @Post('orders')
  async createSalesOrderAlias(@CurrentUser() user: AuthTokenPayload, @Req() req: any, @Body() body: any) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId || '';
    return this.wholesaleService.createSalesOrder(user.organizationId, branchId, user.userId, user.email, body);
  }

  @Post('sales-orders')
  async createSalesOrder(@CurrentUser() user: AuthTokenPayload, @Req() req: any, @Body() body: any) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId || '';
    return this.wholesaleService.createSalesOrder(user.organizationId, branchId, user.userId, user.email, body);
  }

  @Put('orders/:id/dispatch')
  async dispatchOrderPut(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string, @Body() body: any) {
    return this.wholesaleService.dispatchOrder(user.organizationId, id, user.userId, user.email, body);
  }

  @Post('orders/:id/dispatch')
  async dispatchOrderPost(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string, @Body() body: any) {
    return this.wholesaleService.dispatchOrder(user.organizationId, id, user.userId, user.email, body);
  }

  @Post('sales-orders/:id/dispatch')
  async dispatchSalesOrderPost(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string, @Body() body: any) {
    return this.wholesaleService.dispatchOrder(user.organizationId, id, user.userId, user.email, body);
  }

  @Post('sales-orders/:id/challan')
  async issueChallanPost(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string, @Body() body: any) {
    return this.wholesaleService.dispatchOrder(user.organizationId, id, user.userId, user.email, {
      vehicleNo: body.vehicleNumber || body.vehicleNo || 'TN-01-AB-1234',
      transporterName: body.transporterName || 'Express Logistics',
      driverName: body.driverName || 'Lead Driver',
      notes: body.notes,
      items: body.items
    });
  }

  @Post('sales-orders/:id/convert-to-invoice')
  async convertOrderToInvoice(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.wholesaleService.convertOrderToInvoice(user.organizationId, id, user.userId, user.email);
  }
}
