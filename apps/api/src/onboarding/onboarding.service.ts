import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../common/prisma.service';
import { OnboardingInput } from '@aescion/validation';
import { BusinessType, RoleType } from '@aescion/shared-types';
import { getDomainRoleTemplates } from '@aescion/capability-config';
import { AuthService } from '../auth/auth.service';
import { AuditService } from '../common/services/audit.service';

@Injectable()
export class OnboardingService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
    private auditService: AuditService
  ) {}

  async createBusiness(dto: OnboardingInput) {
    // 1. Check if email or username already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: dto.owner.email, mode: 'insensitive' } },
          { username: { equals: dto.owner.username, mode: 'insensitive' } }
        ]
      }
    });

    if (existingUser) {
      throw new ConflictException('A user with this email or username already exists.');
    }

    // 2. Hash owner password
    const passwordHash = await bcrypt.hash(dto.owner.password, 10);

    // 3. Perform atomic creation within transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Step 1: Create Owner User
      const ownerUser = await tx.user.create({
        data: {
          firstName: dto.owner.firstName,
          lastName: dto.owner.lastName || '',
          email: dto.owner.email.toLowerCase(),
          username: dto.owner.username.toLowerCase(),
          mobileNumber: dto.owner.mobileNumber,
          passwordHash,
          isActive: true
        }
      });

      // Step 2: Create Organization
      const organization = await tx.organization.create({
        data: {
          name: dto.business.name,
          legalName: dto.business.legalName || dto.business.name,
          businessType: dto.businessType,
          phone: dto.business.phone,
          email: (dto.business.email || dto.owner.email).toLowerCase(),
          address: dto.business.address || `${dto.business.city || 'Main'} Outlet`,
          city: dto.business.city || 'Bangalore',
          state: dto.business.state || 'Karnataka',
          pinCode: dto.business.pinCode || '560001',
          country: dto.business.country || 'India',
          currency: dto.business.currency || 'INR',
          timezone: dto.business.timezone || 'Asia/Kolkata',
          gstStatus: dto.business.gstStatus || false,
          gstin: dto.business.gstin
        }
      });

      // Step 3: Create Default System Roles for the Organization matching its Business Domain
      const createdRoles: Record<string, any> = {};
      const domainTemplates = getDomainRoleTemplates(dto.businessType);

      for (const template of domainTemplates) {
        const role = await tx.role.create({
          data: {
            organizationId: organization.id,
            name: template.name,
            roleType: template.roleType,
            permissions: template.defaultPermissions as string[],
            isSystem: true
          }
        });
        createdRoles[template.roleType] = role;
      }

      // Step 4: Create Branches
      const createdBranches: any[] = [];
      for (let i = 0; i < dto.branches.length; i++) {
        const b = dto.branches[i];
        const branch = await tx.branch.create({
          data: {
            organizationId: organization.id,
            name: b.name,
            code: b.code.toUpperCase(),
            address: b.address || dto.business.address,
            city: b.city || dto.business.city,
            state: b.state || dto.business.state,
            phone: b.phone || dto.business.phone,
            isMain: b.isMain || i === 0,
            isActive: true
          }
        });
        createdBranches.push(branch);

        // Create default register for branch
        await tx.register.create({
          data: {
            organizationId: organization.id,
            branchId: branch.id,
            name: `${branch.code}-REG-01`,
            code: 'REG-01',
            isActive: true
          }
        });
      }

      const mainBranch = createdBranches[0];

      // Step 5: Assign OWNER Membership
      await tx.membership.create({
        data: {
          userId: ownerUser.id,
          organizationId: organization.id,
          branchId: mainBranch.id,
          roleId: createdRoles[RoleType.OWNER].id,
          isActive: true
        }
      });

      // Step 6: Create Settings
      await tx.businessSettings.create({
        data: {
          organizationId: organization.id,
          industrySettings: dto.industrySettings || {}
        }
      });

      await tx.taxSettings.create({
        data: {
          organizationId: organization.id,
          taxMode: dto.taxSettings?.taxMode || 'EXCLUSIVE',
          defaultRates: dto.taxSettings?.defaultRates || [0, 5, 12, 18, 28],
          enableCess: dto.taxSettings?.enableCess || false,
          defaultCessRate: dto.taxSettings?.defaultCessRate || 0
        }
      });

      await tx.documentSettings.create({
        data: {
          organizationId: organization.id,
          invoicePrefix: dto.billingSettings?.invoicePrefix || 'INV',
          quotationPrefix: dto.billingSettings?.quotationPrefix || 'QTN',
          receiptPrefix: dto.billingSettings?.receiptPrefix || 'RCP',
          enableRoundOff: dto.billingSettings?.enableRoundOff ?? true,
          defaultReceiptFormat: dto.billingSettings?.defaultReceiptFormat || '80MM',
          defaultTerms: dto.billingSettings?.defaultTerms || 'Thank you for your business!'
        }
      });

      // Step 7: Create Team Members if provided
      if (dto.teamSetupMode === 'MY_TEAM' && dto.teamMembers && dto.teamMembers.length > 0) {
        for (const member of dto.teamMembers) {
          const memberHash = await bcrypt.hash(member.password, 10);
          const memberUser = await tx.user.create({
            data: {
              email: member.email.toLowerCase(),
              username: member.username.toLowerCase(),
              passwordHash: memberHash,
              firstName: member.firstName,
              lastName: member.lastName,
              isActive: true
            }
          });

          const assignedRole = createdRoles[member.roleType] || createdRoles[RoleType.CASHIER];
          const assignedBranch = createdBranches.find((b) => b.code === member.branchCode) || mainBranch;

          await tx.membership.create({
            data: {
              userId: memberUser.id,
              organizationId: organization.id,
              branchId: assignedBranch.id,
              roleId: assignedRole.id,
              isActive: true
            }
          });
        }
      }

      // Step 8: Seed Industry Initial Master Data so the business is immediately operational
      await this.seedIndustryInitialData(tx, organization.id, mainBranch.id, dto.businessType);

      return {
        userId: ownerUser.id,
        email: ownerUser.email,
        organizationId: organization.id,
        mainBranchId: mainBranch.id
      };
    });

    await this.auditService.log({
      organizationId: result.organizationId,
      branchId: result.mainBranchId,
      userId: result.userId,
      userName: `${dto.owner.firstName} ${dto.owner.lastName}`,
      action: 'ORGANIZATION_CREATED',
      entityType: 'ORGANIZATION',
      entityId: result.organizationId,
      details: { businessType: dto.businessType, name: dto.business.name }
    });

    // Automatically log in the owner and return full authorized payload
    return this.authService.login({
      identifier: dto.owner.email,
      password: dto.owner.password
    });
  }

  private async seedIndustryInitialData(tx: any, orgId: string, branchId: string, type: BusinessType) {
    // Standard default customer
    await tx.customer.create({
      data: {
        organizationId: orgId,
        name: 'Walk-in Customer',
        phone: '9999999999',
        creditLimit: 0,
        currentOutstanding: 0
      }
    });

    if (type === BusinessType.SUPERMARKET) {
      const p1 = await tx.product.create({
        data: {
          organizationId: orgId,
          name: 'Aashirvaad Shudh Chakki Atta 5kg',
          sku: 'GRO-ATT-001',
          barcode: '8901030383748',
          category: 'Staples & Grains',
          brand: 'Aashirvaad',
          unit: 'BAG',
          costPrice: 210,
          sellingPrice: 245,
          mrp: 260,
          taxRate: 5,
          hsn: '1101',
          currentStock: 40
        }
      });
      await tx.stockLedger.create({
        data: {
          organizationId: orgId,
          branchId,
          productId: p1.id,
          eventType: 'PURCHASE_RECEIPT',
          quantityChange: 40,
          balanceAfter: 40,
          unitCost: 210,
          notes: 'Opening Stock',
          createdById: 'SYSTEM'
        }
      });

      const p2 = await tx.product.create({
        data: {
          organizationId: orgId,
          name: 'Amul Taaza Homogenised Toned Milk 1L',
          sku: 'DAI-MLK-001',
          barcode: '8901262010057',
          category: 'Dairy & Eggs',
          brand: 'Amul',
          unit: 'LTR',
          costPrice: 66,
          sellingPrice: 74,
          mrp: 75,
          taxRate: 0,
          hsn: '0401',
          currentStock: 25
        }
      });
      await tx.stockLedger.create({
        data: {
          organizationId: orgId,
          branchId,
          productId: p2.id,
          eventType: 'PURCHASE_RECEIPT',
          quantityChange: 25,
          balanceAfter: 25,
          unitCost: 66,
          notes: 'Opening Stock',
          createdById: 'SYSTEM'
        }
      });

      const p3 = await tx.product.create({
        data: {
          organizationId: orgId,
          name: 'Fresh Farm Tomatoes (Weighing)',
          sku: 'VEG-TOM-001',
          barcode: '2001',
          category: 'Fresh Produce',
          unit: 'KG',
          costPrice: 25,
          sellingPrice: 38,
          taxRate: 0,
          isWeightBased: true,
          currentStock: 60
        }
      });
      await tx.stockLedger.create({
        data: {
          organizationId: orgId,
          branchId,
          productId: p3.id,
          eventType: 'PURCHASE_RECEIPT',
          quantityChange: 60,
          balanceAfter: 60,
          unitCost: 25,
          notes: 'Opening Stock',
          createdById: 'SYSTEM'
        }
      });
    } else if (type === BusinessType.RETAIL) {
      const p1 = await tx.product.create({
        data: {
          organizationId: orgId,
          name: 'Men Slim Fit Oxford Cotton Shirt',
          sku: 'APP-SHT-001',
          barcode: '890754321011',
          category: 'Men Apparel',
          brand: 'AESCION Wear',
          unit: 'PCS',
          costPrice: 650,
          sellingPrice: 1299,
          mrp: 1499,
          taxRate: 12,
          hsn: '6205',
          currentStock: 30
        }
      });
      await tx.stockLedger.create({
        data: {
          organizationId: orgId,
          branchId,
          productId: p1.id,
          eventType: 'PURCHASE_RECEIPT',
          quantityChange: 30,
          balanceAfter: 30,
          unitCost: 650,
          notes: 'Opening Stock',
          createdById: 'SYSTEM'
        }
      });
    } else if (type === BusinessType.RESTAURANT) {
      // Tables
      await tx.restaurantTable.createMany({
        data: [
          { organizationId: orgId, branchId, tableNumber: 'T-01', capacity: 2, section: 'Ground Floor', status: 'AVAILABLE' },
          { organizationId: orgId, branchId, tableNumber: 'T-02', capacity: 4, section: 'Ground Floor', status: 'AVAILABLE' },
          { organizationId: orgId, branchId, tableNumber: 'T-03', capacity: 4, section: 'AC Hall', status: 'AVAILABLE' },
          { organizationId: orgId, branchId, tableNumber: 'T-04', capacity: 6, section: 'AC Hall', status: 'AVAILABLE' },
          { organizationId: orgId, branchId, tableNumber: 'T-05', capacity: 4, section: 'Balcony', status: 'AVAILABLE' }
        ]
      });

      // Menu items
      await tx.product.createMany({
        data: [
          { organizationId: orgId, name: 'Paneer Butter Masala', sku: 'RST-CUR-01', category: 'Main Course', unit: 'PORTION', costPrice: 90, sellingPrice: 260, taxRate: 5, currentStock: 999 },
          { organizationId: orgId, name: 'Butter Naan', sku: 'RST-BRD-01', category: 'Breads', unit: 'PCS', costPrice: 12, sellingPrice: 45, taxRate: 5, currentStock: 999 },
          { organizationId: orgId, name: 'Cold Coffee with Ice Cream', sku: 'RST-BEV-01', category: 'Beverages', unit: 'GLASS', costPrice: 35, sellingPrice: 120, taxRate: 5, currentStock: 999 }
        ]
      });
    } else if (type === BusinessType.PHARMACY) {
      const med1 = await tx.medicineMaster.create({
        data: {
          organizationId: orgId,
          name: 'Dolo 650mg Tablet',
          genericName: 'Paracetamol 650mg',
          manufacturer: 'Micro Labs Ltd',
          dosageForm: 'Tablet',
          hsn: '3004',
          taxRate: 12,
          mrp: 34.5,
          currentStock: 100
        }
      });
      // Valid batch
      await tx.medicineBatch.create({
        data: {
          organizationId: orgId,
          branchId,
          medicineId: med1.id,
          medicineName: 'Dolo 650mg Tablet',
          batchNumber: 'DL2408',
          manufacturingDate: new Date('2026-01-01'),
          expiryDate: new Date('2027-12-31'),
          purchaseRate: 22,
          sellingRate: 34.5,
          mrp: 34.5,
          quantityRemaining: 100,
          isExpired: false
        }
      });
    } else if (type === BusinessType.SERVICE) {
      await tx.product.createMany({
        data: [
          { organizationId: orgId, name: 'iPhone 13 OLED Display Panel', sku: 'SP-IP13-DISP', category: 'Spare Parts', unit: 'PCS', costPrice: 3200, sellingPrice: 5800, taxRate: 18, currentStock: 5 },
          { organizationId: orgId, name: 'General Diagnostic & Labour Fee', sku: 'SRV-LABOUR-GEN', category: 'Labour', unit: 'HRS', costPrice: 0, sellingPrice: 450, taxRate: 18, currentStock: 9999 }
        ]
      });
    } else if (type === BusinessType.WHOLESALE) {
      await tx.product.createMany({
        data: [
          { organizationId: orgId, name: 'Industrial Safety Helmet (Box of 20)', sku: 'WHL-HLM-20', category: 'Safety Equipment', unit: 'BOX', costPrice: 1800, sellingPrice: 2600, taxRate: 18, hsn: '6506', currentStock: 50 },
          { organizationId: orgId, name: 'Heavy Duty Power Cable 100m Drum', sku: 'WHL-CBL-100M', category: 'Electrical', unit: 'DRUM', costPrice: 4200, sellingPrice: 5900, taxRate: 18, hsn: '8544', currentStock: 25 }
        ]
      });
    }
  }
}
