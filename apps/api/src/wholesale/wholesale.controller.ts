import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { WholesaleService } from './wholesale.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthTokenPayload } from '@aescion/shared-types';

@Controller('wholesale')
@UseGuards(JwtAuthGuard, TenantGuard)
export class WholesaleController {
  constructor(private wholesaleService: WholesaleService) {}

  @Get('orders')
  async getSalesOrders(@CurrentUser() user: AuthTokenPayload, @Req() req: any, @Query('status') status?: string) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId;
    return this.wholesaleService.getSalesOrders(user.organizationId, branchId, status);
  }

  @Post('orders')
  async createSalesOrder(@CurrentUser() user: AuthTokenPayload, @Req() req: any, @Body() body: any) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId || '';
    return this.wholesaleService.createSalesOrder(user.organizationId, branchId, user.userId, user.email, body);
  }

  @Put('orders/:id/dispatch')
  async dispatchOrder(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string, @Body() body: any) {
    return this.wholesaleService.dispatchOrder(user.organizationId, id, user.userId, user.email, body);
  }
}
