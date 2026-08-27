import { Controller, Get, Post, Put, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ShiftService } from './shifts.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthTokenPayload } from '@aescion/shared-types';
import { Permission } from '@aescion/capability-config';

@Controller(['cashier-shifts', 'shifts'])
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class ShiftController {
  constructor(private shiftService: ShiftService) {}

  @Get()
  @RequirePermissions(Permission.SHIFT_VIEW_ALL)
  async getAllShifts(@CurrentUser() user: AuthTokenPayload, @Req() req: any) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId;
    return this.shiftService.getAllShifts(user.organizationId, branchId);
  }

  @Get('active')
  @RequirePermissions(Permission.SHIFT_OPEN)
  async getActiveShift(@CurrentUser() user: AuthTokenPayload, @Req() req: any) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId || '';
    const shift = await this.shiftService.getCurrentShift(user.organizationId, branchId, user.userId);
    return shift || null;
  }

  @Get('current')
  @RequirePermissions(Permission.SHIFT_OPEN)
  async getCurrentShift(@CurrentUser() user: AuthTokenPayload, @Req() req: any) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId || '';
    const shift = await this.shiftService.getCurrentShift(user.organizationId, branchId, user.userId);
    return shift || null;
  }

  @Get('all')
  @RequirePermissions(Permission.SHIFT_VIEW_ALL)
  async getAllShiftsAlt(@CurrentUser() user: AuthTokenPayload, @Req() req: any) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId;
    return this.shiftService.getAllShifts(user.organizationId, branchId);
  }

  @Post('open')
  @RequirePermissions(Permission.SHIFT_OPEN)
  async openShift(@CurrentUser() user: AuthTokenPayload, @Req() req: any, @Body() body: any) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId || '';
    return this.shiftService.openShift(user.organizationId, branchId, user.userId, user.email, body);
  }

  @Post('close')
  @RequirePermissions(Permission.SHIFT_CLOSE)
  async closeCurrentShift(@CurrentUser() user: AuthTokenPayload, @Req() req: any, @Body() body: any) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId || '';
    return this.shiftService.closeCurrentShift(user.organizationId, branchId, user.userId, user.email, body);
  }

  @Put(':id/close')
  @RequirePermissions(Permission.SHIFT_CLOSE)
  async closeShift(@CurrentUser() user: AuthTokenPayload, @Param('id') id: string, @Body() body: any) {
    return this.shiftService.closeShift(user.organizationId, id, user.userId, user.email, body);
  }
}
