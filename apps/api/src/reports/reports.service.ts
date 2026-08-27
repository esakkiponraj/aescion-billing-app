import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { BusinessType, InvoiceStatus, PaymentMethod } from '@aescion/shared-types';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardPulse(organizationId: string, branchId?: string, period: 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM' = 'TODAY', fromDate?: string, toDate?: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) return null;

    const now = new Date();
    let start = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Start of today
    let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (period === 'THIS_WEEK') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(now.setDate(diff));
      start.setHours(0, 0, 0, 0);
    } else if (period === 'THIS_MONTH') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'CUSTOM' && fromDate && toDate) {
      start = new Date(fromDate);
      end = new Date(toDate);
    }

    const whereInvoice: any = {
      organizationId,
      status: { notIn: [InvoiceStatus.VOID, InvoiceStatus.CANCELLED] },
      createdAt: { gte: start, lte: end }
    };
    if (branchId) whereInvoice.branchId = branchId;

    // 1. Revenue & Invoices aggregation
    const invoiceAgg = await this.prisma.invoice.aggregate({
      where: whereInvoice,
      _sum: { grandTotal: true, subtotal: true, paidAmount: true, balanceAmount: true },
      _count: { id: true }
    });

    const totalRevenue = invoiceAgg._sum.grandTotal || 0;
    const completedBills = invoiceAgg._count.id || 0;
    const avgBasket = completedBills > 0 ? Math.round((totalRevenue / completedBills) * 100) / 100 : 0;

    // 2. Customer Receivables
    const customerAgg = await this.prisma.customer.aggregate({
      where: { organizationId },
      _sum: { currentOutstanding: true }
    });
    const totalReceivables = customerAgg._sum.currentOutstanding || 0;

    // 3. Payment Collections Breakdown
    const wherePayments: any = {
      organizationId,
      createdAt: { gte: start, lte: end }
    };
    if (branchId) wherePayments.branchId = branchId;

    const payments = await this.prisma.payment.findMany({ where: wherePayments });
    let cashTotal = 0;
    let upiTotal = 0;
    let cardTotal = 0;
    let otherTotal = 0;

    for (const p of payments) {
      if (p.method === PaymentMethod.CASH) cashTotal += p.amount;
      else if (p.method === PaymentMethod.UPI) upiTotal += p.amount;
      else if (p.method === PaymentMethod.CARD) cardTotal += p.amount;
      else otherTotal += p.amount;
    }
    const totalCollected = cashTotal + upiTotal + cardTotal + otherTotal;

    // 4. Low stock products
    const lowStockCount = await this.prisma.product.count({
      where: { organizationId, currentStock: { lte: 5 } }
    });

    // 5. Industry-Specific KPIs
    const industryKpis: any = {};
    const bType = org.businessType as BusinessType;

    if (bType === BusinessType.SUPERMARKET) {
      const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const nearExpiryCount = await this.prisma.medicineBatch.count({
        where: { organizationId, expiryDate: { lte: thirtyDaysLater }, isExpired: false }
      });
      const activeShiftsCount = await this.prisma.cashierShift.count({
        where: { organizationId, shiftStatus: 'OPEN' }
      });

      industryKpis.supermarket = {
        nearExpiryCount,
        activeShiftsCount,
        registersCount: await this.prisma.register.count({ where: { organizationId } })
      };
    } else if (bType === BusinessType.RESTAURANT) {
      const occupiedTables = await this.prisma.restaurantTable.count({
        where: { organizationId, status: { in: ['OCCUPIED', 'KOT_SENT', 'PREPARING', 'READY'] } }
      });
      const activeKots = await this.prisma.kitchenOrderTicket.count({
        where: { organizationId, status: { in: ['NEW', 'PREPARING'] } }
      });
      industryKpis.restaurant = {
        occupiedTables,
        totalTables: await this.prisma.restaurantTable.count({ where: { organizationId } }),
        activeKots
      };
    } else if (bType === BusinessType.SERVICE) {
      const openJobs = await this.prisma.serviceJobCard.count({
        where: { organizationId, status: { in: ['RECEIVED', 'INSPECTION', 'IN_PROGRESS', 'WAITING_APPROVAL', 'WAITING_PART'] } }
      });
      const readyJobs = await this.prisma.serviceJobCard.count({
        where: { organizationId, status: 'READY' }
      });
      industryKpis.service = {
        openJobs,
        readyJobs
      };
    } else if (bType === BusinessType.PHARMACY) {
      const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const nearExpiryMedicines = await this.prisma.medicineBatch.count({
        where: { organizationId, expiryDate: { lte: thirtyDaysLater, gte: now }, isExpired: false }
      });
      const expiredCount = await this.prisma.medicineBatch.count({
        where: { organizationId, OR: [{ isExpired: true }, { expiryDate: { lt: now } }] }
      });
      industryKpis.pharmacy = {
        nearExpiryMedicines,
        expiredCount
      };
    } else if (bType === BusinessType.WHOLESALE) {
      const pendingOrders = await this.prisma.wholesaleSalesOrder.count({
        where: { organizationId, status: { in: ['ORDER_PLACED', 'STOCK_ALLOCATED'] } }
      });
      industryKpis.wholesale = {
        pendingOrders
      };
    }

    return {
      period,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      completedBills,
      avgBasket,
      estimatedProfit: Math.round(totalRevenue * 0.22 * 100) / 100,
      marginPercent: totalRevenue > 0 ? 22 : 0,
      customerReceivables: Math.round(totalReceivables * 100) / 100,
      lowStockCount,
      collections: {
        cash: Math.round(cashTotal * 100) / 100,
        upi: Math.round(upiTotal * 100) / 100,
        card: Math.round(cardTotal * 100) / 100,
        other: Math.round(otherTotal * 100) / 100,
        total: Math.round(totalCollected * 100) / 100
      },
      industryKpis
    };
  }

  async getReportsSummary(organizationId: string, branchId?: string) {
    const where: any = { organizationId };
    if (branchId) where.branchId = branchId;

    const [invoices, products, shifts, customers] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { ...where, status: { not: InvoiceStatus.VOID } },
        include: { lines: true },
        orderBy: { createdAt: 'desc' },
        take: 50
      }),
      this.prisma.product.findMany({
        where: { organizationId },
        orderBy: { currentStock: 'asc' },
        take: 50
      }),
      this.prisma.cashierShift.findMany({
        where,
        orderBy: { openedAt: 'desc' },
        take: 30
      }),
      this.prisma.customer.findMany({
        where: { organizationId, currentOutstanding: { gt: 0 } },
        orderBy: { currentOutstanding: 'desc' },
        take: 30
      })
    ]);

    // Aggregate Product Sales ranking
    const productSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    for (const inv of invoices) {
      for (const line of inv.lines) {
        if (!productSalesMap[line.name]) {
          productSalesMap[line.name] = { name: line.name, quantity: 0, revenue: 0 };
        }
        productSalesMap[line.name].quantity += line.quantity;
        productSalesMap[line.name].revenue += line.lineTotal;
      }
    }

    const topSellingProducts = Object.values(productSalesMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return {
      topSellingProducts,
      recentInvoices: invoices.slice(0, 15),
      lowStockProducts: products.filter(p => p.currentStock <= 10),
      recentShifts: shifts,
      outstandingCustomers: customers
    };
  }
}
