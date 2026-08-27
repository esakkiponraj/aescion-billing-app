import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { BranchService } from './branches.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthTokenPayload } from '@aescion/shared-types';
import { Permission } from '@aescion/capability-config';

@Controller('branches')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class BranchController {
  constructor(private branchService: BranchService) {}

  @Get()
  @RequirePermissions(Permission.BRANCH_VIEW)
  async findAll(@CurrentUser() user: AuthTokenPayload) {
    return this.branchService.findAll(user.organizationId);
  }

  @Get(':id')
  @RequirePermissions(Permission.BRANCH_VIEW)
  async findOne(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string) {
    return this.branchService.findOne(user.organizationId, id);
  }

  @Post()
  @RequirePermissions(Permission.BRANCH_CREATE)
  async create(@CurrentUser() user: AuthTokenPayload, @Body() body: any) {
    return this.branchService.create(user.organizationId, user.userId, user.email, body);
  }

  @Put(':id')
  @RequirePermissions(Permission.BRANCH_UPDATE)
  async update(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string, @Body() body: any) {
    return this.branchService.update(user.organizationId, id, user.userId, user.email, body);
  }

  @Post(':id/registers')
  @RequirePermissions(Permission.BRANCH_UPDATE)
  async createRegister(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string, @Body() body: any) {
    return this.branchService.createRegister(user.organizationId, id, user.userId, user.email, body);
  }
}
