import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/services/audit.service';
import * as fs from 'fs';
import * as path from 'path';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'logos');

@Injectable()
export class OrganizationService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService
  ) {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  }

  async getSettings(organizationId: string) {
    const [org, businessSettings, taxSettings, documentSettings] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: organizationId } }),
      this.prisma.businessSettings.findUnique({ where: { organizationId } }),
      this.prisma.taxSettings.findUnique({ where: { organizationId } }),
      this.prisma.documentSettings.findUnique({ where: { organizationId } })
    ]);

    if (!org) throw new NotFoundException('Organization not found');

    return {
      organization: org,
      businessSettings: businessSettings?.industrySettings || {},
      taxSettings: taxSettings || { taxMode: 'EXCLUSIVE', defaultRates: [0, 5, 12, 18, 28], enableCess: false, defaultCessRate: 0 },
      documentSettings: documentSettings || { invoicePrefix: 'INV', quotationPrefix: 'QTN', receiptPrefix: 'RCP', enableRoundOff: true, defaultReceiptFormat: '80MM' }
    };
  }

  async getBusinessProfile(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!org) throw new NotFoundException('Organization not found');

    return {
      id: org.id,
      name: org.name,
      legalName: org.legalName,
      businessType: org.businessType,
      logoUrl: org.logoUrl,
      brandingUpdatedAt: org.brandingUpdatedAt,
      phone: org.phone,
      email: org.email,
      address: org.address,
      city: org.city,
      state: org.state,
      pinCode: org.pinCode,
      country: org.country,
      currency: org.currency,
      timezone: org.timezone,
      gstStatus: org.gstStatus,
      gstin: org.gstin
    };
  }

  async updateBusinessProfile(
    organizationId: string,
    userId: string,
    userName: string,
    data: {
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
    if (!data.name || typeof data.name !== 'string') {
      throw new BadRequestException('Company name is required');
    }

    const trimmedName = data.name.trim();
    if (trimmedName.length < 2) {
      throw new BadRequestException('Company name must be at least 2 characters long');
    }
    if (trimmedName.length > 100) {
      throw new BadRequestException('Company name cannot exceed 100 characters');
    }

    const existingOrg = await this.prisma.organization.findUnique({
      where: { id: organizationId }
    });
    if (!existingOrg) throw new NotFoundException('Organization not found');

    const updatedOrg = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        name: trimmedName,
        legalName: data.legalName?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
        city: data.city?.trim() || null,
        state: data.state?.trim() || null,
        pinCode: data.pinCode?.trim() || null,
        gstin: data.gstin?.trim() || null,
        brandingUpdatedAt: new Date()
      }
    });

    await this.auditService.log({
      organizationId,
      userId,
      userName,
      action: 'ORGANIZATION_BRANDING_UPDATED',
      entityType: 'ORGANIZATION',
      entityId: organizationId,
      details: {
        oldName: existingOrg.name,
        newName: trimmedName,
        legalName: data.legalName
      }
    });

    return updatedOrg;
  }

  async uploadLogo(
    organizationId: string,
    userId: string,
    userName: string,
    payload: {
      filename?: string;
      mimetype?: string;
      base64?: string;
      buffer?: Buffer;
    }
  ) {
    let fileBuffer: Buffer;
    let mimeType = payload.mimetype || 'image/png';
    let ext = '.png';

    if (payload.base64) {
      const match = payload.base64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        fileBuffer = Buffer.from(match[2], 'base64');
      } else {
        fileBuffer = Buffer.from(payload.base64, 'base64');
      }
    } else if (payload.buffer) {
      fileBuffer = payload.buffer;
    } else {
      throw new BadRequestException('No image file payload provided');
    }

    // Supported formats check
    const allowedMimeTypes: Record<string, string> = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/webp': '.webp'
    };

    if (!allowedMimeTypes[mimeType.toLowerCase()]) {
      throw new BadRequestException('Invalid file format. Only PNG, JPEG, and WebP images are allowed.');
    }
    ext = allowedMimeTypes[mimeType.toLowerCase()];

    // Size limit check: 2MB
    const MAX_SIZE = 2 * 1024 * 1024;
    if (fileBuffer.length > MAX_SIZE) {
      throw new BadRequestException('Image file size exceeds the 2MB limit');
    }

    // Generate unique storage filename
    const safeFilename = `${organizationId}-${Date.now()}${ext}`;
    const filePath = path.join(UPLOADS_DIR, safeFilename);

    // Save to disk
    fs.writeFileSync(filePath, fileBuffer);

    // Relative URL served by API
    const relativeUrl = `/api/v1/organizations/logo/${safeFilename}`;

    // Clean up old logo if stored locally
    const existingOrg = await this.prisma.organization.findUnique({
      where: { id: organizationId }
    });
    if (existingOrg?.logoStorageKey) {
      const oldPath = path.join(UPLOADS_DIR, path.basename(existingOrg.logoStorageKey));
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch {}
      }
    }

    const updatedOrg = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        logoUrl: relativeUrl,
        logoStorageKey: safeFilename,
        brandingUpdatedAt: new Date()
      }
    });

    await this.auditService.log({
      organizationId,
      userId,
      userName,
      action: 'ORGANIZATION_LOGO_UPDATED',
      entityType: 'ORGANIZATION',
      entityId: organizationId,
      details: {
        logoUrl: relativeUrl,
        storageKey: safeFilename,
        sizeBytes: fileBuffer.length
      }
    });

    return {
      logoUrl: updatedOrg.logoUrl,
      brandingUpdatedAt: updatedOrg.brandingUpdatedAt
    };
  }

  async removeLogo(organizationId: string, userId: string, userName: string) {
    const existingOrg = await this.prisma.organization.findUnique({
      where: { id: organizationId }
    });
    if (!existingOrg) throw new NotFoundException('Organization not found');

    if (existingOrg.logoStorageKey) {
      const oldPath = path.join(UPLOADS_DIR, path.basename(existingOrg.logoStorageKey));
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch {}
      }
    }

    const updatedOrg = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        logoUrl: null,
        logoStorageKey: null,
        brandingUpdatedAt: new Date()
      }
    });

    await this.auditService.log({
      organizationId,
      userId,
      userName,
      action: 'ORGANIZATION_LOGO_REMOVED',
      entityType: 'ORGANIZATION',
      entityId: organizationId
    });

    return {
      success: true,
      logoUrl: null,
      brandingUpdatedAt: updatedOrg.brandingUpdatedAt
    };
  }

  getLogoFilePath(filename: string): { filePath: string; mimeType: string } {
    const safeName = path.basename(filename);
    const filePath = path.join(UPLOADS_DIR, safeName);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Logo image not found');
    }

    const ext = path.extname(safeName).toLowerCase();
    let mimeType = 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    if (ext === '.webp') mimeType = 'image/webp';

    return { filePath, mimeType };
  }

  async updateSettings(organizationId: string, userId: string, userName: string, data: any) {
    if (data.taxSettings) {
      await this.prisma.taxSettings.upsert({
        where: { organizationId },
        update: {
          taxMode: data.taxSettings.taxMode,
          defaultRates: data.taxSettings.defaultRates,
          enableCess: data.taxSettings.enableCess,
          defaultCessRate: data.taxSettings.defaultCessRate
        },
        create: {
          organizationId,
          taxMode: data.taxSettings.taxMode || 'EXCLUSIVE',
          defaultRates: data.taxSettings.defaultRates || [0, 5, 12, 18, 28],
          enableCess: data.taxSettings.enableCess || false,
          defaultCessRate: data.taxSettings.defaultCessRate || 0
        }
      });
    }

    if (data.documentSettings) {
      await this.prisma.documentSettings.upsert({
        where: { organizationId },
        update: {
          invoicePrefix: data.documentSettings.invoicePrefix,
          quotationPrefix: data.documentSettings.quotationPrefix,
          receiptPrefix: data.documentSettings.receiptPrefix,
          enableRoundOff: data.documentSettings.enableRoundOff,
          defaultReceiptFormat: data.documentSettings.defaultReceiptFormat,
          defaultTerms: data.documentSettings.defaultTerms
        },
        create: {
          organizationId,
          invoicePrefix: data.documentSettings.invoicePrefix || 'INV',
          quotationPrefix: data.documentSettings.quotationPrefix || 'QTN',
          receiptPrefix: data.documentSettings.receiptPrefix || 'RCP',
          enableRoundOff: data.documentSettings.enableRoundOff ?? true,
          defaultReceiptFormat: data.documentSettings.defaultReceiptFormat || '80MM',
          defaultTerms: data.documentSettings.defaultTerms
        }
      });
    }

    if (data.business) {
      await this.prisma.organization.update({
        where: { id: organizationId },
        data: {
          name: data.business.name,
          legalName: data.business.legalName,
          phone: data.business.phone,
          email: data.business.email,
          address: data.business.address,
          city: data.business.city,
          state: data.business.state,
          pinCode: data.business.pinCode,
          gstStatus: data.business.gstStatus,
          gstin: data.business.gstin
        }
      });
    }

    await this.auditService.log({
      organizationId,
      userId,
      userName,
      action: 'ORGANIZATION_SETTINGS_UPDATED',
      entityType: 'ORGANIZATION',
      entityId: organizationId
    });

    return this.getSettings(organizationId);
  }
}
