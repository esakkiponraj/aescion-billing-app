import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { BusinessType, InvoiceStatus, PaymentMethod } from '@aescion/shared-types';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardPulse(
    organizationId: string,
    branchId?: string,
    period: 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM' = 'TODAY',
    fromDate?: string,
    toDate?: string
  ) {
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
    if (branchId && branchId !== 'ALL') whereInvoice.branchId = branchId;

    const whereQuotation: any = {
      organizationId,
      status: { notIn: ['REJECTED', 'CANCELLED'] },
      createdAt: { gte: start, lte: end }
    };
    if (branchId && branchId !== 'ALL') whereQuotation.branchId = branchId;

    const wherePayments: any = {
      organizationId,
      createdAt: { gte: start, lte: end }
    };
    if (branchId && branchId !== 'ALL') wherePayments.branchId = branchId;

    const whereSalesOrder: any = {
      organizationId,
      createdAt: { gte: start, lte: end }
    };
    if (branchId && branchId !== 'ALL') whereSalesOrder.branchId = branchId;

    // 1. Revenue & Invoices aggregation
    const [invoiceAgg, quotationCount, receiptCount, salesOrderCount, pendingDispatches] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: whereInvoice,
        _sum: { grandTotal: true, subtotal: true, paidAmount: true, balanceAmount: true },
        _count: { id: true }
      }),
      this.prisma.quotation.count({ where: whereQuotation }),
      this.prisma.payment.count({ where: wherePayments }),
      this.prisma.wholesaleSalesOrder.count({ where: whereSalesOrder }),
      this.prisma.wholesaleSalesOrder.count({
        where: {
          organizationId,
          ...(branchId && branchId !== 'ALL' ? { branchId } : {}),
          status: { in: ['ORDER_PLACED', 'STOCK_ALLOCATED', 'PARTIALLY_DISPATCHED'] }
        }
      })
    ]);

    const totalRevenue = invoiceAgg._sum.grandTotal || 0;
    const completedBills = invoiceAgg._count.id || 0;
    const avgBasket = completedBills > 0 ? Math.round((totalRevenue / completedBills) * 100) / 100 : 0;

    // 2. Customer Receivables & Supplier Payables
    const [customerAgg, poAgg] = await Promise.all([
      this.prisma.customer.aggregate({
        where: { organizationId },
        _sum: { currentOutstanding: true }
      }),
      this.prisma.purchaseOrder.aggregate({
        where: {
          organizationId,
          status: { in: ['APPROVED', 'DRAFT', 'PARTIALLY_RECEIVED'] }
        },
        _sum: { grandTotal: true }
      })
    ]);
    const totalReceivables = customerAgg._sum.currentOutstanding || 0;
    const totalSupplierPayables = poAgg._sum.grandTotal || 0;

    // 3. Payment Collections Breakdown
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
      const whereShift: any = { organizationId, shiftStatus: 'OPEN' };
      if (branchId && branchId !== 'ALL') whereShift.branchId = branchId;
      const activeShiftsCount = await this.prisma.cashierShift.count({ where: whereShift });

      industryKpis.supermarket = {
        nearExpiryCount,
        activeShiftsCount,
        registersCount: await this.prisma.register.count({ where: { organizationId } })
      };
    } else if (bType === BusinessType.RESTAURANT) {
      const whereTable: any = { organizationId, status: { in: ['OCCUPIED', 'KOT_SENT', 'PREPARING', 'READY'] } };
      if (branchId && branchId !== 'ALL') whereTable.branchId = branchId;
      const occupiedTables = await this.prisma.restaurantTable.count({ where: whereTable });

      const whereKot: any = { organizationId, status: { in: ['NEW', 'PREPARING'] } };
      if (branchId && branchId !== 'ALL') whereKot.branchId = branchId;
      const activeKots = await this.prisma.kitchenOrderTicket.count({ where: whereKot });

      industryKpis.restaurant = {
        occupiedTables,
        totalTables: await this.prisma.restaurantTable.count({ where: { organizationId } }),
        activeKots
      };
    } else if (bType === BusinessType.SERVICE) {
      const whereJob: any = {
        organizationId,
        status: { in: ['RECEIVED', 'INSPECTION', 'IN_PROGRESS', 'WAITING_APPROVAL', 'WAITING_PART'] }
      };
      if (branchId && branchId !== 'ALL') whereJob.branchId = branchId;
      const openJobs = await this.prisma.serviceJobCard.count({ where: whereJob });
      const readyJobs = await this.prisma.serviceJobCard.count({
        where: { organizationId, status: 'READY', ...(branchId && branchId !== 'ALL' ? { branchId } : {}) }
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
      industryKpis.wholesale = {
        pendingOrders: pendingDispatches,
        salesOrderCount,
        supplierPayables: Math.round(totalSupplierPayables * 100) / 100
      };
    }

    const roundedRevenue = Math.round(totalRevenue * 100) / 100;
    const roundedReceivables = Math.round(totalReceivables * 100) / 100;
    const roundedPayables = Math.round(totalSupplierPayables * 100) / 100;

    return {
      period,
      totalRevenue: roundedRevenue,
      completedBills,
      quotationCount,
      invoiceCount: completedBills,
      receiptCount,
      salesOrderCount,
      pendingDispatches,
      avgBasket,
      estimatedProfit: Math.round(totalRevenue * 0.22 * 100) / 100,
      marginPercent: totalRevenue > 0 ? 22 : 0,
      customerReceivables: roundedReceivables,
      pendingReceivables: roundedReceivables,
      supplierPayables: roundedPayables,
      lowStockCount,
      metrics: {
        totalSales: roundedRevenue,
        invoiceCount: completedBills,
        completedBills,
        quotationCount,
        receiptCount,
        salesOrderCount,
        pendingDispatches,
        avgBasket,
        customerReceivables: roundedReceivables,
        supplierPayables: roundedPayables,
        lowStockCount
      },
      paymentBreakdown: {
        CASH: Math.round(cashTotal * 100) / 100,
        UPI: Math.round(upiTotal * 100) / 100,
        CARD: Math.round(cardTotal * 100) / 100,
        CREDIT: Math.round(otherTotal * 100) / 100,
        total: Math.round(totalCollected * 100) / 100
      },
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
    if (branchId && branchId !== 'ALL') where.branchId = branchId;

    const [invoices, products, shifts, customers, salesOrders, purchaseOrders] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { ...where, status: { not: InvoiceStatus.VOID } },
        include: { lines: true },
        orderBy: { createdAt: 'desc' },
        take: 100
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
        include: { invoices: { where: { balanceAmount: { gt: 0 } } } },
        orderBy: { currentOutstanding: 'desc' },
        take: 30
      }),
      this.prisma.wholesaleSalesOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50
      }),
      this.prisma.purchaseOrder.findMany({
        where: { organizationId },
        include: { supplier: true },
        orderBy: { createdAt: 'desc' },
        take: 50
      })
    ]);

    // 1. Top Performing Products
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

    // 2. Revenue Trend (Last 7 Days)
    const trendMap: Record<string, { label: string; revenue: number; count: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      trendMap[key] = { label, revenue: 0, count: 0 };
    }

    for (const inv of invoices) {
      const invKey = new Date(inv.createdAt).toISOString().split('T')[0];
      if (trendMap[invKey]) {
        trendMap[invKey].revenue += inv.grandTotal;
        trendMap[invKey].count += 1;
      }
    }
    const revenueTrend = Object.entries(trendMap).map(([date, val]) => ({
      date,
      label: val.label,
      revenue: Math.round(val.revenue * 100) / 100,
      count: val.count
    }));

    // 3. Invoice Status Breakdown
    const invoiceStatusBreakdown: Record<string, number> = {
      PAID: 0,
      PARTIALLY_PAID: 0,
      UNPAID: 0,
      OVERDUE: 0
    };
    for (const inv of invoices) {
      if (invoiceStatusBreakdown[inv.status] !== undefined) {
        invoiceStatusBreakdown[inv.status] += 1;
      } else {
        invoiceStatusBreakdown[inv.status] = 1;
      }
    }

    // 4. Sales Order Status Breakdown
    const salesOrderStatusBreakdown: Record<string, number> = {
      ORDER_PLACED: 0,
      CONFIRMED: 0,
      READY_FOR_DISPATCH: 0,
      PARTIALLY_DISPATCHED: 0,
      DISPATCHED: 0,
      INVOICED: 0,
      CANCELLED: 0
    };
    for (const so of salesOrders) {
      if (salesOrderStatusBreakdown[so.status] !== undefined) {
        salesOrderStatusBreakdown[so.status] += 1;
      } else {
        salesOrderStatusBreakdown[so.status] = 1;
      }
    }

    // 5. Receivables Ageing
    const nowMs = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const ageing = {
      current0to30: 0,
      days31to60: 0,
      days61to90: 0,
      daysAbove90: 0,
      total: 0
    };

    for (const cust of customers) {
      ageing.total += cust.currentOutstanding;
      for (const inv of cust.invoices) {
        const age = Math.floor((nowMs - new Date(inv.createdAt).getTime()) / dayMs);
        if (age <= 30) ageing.current0to30 += inv.balanceAmount;
        else if (age <= 60) ageing.days31to60 += inv.balanceAmount;
        else if (age <= 90) ageing.days61to90 += inv.balanceAmount;
        else ageing.daysAbove90 += inv.balanceAmount;
      }
    }

    // 6. Supplier Purchases & Top Vendors
    const supplierPurchasesMap: Record<string, { name: string; totalPurchases: number; poCount: number }> = {};
    let totalSupplierPayables = 0;
    for (const po of purchaseOrders) {
      totalSupplierPayables += po.grandTotal;
      const sName = po.supplierName || (po.supplier ? po.supplier.name : 'Primary Supplier');
      if (!supplierPurchasesMap[sName]) {
        supplierPurchasesMap[sName] = { name: sName, totalPurchases: 0, poCount: 0 };
      }
      supplierPurchasesMap[sName].totalPurchases += po.grandTotal;
      supplierPurchasesMap[sName].poCount += 1;
    }
    const topSuppliers = Object.values(supplierPurchasesMap)
      .sort((a, b) => b.totalPurchases - a.totalPurchases)
      .slice(0, 10);

    return {
      topSellingProducts,
      revenueTrend,
      invoiceStatusBreakdown,
      salesOrderStatusBreakdown,
      receivablesAgeing: {
        current0to30: Math.round(ageing.current0to30 * 100) / 100,
        days31to60: Math.round(ageing.days31to60 * 100) / 100,
        days61to90: Math.round(ageing.days61to90 * 100) / 100,
        daysAbove90: Math.round(ageing.daysAbove90 * 100) / 100,
        total: Math.round(ageing.total * 100) / 100
      },
      topSuppliers,
      supplierPurchases: {
        totalPayables: Math.round(totalSupplierPayables * 100) / 100,
        poCount: purchaseOrders.length,
        topSuppliers
      },
      recentInvoices: invoices.slice(0, 15),
      lowStockProducts: products.filter(p => p.currentStock <= 10),
      lowStockItems: products.filter(p => p.currentStock <= 10),
      recentShifts: shifts,
      outstandingCustomers: customers
    };
  }

  async getAuditLogs(organizationId: string, query: {
    branchId?: string;
    userId?: string;
    action?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
  }) {
    const where: any = { organizationId };
    if (query.branchId && query.branchId !== 'ALL') where.branchId = query.branchId;
    if (query.userId) where.userId = query.userId;
    if (query.action) where.action = { contains: query.action, mode: 'insensitive' };
    if (query.fromDate && query.toDate) {
      where.createdAt = { gte: new Date(query.fromDate), lte: new Date(query.toDate) };
    }

    const limit = query.limit || 50;
    const [logs, totalCount] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit
      }),
      this.prisma.auditLog.count({ where })
    ]);

    return { logs, totalCount };
  }
}
