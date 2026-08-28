import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Req
} from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from './super-admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthTokenPayload } from '@aescion/shared-types';

@Controller('super-admin')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class SuperAdminController {
  constructor(private superAdminService: SuperAdminService) {}

  @Get('stats')
  async getStats() {
    return this.superAdminService.getPlatformStats();
  }

  @Get('presence')
  async getPresence() {
    return this.superAdminService.getPresenceSummary();
  }

  @Get('companies/:id/presence')
  async getCompanyPresence(@Param('id') id: string) {
    return this.superAdminService.getCompanyPresence(id);
  }

  @Get('companies')
  async getCompanies(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('businessType') businessType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.superAdminService.getCompanies({
      search,
      status,
      businessType,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20
    });
  }

  @Get('companies/:id')
  async getCompanyById(@Param('id') id: string) {
    return this.superAdminService.getCompanyById(id);
  }

  @Get('companies/:id/overview')
  async getCompanyOverview(@Param('id') id: string) {
    return this.superAdminService.getCompanyOverview(id);
  }

  @Get('companies/:id/branches')
  async getCompanyBranches(@Param('id') id: string) {
    return this.superAdminService.getCompanyBranches(id);
  }

  @Get('companies/:id/users')
  async getCompanyUsers(@Param('id') id: string) {
    return this.superAdminService.getCompanyUsers(id);
  }

  @Get('companies/:id/products')
  async getCompanyProducts(@Param('id') id: string) {
    return this.superAdminService.getCompanyProducts(id);
  }

  @Get('companies/:id/customers')
  async getCompanyCustomers(@Param('id') id: string) {
    return this.superAdminService.getCompanyCustomers(id);
  }

  @Get('companies/:id/suppliers')
  async getCompanySuppliers(@Param('id') id: string) {
    return this.superAdminService.getCompanySuppliers(id);
  }

  @Get('companies/:id/sales-orders')
  async getCompanySalesOrders(@Param('id') id: string) {
    return this.superAdminService.getCompanySalesOrders(id);
  }

  @Get('companies/:id/dispatches')
  async getCompanyDispatches(@Param('id') id: string) {
    return this.superAdminService.getCompanyDispatches(id);
  }

  @Get('companies/:id/quotations')
  async getCompanyQuotations(@Param('id') id: string) {
    return this.superAdminService.getCompanyQuotations(id);
  }

  @Get('companies/:id/invoices')
  async getCompanyInvoices(@Param('id') id: string) {
    return this.superAdminService.getCompanyInvoices(id);
  }

  @Get('companies/:id/receipts')
  async getCompanyReceipts(@Param('id') id: string) {
    return this.superAdminService.getCompanyReceipts(id);
  }

  @Get('companies/:id/payments')
  async getCompanyPayments(@Param('id') id: string) {
    return this.superAdminService.getCompanyPayments(id);
  }

  @Get('companies/:id/reports')
  async getCompanyReports(@Param('id') id: string) {
    return this.superAdminService.getCompanyReports(id);
  }

  @Get('companies/:id/audit-logs')
  async getCompanyAuditLogs(
    @Param('id') id: string,
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('limit') limit?: string
  ) {
    return this.superAdminService.getCompanyAuditLogs(id, {
      module,
      action,
      userId,
      fromDate,
      toDate,
      limit: limit ? parseInt(limit, 10) : 50
    });
  }

  @Patch('companies/:id/status')
  async updateCompanyStatus(
    @Param('id') id: string,
    @Body() body: { active: boolean; reason?: string },
    @CurrentUser() user: AuthTokenPayload
  ) {
    return this.superAdminService.updateCompanyStatus(
      id,
      body.active,
      user.userId,
      user.email,
      body.reason
    );
  }

  @Get('activity-feed')
  async getActivityFeed(@Query('limit') limit?: string) {
    return this.superAdminService.getPlatformActivityFeed(limit ? parseInt(limit, 10) : 50);
  }

  @Get('reports/platform')
  async getPlatformReports() {
    return this.superAdminService.getPlatformReports();
  }

  @Get('audit-logs')
  async getPlatformAuditLogs(
    @Query('organizationId') organizationId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('limit') limit?: string
  ) {
    return this.superAdminService.getPlatformAuditLogs({
      organizationId,
      action,
      entityType,
      fromDate,
      toDate,
      limit: limit ? parseInt(limit, 10) : 100
    });
  }
}
