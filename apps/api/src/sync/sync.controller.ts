import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { SyncService } from './sync.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthTokenPayload } from '@aescion/shared-types';

@Controller('sync')
@UseGuards(JwtAuthGuard, TenantGuard)
export class SyncController {
  constructor(private syncService: SyncService) {}

  @Post('batch')
  async processSyncBatch(
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: any,
    @Body() body: any
  ) {
    const branchId = (req.headers['x-branch-id'] as string) || user.branchId || '';
    return this.syncService.processSyncBatch(user.organizationId, branchId, user.userId, user.email, body);
  }
}
