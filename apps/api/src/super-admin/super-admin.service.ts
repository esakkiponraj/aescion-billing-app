import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { EventsGateway } from '../realtime/events.gateway';
import { PresenceService } from '../realtime/presence.service';
import { RoleType } from '@aescion/shared-types';

@Injectable()
export class SuperAdminService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private eventsGateway: EventsGateway,
    private presenceService: PresenceService
  ) {}

  /**
   * Authoritative platform-wide key metrics combining DB counts and Live Presence
   */
  async getPlatformStats() {
    const [
      totalCompanies,
      organizations,
      totalUsers,
      totalBranches,
      totalQuotations,
      totalInvoices,
      invoices,
      totalReceipts,
      totalPayments,
      customers
    ] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.organization.findMany({
        include: {
          memberships: {
            where: { role: { roleType: RoleType.OWNER } },
            include: { user: true }
          }
        }
      }),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.branch.count({ where: { isActive: true } }),
      this.prisma.quotation.count(),
      this.prisma.invoice.count(),
      this.prisma.invoice.findMany({
        where: { status: { not: 'CANCELLED' } },
        select: { grandTotal: true, status: true, paidAmount: true, balanceAmount: true }
      }),
      this.prisma.receipt.count(),
      this.prisma.payment.count(),
      this.prisma.customer.findMany({
        select: { currentOutstanding: true }
      })
    ]);

    let activeCompanies = 0;
    let suspendedCompanies = 0;
    let totalOwners = 0;

    for (const org of organizations) {
      const ownerMembership = org.memberships.find((m) => m.isActive);
      if (ownerMembership) {
        activeCompanies++;
      } else if (org.memberships.length > 0) {
        suspendedCompanies++;
      } else {
        activeCompanies++;
      }
      totalOwners += org.memberships.length;
    }

    const totalPlatformRevenue = invoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
    const totalReceivables = customers.reduce((sum, c) => sum + (Number(c.currentOutstanding) || 0), 0);

    const recentRegistrations = await this.prisma.organization.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        branches: true,
        memberships: {
          where: { role: { roleType: RoleType.OWNER } },
          include: { user: true }
        }
      }
    });

    const recentOrgsMapped = recentRegistrations.map((org) => {
      const owner = org.memberships[0]?.user;
      return {
        id: org.id,
        name: org.name,
        businessType: org.businessType,
        ownerName: owner ? `${owner.firstName} ${owner.lastName}` : 'No Owner',
        ownerEmail: owner?.email || org.email,
        branchesCount: org.branches.length,
        createdAt: org.createdAt
      };
    });

    // Real authenticated presence metrics
    const presenceSnapshot = this.presenceService.getPresenceSnapshot();
    const onlineOwners = presenceSnapshot.onlineOwnersCount;
    const desktopSessions = presenceSnapshot.desktopSessionsCount;
    const mobileSessions = presenceSnapshot.mobileSessionsCount;
    const offlineOwners = Math.max(0, totalOwners - onlineOwners);

    return {
      totalCompanies,
      activeCompanies,
      suspendedCompanies,
      totalOwners,
      onlineOwners,
      offlineOwners,
      desktopSessions,
      mobileSessions,
      totalUsers,
      totalBranches,
      totalQuotations,
      totalInvoices,
      totalReceipts,
      totalPayments,
      totalPlatformRevenue,
      totalReceivables,
      recentRegistrations: recentOrgsMapped
    };
  }

  /**
   * Live presence summary for Super Admin Dashboard
   */
  async getPresenceSummary() {
    return {
      onlineOwners: this.presenceService.getOnlineOwners(),
      snapshot: this.presenceService.getPresenceSnapshot()
    };
  }

  /**
   * Scoped active presence sessions for an individual company
   */
  async getCompanyPresence(orgId: string) {
    return this.presenceService.getCompanySessions(orgId);
  }

  /**
   * List all companies / tenants with search, filters, pagination, live presence, and summaries
   */
  async getCompanies(query: {
    search?: string;
    status?: string;
    businessType?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { legalName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        {
          memberships: {
            some: {
              user: {
                OR: [
                  { firstName: { contains: q, mode: 'insensitive' } },
                  { lastName: { contains: q, mode: 'insensitive' } },
                  { email: { contains: q, mode: 'insensitive' } }
                ]
              }
            }
          }
        }
      ];
    }

    if (query.businessType && query.businessType !== 'ALL') {
      where.businessType = query.businessType;
    }

    const totalCount = await this.prisma.organization.count({ where });
    const orgs = await this.prisma.organization.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        branches: true,
        memberships: {
          include: { user: true, role: true }
        },
        invoices: {
          where: { status: { not: 'CANCELLED' } },
          select: { grandTotal: true }
        },
        quotations: {
          select: { id: true }
        },
        receipts: {
          select: { id: true }
        },
        auditLogs: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true }
        }
      }
    });

    const onlineOwners = this.presenceService.getOnlineOwners();
    const onlineUserMap = new Map(onlineOwners.map((o) => [o.userId, o]));

    const companies = orgs.map((org) => {
      const ownerMembership = org.memberships.find((m) => m.role?.roleType === RoleType.OWNER);
      const owner = ownerMembership?.user;
      const isSuspended = org.memberships.length > 0 && org.memberships.every((m) => !m.isActive);
      const totalRevenue = org.invoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
      const lastActivity = org.auditLogs[0]?.createdAt || org.updatedAt || org.createdAt;

      // Presence for this company
      const presenceInfo = owner ? onlineUserMap.get(owner.id) : null;
      const isOnline = presenceInfo != null;
      const onlinePlatform = presenceInfo ? presenceInfo.platform : 'none';
      const activeSessions = presenceInfo ? presenceInfo.sessionsCount : 0;
      const lastSeen = presenceInfo?.lastSeen || (owner ? this.presenceService.getLastSeenForUser(owner.id) : null) || lastActivity;

      return {
        id: org.id,
        name: org.name,
        legalName: org.legalName,
        businessType: org.businessType,
        email: org.email || owner?.email,
        phone: org.phone || owner?.mobileNumber,
        ownerId: owner?.id,
        ownerName: owner ? `${owner.firstName} ${owner.lastName}` : 'Unassigned',
        ownerEmail: owner?.email,
        ownerUsername: owner?.username,
        branchesCount: org.branches.length,
        usersCount: org.memberships.length,
        totalRevenue,
        invoicesCount: org.invoices.length,
        quotationsCount: org.quotations.length,
        receiptsCount: org.receipts.length,
        status: isSuspended ? 'SUSPENDED' : 'ACTIVE',
        isOnline,
        onlinePlatform,
        activeSessions,
        lastSeen,
        lastActivity,
        createdAt: org.createdAt
      };
    });

    const filteredCompanies = query.status && query.status !== 'ALL'
      ? companies.filter((c) => c.status === query.status)
      : companies;

    return {
      data: filteredCompanies,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }

  /**
   * Full profile and metrics for an individual company
   */
  async getCompanyById(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        branches: true,
        businessSettings: true,
        taxSettings: true,
        documentSettings: true,
        memberships: {
          include: { user: true, role: true, branch: true }
        },
        _count: {
          select: {
            branches: true,
            products: true,
            customers: true,
            suppliers: true,
            invoices: true,
            quotations: true,
            receipts: true,
            payments: true,
            wholesaleOrders: true,
            auditLogs: true
          }
        }
      }
    });

    if (!org) {
      throw new NotFoundException(`Company with ID ${orgId} not found.`);
    }

    const ownerMembership = org.memberships.find((m) => m.role?.roleType === RoleType.OWNER);
    const owner = ownerMembership?.user;
    const isSuspended = org.memberships.length > 0 && org.memberships.every((m) => !m.isActive);

    const invoices = await this.prisma.invoice.findMany({
      where: { organizationId: orgId, status: { not: 'CANCELLED' } },
      select: { grandTotal: true, paidAmount: true, balanceAmount: true, status: true }
    });

    const totalRevenue = invoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0);
    const totalOutstanding = invoices.reduce((sum, inv) => sum + (Number(inv.balanceAmount) || 0), 0);

    const customers = await this.prisma.customer.findMany({
      where: { organizationId: orgId },
      select: { currentOutstanding: true }
    });
    const totalReceivables = customers.reduce((sum, c) => sum + (Number(c.currentOutstanding) || 0), 0);

    // Live presence sessions for this company
    const presence = this.presenceService.getCompanySessions(orgId);

    return {
      id: org.id,
      name: org.name,
      legalName: org.legalName,
      businessType: org.businessType,
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
      gstin: org.gstin,
      status: isSuspended ? 'SUSPENDED' : 'ACTIVE',
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
      owner: owner ? {
        id: owner.id,
        firstName: owner.firstName,
        lastName: owner.lastName,
        email: owner.email,
        username: owner.username,
        mobileNumber: owner.mobileNumber
      } : null,
      financials: {
        totalRevenue,
        totalPaid,
        totalOutstanding,
        totalReceivables,
        invoiceCount: org._count.invoices,
        quotationCount: org._count.quotations,
        receiptCount: org._count.receipts,
        paymentCount: org._count.payments,
        salesOrderCount: org._count.wholesaleOrders
      },
      counts: org._count,
      branches: org.branches,
      presence,
      settings: {
        business: org.businessSettings,
        tax: org.taxSettings,
        document: org.documentSettings
      }
    };
  }

  /**
   * Company Overview & Live Scoped Business Pulse
   */
  async getCompanyOverview(orgId: string) {
    const company = await this.getCompanyById(orgId);

    const recentInvoices = await this.prisma.invoice.findMany({
      where: { organizationId: orgId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { customer: true, branch: true }
    });

    const recentQuotations = await this.prisma.quotation.findMany({
      where: { organizationId: orgId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { customer: true, branch: true }
    });

    const lowStockProducts = await this.prisma.product.findMany({
      where: {
        organizationId: orgId,
        currentStock: { lte: 10 }
      },
      take: 10,
      orderBy: { currentStock: 'asc' }
    });

    return {
      company,
      recentInvoices,
      recentQuotations,
      lowStockProducts
    };
  }

  /**
   * Scoped Branches for a company
   */
  async getCompanyBranches(orgId: string) {
    return this.prisma.branch.findMany({
      where: { organizationId: orgId },
      include: {
        _count: {
          select: {
            memberships: true,
            invoices: true,
            quotations: true,
            stockLedgers: true
          }
        }
      },
      orderBy: { isMain: 'desc' }
    });
  }

  /**
   * Scoped Users/Staff for a company
   */
  async getCompanyUsers(orgId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            username: true,
            mobileNumber: true,
            isActive: true,
            createdAt: true
          }
        },
        role: true,
        branch: true
      },
      orderBy: { createdAt: 'asc' }
    });

    return memberships.map((m) => ({
      membershipId: m.id,
      userId: m.user.id,
      name: `${m.user.firstName} ${m.user.lastName}`,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      email: m.user.email,
      username: m.user.username,
      mobileNumber: m.user.mobileNumber,
      role: m.role?.name || 'STAFF',
      roleType: m.role?.roleType || 'CUSTOM',
      branchName: m.branch?.name || 'All Branches',
      branchId: m.branchId,
      isActive: m.isActive && m.user.isActive,
      joinedAt: m.createdAt
    }));
  }

  /**
   * Scoped Products for a company
   */
  async getCompanyProducts(orgId: string) {
    return this.prisma.product.findMany({
      where: { organizationId: orgId },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Scoped Customers for a company
   */
  async getCompanyCustomers(orgId: string) {
    return this.prisma.customer.findMany({
      where: { organizationId: orgId },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Scoped Suppliers for a company
   */
  async getCompanySuppliers(orgId: string) {
    return this.prisma.supplier.findMany({
      where: { organizationId: orgId },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Scoped Wholesale Sales Orders for a company
   */
  async getCompanySalesOrders(orgId: string) {
    return this.prisma.wholesaleSalesOrder.findMany({
      where: { organizationId: orgId },
      include: {
        customer: true,
        branch: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Scoped Delivery Challans / Dispatches for a company
   */
  async getCompanyDispatches(orgId: string) {
    return this.prisma.wholesaleSalesOrder.findMany({
      where: { organizationId: orgId },
      include: {
        customer: true,
        branch: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Scoped Quotations for a company
   */
  async getCompanyQuotations(orgId: string) {
    return this.prisma.quotation.findMany({
      where: { organizationId: orgId },
      include: {
        customer: true,
        branch: true,
        lines: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Scoped Invoices for a company
   */
  async getCompanyInvoices(orgId: string) {
    return this.prisma.invoice.findMany({
      where: { organizationId: orgId },
      include: {
        customer: true,
        branch: true,
        lines: true,
        payments: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Scoped Receipts for a company
   */
  async getCompanyReceipts(orgId: string) {
    return this.prisma.receipt.findMany({
      where: { organizationId: orgId },
      include: {
        branch: true,
        invoice: {
          include: { customer: true }
        }
      },
      orderBy: { issuedAt: 'desc' }
    });
  }

  /**
   * Scoped Payments for a company
   */
  async getCompanyPayments(orgId: string) {
    return this.prisma.payment.findMany({
      where: { organizationId: orgId },
      include: {
        invoice: true,
        branch: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Scoped Visual Reports for a company
   */
  async getCompanyReports(orgId: string) {
    const [invoices, products, customers] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { organizationId: orgId, status: { not: 'CANCELLED' } },
        include: { lines: true, payments: true }
      }),
      this.prisma.product.findMany({
        where: { organizationId: orgId }
      }),
      this.prisma.customer.findMany({
        where: { organizationId: orgId }
      })
    ]);

    const paymentMethods: Record<string, number> = { CASH: 0, UPI: 0, CARD: 0, BANK_TRANSFER: 0, CREDIT: 0 };
    invoices.forEach((inv) => {
      inv.payments.forEach((p) => {
        paymentMethods[p.method] = (paymentMethods[p.method] || 0) + Number(p.amount);
      });
    });

    const last7Days: { date: string; label: string; revenue: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayInvoices = invoices.filter((inv) => inv.createdAt.toISOString().split('T')[0] === dateStr);
      const dayRev = dayInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
      last7Days.push({
        date: dateStr,
        label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        revenue: dayRev,
        count: dayInvoices.length
      });
    }

    const itemSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    invoices.forEach((inv) => {
      inv.lines.forEach((line) => {
        const pKey = line.productId || line.id;
        if (!itemSales[pKey]) {
          itemSales[pKey] = { name: line.name, quantity: 0, revenue: 0 };
        }
        itemSales[pKey].quantity += Number(line.quantity);
        itemSales[pKey].revenue += Number(line.lineTotal);
      });
    });

    const topSellingProducts = Object.values(itemSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const receivables = {
      current: 0,
      days30: 0,
      days60: 0,
      days90Plus: 0
    };

    customers.forEach((c) => {
      const bal = Number(c.currentOutstanding) || 0;
      if (bal > 0) receivables.current += bal;
    });

    return {
      last7Days,
      paymentMethods,
      topSellingProducts,
      receivables,
      totalCatalogItems: products.length,
      totalCustomers: customers.length
    };
  }

  /**
   * Scoped Audit Logs for a company
   */
  async getCompanyAuditLogs(orgId: string, params?: {
    module?: string;
    action?: string;
    userId?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
  }) {
    const where: any = { organizationId: orgId };

    if (params?.action && params.action !== 'ALL') where.action = params.action;
    if (params?.module && params.module !== 'ALL') where.entityType = params.module;
    if (params?.userId && params.userId !== 'ALL') where.userId = params.userId;

    if (params?.fromDate || params?.toDate) {
      where.createdAt = {};
      if (params.fromDate) where.createdAt.gte = new Date(params.fromDate);
      if (params.toDate) where.createdAt.lte = new Date(params.toDate);
    }

    return this.prisma.auditLog.findMany({
      where,
      take: params?.limit || 50,
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Super Admin Company Status Update (Activate / Suspend) with Audit Trail
   */
  async updateCompanyStatus(
    orgId: string,
    active: boolean,
    adminUserId: string,
    adminUserName: string,
    reason?: string
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId }
    });

    if (!org) {
      throw new NotFoundException(`Company with ID ${orgId} not found.`);
    }

    await this.prisma.membership.updateMany({
      where: { organizationId: orgId },
      data: { isActive: active }
    });

    const action = active ? 'COMPANY_ACTIVATED_BY_SUPERADMIN' : 'COMPANY_SUSPENDED_BY_SUPERADMIN';

    await this.auditService.log({
      organizationId: orgId,
      userId: adminUserId,
      userName: adminUserName,
      action,
      entityType: 'ORGANIZATION',
      entityId: orgId,
      details: {
        status: active ? 'ACTIVE' : 'SUSPENDED',
        reason: reason || (active ? 'Reactivated by Platform Super Admin' : 'Suspended by Platform Super Admin'),
        timestamp: new Date().toISOString()
      }
    });

    this.eventsGateway.server?.to(`org_${orgId}`).emit('company_status_updated', {
      organizationId: orgId,
      status: active ? 'ACTIVE' : 'SUSPENDED'
    });

    this.eventsGateway.server?.to('platform_super_admin').emit('platform_company_status_updated', {
      organizationId: orgId,
      companyName: org.name,
      status: active ? 'ACTIVE' : 'SUSPENDED',
      updatedBy: adminUserName
    });

    return {
      success: true,
      organizationId: orgId,
      status: active ? 'ACTIVE' : 'SUSPENDED',
      message: `Company ${org.name} has been ${active ? 'activated' : 'suspended'}.`
    };
  }

  /**
   * Platform-wide Live Activity Feed across all tenants
   */
  async getPlatformActivityFeed(limit = 50) {
    const logs = await this.prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        organization: { select: { id: true, name: true, businessType: true } }
      }
    });

    return logs.map((log) => ({
      id: log.id,
      timestamp: log.createdAt,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      userName: log.userName,
      userId: log.userId,
      companyId: log.organizationId,
      companyName: log.organization?.name || 'Platform',
      businessType: log.organization?.businessType,
      branchId: log.branchId,
      details: log.details
    }));
  }

  /**
   * Platform Reports & Analytics
   */
  async getPlatformReports() {
    const [organizations, invoices, users] = await Promise.all([
      this.prisma.organization.findMany({
        include: {
          invoices: {
            where: { status: { not: 'CANCELLED' } },
            select: { grandTotal: true, createdAt: true }
          }
        }
      }),
      this.prisma.invoice.findMany({
        where: { status: { not: 'CANCELLED' } },
        include: { organization: true, payments: true }
      }),
      this.prisma.user.findMany({
        select: { id: true, createdAt: true }
      })
    ]);

    const businessTypeDistribution: Record<string, number> = {};
    organizations.forEach((org) => {
      businessTypeDistribution[org.businessType] = (businessTypeDistribution[org.businessType] || 0) + 1;
    });

    const companyRevenueList = organizations.map((org) => {
      const revenue = org.invoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
      return {
        id: org.id,
        name: org.name,
        businessType: org.businessType,
        revenue,
        invoiceCount: org.invoices.length
      };
    }).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    const last7Days: { date: string; label: string; revenue: number; invoiceCount: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayInvoices = invoices.filter((inv) => inv.createdAt.toISOString().split('T')[0] === dateStr);
      const revenue = dayInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
      last7Days.push({
        date: dateStr,
        label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        revenue,
        invoiceCount: dayInvoices.length
      });
    }

    const platformPaymentMethods: Record<string, number> = { CASH: 0, UPI: 0, CARD: 0, BANK_TRANSFER: 0, CREDIT: 0 };
    invoices.forEach((inv) => {
      inv.payments.forEach((p) => {
        platformPaymentMethods[p.method] = (platformPaymentMethods[p.method] || 0) + Number(p.amount);
      });
    });

    return {
      businessTypeDistribution,
      topCompanies: companyRevenueList,
      last7Days,
      platformPaymentMethods,
      totalPlatformRevenue: invoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0),
      totalCompaniesCount: organizations.length,
      totalUsersCount: users.length
    };
  }

  /**
   * Platform Audit Logs with filtering
   */
  async getPlatformAuditLogs(params?: {
    organizationId?: string;
    action?: string;
    entityType?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
  }) {
    const where: any = {};
    if (params?.organizationId && params.organizationId !== 'ALL') where.organizationId = params.organizationId;
    if (params?.action && params.action !== 'ALL') where.action = params.action;
    if (params?.entityType && params.entityType !== 'ALL') where.entityType = params.entityType;

    if (params?.fromDate || params?.toDate) {
      where.createdAt = {};
      if (params.fromDate) where.createdAt.gte = new Date(params.fromDate);
      if (params.toDate) where.createdAt.lte = new Date(params.toDate);
    }

    return this.prisma.auditLog.findMany({
      where,
      take: params?.limit || 100,
      orderBy: { createdAt: 'desc' },
      include: {
        organization: { select: { id: true, name: true, businessType: true } }
      }
    });
  }
}
