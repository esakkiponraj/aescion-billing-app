import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreditAgeingSummary } from '@aescion/shared-types';
import { AuditService } from '../common/services/audit.service';

@Injectable()
export class CustomerService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService
  ) {}

  async findAll(organizationId: string, search?: string) {
    const where: any = { organizationId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    return this.prisma.customer.findMany({
      where,
      orderBy: { name: 'asc' }
    });
  }

  async findOne(organizationId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, organizationId },
      include: {
        ledger: { orderBy: { createdAt: 'desc' }, take: 50 },
        invoices: { orderBy: { createdAt: 'desc' }, take: 20 }
      }
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async create(organizationId: string, userId: string, userName: string, data: any) {
    const customer = await this.prisma.customer.create({
      data: {
        organizationId,
        name: data.name,
        phone: data.phone,
        email: data.email,
        gstin: data.gstin,
        address: data.address,
        city: data.city,
        state: data.state,
        creditLimit: data.creditLimit ? parseFloat(data.creditLimit) : 0,
        currentOutstanding: 0,
        loyaltyPoints: 0
      }
    });

    await this.auditService.log({
      organizationId,
      userId,
      userName,
      action: 'CUSTOMER_CREATE',
      entityType: 'CUSTOMER',
      entityId: customer.id,
      details: { name: customer.name, phone: customer.phone }
    });

    return customer;
  }

  async update(organizationId: string, id: string, userId: string, userName: string, data: any) {
    const customer = await this.findOne(organizationId, id);
    const updated = await this.prisma.customer.update({
      where: { id: customer.id },
      data: {
        name: data.name ?? customer.name,
        phone: data.phone ?? customer.phone,
        email: data.email ?? customer.email,
        gstin: data.gstin ?? customer.gstin,
        address: data.address ?? customer.address,
        city: data.city ?? customer.city,
        state: data.state ?? customer.state,
        creditLimit: data.creditLimit !== undefined ? parseFloat(data.creditLimit) : customer.creditLimit
      }
    });

    await this.auditService.log({
      organizationId,
      userId,
      userName,
      action: 'CUSTOMER_UPDATE',
      entityType: 'CUSTOMER',
      entityId: customer.id
    });

    return updated;
  }

  async getAgeingReport(organizationId: string): Promise<CreditAgeingSummary[]> {
    const customers = await this.prisma.customer.findMany({
      where: { organizationId, currentOutstanding: { gt: 0 } },
      include: {
        invoices: {
          where: { balanceAmount: { gt: 0 } }
        }
      }
    });

    const now = new Date().getTime();
    const dayMs = 24 * 60 * 60 * 1000;

    return customers.map((c) => {
      let current0to30 = 0;
      let days31to60 = 0;
      let days61to90 = 0;
      let daysAbove90 = 0;

      for (const inv of c.invoices) {
        const invAgeDays = Math.floor((now - new Date(inv.createdAt).getTime()) / dayMs);
        if (invAgeDays <= 30) {
          current0to30 += inv.balanceAmount;
        } else if (invAgeDays <= 60) {
          days31to60 += inv.balanceAmount;
        } else if (invAgeDays <= 90) {
          days61to90 += inv.balanceAmount;
        } else {
          daysAbove90 += inv.balanceAmount;
        }
      }

      return {
        customerId: c.id,
        customerName: c.name,
        totalOutstanding: c.currentOutstanding,
        current0to30: Math.round(current0to30 * 100) / 100,
        days31to60: Math.round(days31to60 * 100) / 100,
        days61to90: Math.round(days61to90 * 100) / 100,
        daysAbove90: Math.round(daysAbove90 * 100) / 100
      };
    });
  }
}
