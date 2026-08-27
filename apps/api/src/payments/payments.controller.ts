import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { PaymentService } from './payments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthTokenPayload } from '@aescion/shared-types';
import { Permission } from '@aescion/capability-config';

@Controller('payments')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Get()
  @RequirePermissions(Permission.INVOICE_VIEW)
  async findPayments(@CurrentUser() user: AuthTokenPayload, @Req() req: any) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId;
    return this.paymentService.findPayments(user.organizationId, branchId);
  }

  @Get('receipts')
  @RequirePermissions(Permission.INVOICE_VIEW)
  async findReceipts(@CurrentUser() user: AuthTokenPayload, @Req() req: any) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId;
    return this.paymentService.findReceipts(user.organizationId, branchId);
  }

  @Get('receipts/:id/reprint')
  @RequirePermissions(Permission.RECEIPT_REPRINT)
  async getReceiptForReprint(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.paymentService.getReceiptForReprint(user.organizationId, id);
  }

  @Post('collect')
  @RequirePermissions(Permission.PAYMENT_COLLECT)
  async collectPayment(
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: any,
    @Body() body: any
  ) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId || '';
    return this.paymentService.collectPayment(user.organizationId, branchId, user.userId, user.email, body);
  }
}
