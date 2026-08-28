import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { TeamService } from './team.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthTokenPayload } from '@aescion/shared-types';
import { Permission } from '@aescion/capability-config';

@Controller(['team', 'users'])
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class TeamController {
  constructor(private teamService: TeamService) {}

  @Get()
  @RequirePermissions(Permission.USER_VIEW)
  async getUsers(@CurrentUser() user: AuthTokenPayload) {
    return this.teamService.getMembers(user.organizationId);
  }

  @Get('members')
  @RequirePermissions(Permission.USER_VIEW)
  async getMembers(@CurrentUser() user: AuthTokenPayload) {
    return this.teamService.getMembers(user.organizationId);
  }

  @Get('roles')
  @RequirePermissions(Permission.ROLE_VIEW)
  async getRoles(@CurrentUser() user: AuthTokenPayload) {
    return this.teamService.getRoles(user.organizationId);
  }

  @Post()
  @RequirePermissions(Permission.USER_CREATE)
  async createUser(@CurrentUser() user: AuthTokenPayload, @Body() body: any) {
    return this.teamService.addMember(user.organizationId, user.userId, user.email, body);
  }

  @Post('members')
  @RequirePermissions(Permission.USER_CREATE)
  async addMember(@CurrentUser() user: AuthTokenPayload, @Body() body: any) {
    return this.teamService.addMember(user.organizationId, user.userId, user.email, body);
  }

  @Put('members/:id')
  @RequirePermissions(Permission.USER_UPDATE)
  async updateMember(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string, @Body() body: any) {
    return this.teamService.updateMember(user.organizationId, id, user.userId, user.email, body);
  }

  @Post('roles')
  @RequirePermissions(Permission.ROLE_CREATE)
  async createCustomRole(@CurrentUser() user: AuthTokenPayload, @Body() body: any) {
    return this.teamService.createCustomRole(user.organizationId, user.userId, user.email, body);
  }

  @Put('roles/:id')
  @RequirePermissions(Permission.ROLE_UPDATE)
  async updateRole(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string, @Body() body: any) {
    return this.teamService.updateRole(user.organizationId, id, user.userId, user.email, body);
  }
}
