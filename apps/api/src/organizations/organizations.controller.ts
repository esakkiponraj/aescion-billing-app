import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Res,
  UseGuards
} from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import { OrganizationService } from './organizations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthTokenPayload } from '@aescion/shared-types';
import { Permission } from '@aescion/capability-config';

@Controller('organizations')
export class OrganizationController {
  constructor(private orgService: OrganizationService) {}

  @Get('settings')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions(Permission.ORG_VIEW)
  async getSettings(@CurrentUser() user: AuthTokenPayload) {
    return this.orgService.getSettings(user.organizationId);
  }

  @Put('settings')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions(Permission.ORG_UPDATE)
  async updateSettings(@CurrentUser() user: AuthTokenPayload, @Body() body: any) {
    return this.orgService.updateSettings(user.organizationId, user.userId, user.email, body);
  }

  // All authenticated organization members can view the business profile & branding
  @Get('business-profile')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async getBusinessProfile(@CurrentUser() user: AuthTokenPayload) {
    return this.orgService.getBusinessProfile(user.organizationId);
  }

  // Only authorized roles (Owner / Admin) with ORG_UPDATE can modify company name
  @Put('business-profile')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions(Permission.ORG_UPDATE)
  async updateBusinessProfile(
    @CurrentUser() user: AuthTokenPayload,
    @Body() body: {
      name: string;
      legalName?: string;
      phone?: string;
      email?: string;
      address?: string;
      city?: string;
      state?: string;
      pinCode?: string;
      gstin?: string;
    }
  ) {
    return this.orgService.updateBusinessProfile(
      user.organizationId,
      user.userId,
      user.email,
      body
    );
  }

  // Only authorized roles with ORG_UPDATE can upload a new logo
  @Post('logo')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions(Permission.ORG_UPDATE)
  async uploadLogo(
    @CurrentUser() user: AuthTokenPayload,
    @Body() body: { base64?: string; mimetype?: string; filename?: string }
  ) {
    return this.orgService.uploadLogo(
      user.organizationId,
      user.userId,
      user.email,
      body
    );
  }

  // Only authorized roles with ORG_UPDATE can remove the logo
  @Delete('logo')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @RequirePermissions(Permission.ORG_UPDATE)
  async removeLogo(@CurrentUser() user: AuthTokenPayload) {
    return this.orgService.removeLogo(user.organizationId, user.userId, user.email);
  }

  // Public/direct logo static serving endpoint
  @Get('logo/:filename')
  async serveLogo(@Param('filename') filename: string, @Res() res: Response) {
    const { filePath, mimeType } = this.orgService.getLogoFilePath(filename);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }
}
