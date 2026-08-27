import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CustomerService } from './customers.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthTokenPayload } from '@aescion/shared-types';
import { Permission } from '@aescion/capability-config';

@Controller('customers')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class CustomerController {
  constructor(private customerService: CustomerService) {}

  @Get()
  @RequirePermissions(Permission.CUSTOMER_VIEW)
  async findAll(
    @CurrentUser() user: AuthTokenPayload,
    @Query('search') search?: string
  ) {
    return this.customerService.findAll(user.organizationId, search);
  }

  @Get('ageing')
  @RequirePermissions(Permission.CUSTOMER_VIEW)
  async getAgeingReport(@CurrentUser() user: AuthTokenPayload) {
    return this.customerService.getAgeingReport(user.organizationId);
  }

  @Get(':id')
  @RequirePermissions(Permission.CUSTOMER_VIEW)
  async findOne(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.customerService.findOne(user.organizationId, id);
  }

  @Post()
  @RequirePermissions(Permission.CUSTOMER_CREATE)
  async create(@CurrentUser() user: AuthTokenPayload, @Body() body: any) {
    return this.customerService.create(user.organizationId, user.userId, user.email, body);
  }

  @Put(':id')
  @RequirePermissions(Permission.CUSTOMER_UPDATE)
  async update(
    @CurrentUser() user: AuthTokenPayload,
    @Param('id') id: string,
    @Body() body: any
  ) {
    return this.customerService.update(user.organizationId, id, user.userId, user.email, body);
  }
}
