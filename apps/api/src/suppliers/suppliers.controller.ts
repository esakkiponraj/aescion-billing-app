import { Controller, Get, Post, Put, Body, Param, UseGuards, Req } from '@nestjs/common';
import { SupplierService } from './suppliers.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthTokenPayload } from '@aescion/shared-types';
import { Permission } from '@aescion/capability-config';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class SupplierController {
  constructor(private supplierService: SupplierService) {}

  @Get()
  @RequirePermissions(Permission.SUPPLIER_VIEW)
  async getSuppliers(@CurrentUser() user: AuthTokenPayload) {
    return this.supplierService.getSuppliers(user.organizationId);
  }

  @Post()
  @RequirePermissions(Permission.SUPPLIER_CREATE)
  async createSupplier(@CurrentUser() user: AuthTokenPayload, @Body() body: any) {
    return this.supplierService.createSupplier(user.organizationId, user.userId, user.email, body);
  }

  @Get('purchase-orders')
  @RequirePermissions(Permission.PO_CREATE)
  async getPurchaseOrders(@CurrentUser() user: AuthTokenPayload, @Req() req: any) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId;
    return this.supplierService.getPurchaseOrders(user.organizationId, branchId);
  }

  @Post('purchase-orders')
  @RequirePermissions(Permission.PO_CREATE)
  async createPurchaseOrder(
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: any,
    @Body() body: any
  ) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId || '';
    return this.supplierService.createPurchaseOrder(user.organizationId, branchId, user.userId, user.email, body);
  }

  @Put('purchase-orders/:id/grn')
  @RequirePermissions(Permission.GRN_CREATE)
  async receiveGoods(
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: any,
    @Param('id') id: string,
    @Body('items') items: any[]
  ) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId || '';
    return this.supplierService.receiveGoods(user.organizationId, id, branchId, user.userId, user.email, items);
  }
}
