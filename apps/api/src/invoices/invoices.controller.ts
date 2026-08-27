import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { InvoiceService } from './invoices.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthTokenPayload } from '@aescion/shared-types';
import { Permission } from '@aescion/capability-config';
import { CreateInvoiceSchema } from '@aescion/validation';

@Controller('invoices')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class InvoiceController {
  constructor(private invoiceService: InvoiceService) {}

  @Get()
  @RequirePermissions(Permission.INVOICE_VIEW)
  async findAll(
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: any,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId;
    return this.invoiceService.findAll(user.organizationId, branchId, status, dateFrom, dateTo);
  }

  @Get(':id')
  @RequirePermissions(Permission.INVOICE_VIEW)
  async findOne(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.invoiceService.findOne(user.organizationId, id);
  }

  @Post()
  @RequirePermissions(Permission.INVOICE_CREATE)
  async create(
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: any,
    @Body() body: any
  ) {
    const validated = CreateInvoiceSchema.parse(body);
    const branchId = validated.branchId || (req.headers['x-branch-id'] as string) || user.branchId || '';
    return this.invoiceService.create(user.organizationId, branchId, user.userId, `${user.email}`, validated);
  }

  @Put(':id/void')
  @RequirePermissions(Permission.INVOICE_CANCEL)
  async voidInvoice(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body('reason') reason: string
  ) {
    return this.invoiceService.voidInvoice(user.organizationId, id, user.userId, user.email, reason || 'Customer request');
  }
}
