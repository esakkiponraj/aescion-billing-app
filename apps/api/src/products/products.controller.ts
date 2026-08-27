import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ProductService } from './products.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthTokenPayload } from '@aescion/shared-types';
import { Permission } from '@aescion/capability-config';
import { CreateProductSchema } from '@aescion/validation';

@Controller('products')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class ProductController {
  constructor(private productService: ProductService) {}

  @Get()
  @RequirePermissions(Permission.PRODUCT_VIEW)
  async findAll(
    @CurrentUser() user: AuthTokenPayload,
    @Query('search') search?: string,
    @Query('category') category?: string
  ) {
    return this.productService.findAll(user.organizationId, search, category);
  }

  @Get('lookup')
  @RequirePermissions(Permission.PRODUCT_VIEW)
  async lookup(
    @CurrentUser() user: AuthTokenPayload,
    @Query('q') q: string
  ) {
    return this.productService.findByBarcodeOrSku(user.organizationId, q);
  }

  @Get('stock/ledger')
  @RequirePermissions(Permission.STOCK_VIEW)
  async getStockLedger(
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: any,
    @Query('productId') productId?: string
  ) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId;
    return this.productService.getStockLedger(user.organizationId, branchId, productId);
  }

  @Get(':id')
  @RequirePermissions(Permission.PRODUCT_VIEW)
  async findOne(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.productService.findOne(user.organizationId, id);
  }

  @Post()
  @RequirePermissions(Permission.PRODUCT_CREATE)
  async create(
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: any,
    @Body() body: any
  ) {
    const validated = CreateProductSchema.parse(body);
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId || '';
    return this.productService.create(user.organizationId, branchId, user.userId, user.email, validated);
  }

  @Put(':id')
  @RequirePermissions(Permission.PRODUCT_UPDATE)
  async update(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body() body: any
  ) {
    return this.productService.update(user.organizationId, id, user.userId, user.email, body);
  }
}
