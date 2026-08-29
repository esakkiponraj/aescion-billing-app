import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../store/authContext';
import { Permission } from '@aescion/capability-config';
import { BusinessType, RoleType } from '@aescion/shared-types';

// Tenant Workspace Shell & Features
import { WorkspaceShell } from '../components/layout/WorkspaceShell';
import { DashboardPulse } from '../features/dashboard/DashboardPulse';
import { FastBillingPOS } from '../features/pos/FastBillingPOS';
import { ProductsCatalog } from '../features/products/ProductsCatalog';
import { StockLedgerView } from '../features/inventory/StockLedgerView';
import { InvoicesList } from '../features/billing/InvoicesList';
import { QuotationsList } from '../features/billing/QuotationsList';
import { ReceiptsView } from '../features/billing/ReceiptsView';
import { CustomersView } from '../features/customers/CustomersView';
import { TableFloorGrid } from '../features/restaurant/TableFloorGrid';
import { KitchenKOTScreen } from '../features/restaurant/KitchenKOTScreen';
import { JobCardsView } from '../features/service/JobCardsView';
import { PharmacyView } from '../features/pharmacy/PharmacyView';
import { SupermarketShiftsView } from '../features/supermarket/SupermarketShiftsView';
import { WholesaleOrdersView } from '../features/wholesale/WholesaleOrdersView';
import { SuppliersView } from '../features/suppliers/SuppliersView';
import { TeamView } from '../features/team/TeamView';
import { RolesView } from '../features/team/RolesView';
import { BranchesView } from '../features/branches/BranchesView';
import { ReportsView } from '../features/reports/ReportsView';
import { SettingsView } from '../features/settings/SettingsView';

// Platform Super Admin Shell & Features
import { SuperAdminShell } from '../features/superadmin/SuperAdminShell';
import { PlatformDashboard } from '../features/superadmin/PlatformDashboard';
import { CompaniesDirectory } from '../features/superadmin/CompaniesDirectory';
import { CompanyDetailWorkspace } from '../features/superadmin/CompanyDetailWorkspace';
import { PlatformActivityFeed } from '../features/superadmin/PlatformActivityFeed';
import { PlatformReports } from '../features/superadmin/PlatformReports';
import { SystemAuditLogs } from '../features/superadmin/SystemAuditLogs';

interface ProtectedRouteProps {
  element: React.ReactElement;
  requiredPermissions?: Permission[];
  requiredIndustry?: BusinessType;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  element,
  requiredPermissions,
  requiredIndustry
}) => {
  const { organization, activeRole, permissions } = useAuth();
  const roleType = (activeRole?.roleType as RoleType) || RoleType.OWNER;
  const isOwner = roleType === RoleType.OWNER;

  // 1. Industry check
  if (requiredIndustry && organization?.businessType !== requiredIndustry) {
    return <Navigate to="/dashboard" replace />;
  }

  // 2. Permission check (Owner bypasses)
  if (!isOwner && requiredPermissions && requiredPermissions.length > 0) {
    const hasPermission = requiredPermissions.some((p) => permissions.includes(p));
    if (!hasPermission) {
      // Role-specific fallback
      if (roleType === RoleType.KITCHEN) {
        return <Navigate to="/restaurant/kitchen" replace />;
      }
      if (roleType === RoleType.WAITER) {
        return <Navigate to="/restaurant/tables" replace />;
      }
      return <Navigate to="/dashboard" replace />;
    }
  }

  return element;
};

export const AppRoutes: React.FC = () => {
  const { isSuperAdmin, activeRole, organization } = useAuth();
  const roleType = (activeRole?.roleType as RoleType) || RoleType.OWNER;

  // 1. Super Admin Role routes
  if (isSuperAdmin) {
    return (
      <SuperAdminShell>
        <Routes>
          <Route path="/" element={<Navigate to="/super-admin" replace />} />
          <Route path="/super-admin" element={<PlatformDashboard />} />
          <Route path="/super-admin/companies" element={<CompaniesDirectory />} />
          <Route path="/super-admin/companies/:id" element={<CompanyDetailWorkspace />} />
          <Route path="/super-admin/activity" element={<PlatformActivityFeed />} />
          <Route path="/super-admin/reports" element={<PlatformReports />} />
          <Route path="/super-admin/audit" element={<SystemAuditLogs />} />
          <Route path="*" element={<Navigate to="/super-admin" replace />} />
        </Routes>
      </SuperAdminShell>
    );
  }

  // Determine role default home redirect
  const getDefaultHome = () => {
    if (organization?.businessType === BusinessType.RESTAURANT) {
      if (roleType === RoleType.KITCHEN) return '/restaurant/kitchen';
      if (roleType === RoleType.WAITER) return '/restaurant/tables';
    }
    return '/dashboard';
  };

  // 2. Tenant Owner / Staff routes
  return (
    <WorkspaceShell>
      <Routes>
        {/* Prevent access to Super Admin */}
        <Route path="/super-admin/*" element={<Navigate to={getDefaultHome()} replace />} />

        {/* Core & Operations */}
        <Route path="/" element={<Navigate to={getDefaultHome()} replace />} />
        <Route path="/dashboard" element={<DashboardPulse />} />
        <Route
          path="/pos"
          element={<ProtectedRoute element={<FastBillingPOS />} requiredPermissions={[Permission.POS_ACCESS]} />}
        />
        <Route
          path="/products"
          element={<ProtectedRoute element={<ProductsCatalog />} requiredPermissions={[Permission.PRODUCT_VIEW]} />}
        />
        <Route
          path="/inventory"
          element={<ProtectedRoute element={<StockLedgerView />} requiredPermissions={[Permission.STOCK_VIEW]} />}
        />

        {/* Billing & Documents */}
        <Route
          path="/quotations"
          element={<ProtectedRoute element={<QuotationsList />} requiredPermissions={[Permission.QUOTATION_VIEW]} />}
        />
        <Route
          path="/billing/quotations"
          element={<ProtectedRoute element={<QuotationsList />} requiredPermissions={[Permission.QUOTATION_VIEW]} />}
        />
        <Route
          path="/invoices"
          element={<ProtectedRoute element={<InvoicesList />} requiredPermissions={[Permission.INVOICE_VIEW]} />}
        />
        <Route
          path="/billing/invoices"
          element={<ProtectedRoute element={<InvoicesList />} requiredPermissions={[Permission.INVOICE_VIEW]} />}
        />
        <Route
          path="/receipts"
          element={<ProtectedRoute element={<ReceiptsView />} requiredPermissions={[Permission.INVOICE_VIEW, Permission.PAYMENT_COLLECT]} />}
        />
        <Route
          path="/billing/receipts"
          element={<ProtectedRoute element={<ReceiptsView />} requiredPermissions={[Permission.INVOICE_VIEW, Permission.PAYMENT_COLLECT]} />}
        />
        <Route
          path="/payments"
          element={<ProtectedRoute element={<ReceiptsView />} requiredPermissions={[Permission.PAYMENT_COLLECT, Permission.INVOICE_VIEW]} />}
        />

        {/* Management */}
        <Route
          path="/customers"
          element={<ProtectedRoute element={<CustomersView />} requiredPermissions={[Permission.CUSTOMER_VIEW]} />}
        />
        <Route
          path="/management/customers"
          element={<ProtectedRoute element={<CustomersView />} requiredPermissions={[Permission.CUSTOMER_VIEW]} />}
        />
        <Route
          path="/suppliers"
          element={<ProtectedRoute element={<SuppliersView />} requiredPermissions={[Permission.SUPPLIER_VIEW]} />}
        />
        <Route
          path="/management/suppliers"
          element={<ProtectedRoute element={<SuppliersView />} requiredPermissions={[Permission.SUPPLIER_VIEW]} />}
        />
        <Route
          path="/team"
          element={<ProtectedRoute element={<TeamView />} requiredPermissions={[Permission.USER_VIEW]} />}
        />
        <Route
          path="/management/team"
          element={<ProtectedRoute element={<TeamView />} requiredPermissions={[Permission.USER_VIEW]} />}
        />
        <Route
          path="/roles"
          element={<ProtectedRoute element={<RolesView />} requiredPermissions={[Permission.ROLE_VIEW]} />}
        />
        <Route
          path="/management/roles"
          element={<ProtectedRoute element={<RolesView />} requiredPermissions={[Permission.ROLE_VIEW]} />}
        />
        <Route
          path="/branches"
          element={<ProtectedRoute element={<BranchesView />} requiredPermissions={[Permission.BRANCH_VIEW]} />}
        />
        <Route
          path="/management/branches"
          element={<ProtectedRoute element={<BranchesView />} requiredPermissions={[Permission.BRANCH_VIEW]} />}
        />
        <Route
          path="/reports"
          element={<ProtectedRoute element={<ReportsView />} requiredPermissions={[Permission.REPORT_SALES, Permission.REPORT_FINANCIAL, Permission.REPORT_INVENTORY]} />}
        />
        <Route
          path="/management/reports"
          element={<ProtectedRoute element={<ReportsView />} requiredPermissions={[Permission.REPORT_SALES, Permission.REPORT_FINANCIAL, Permission.REPORT_INVENTORY]} />}
        />
        <Route
          path="/settings"
          element={<ProtectedRoute element={<SettingsView />} requiredPermissions={[Permission.ORG_UPDATE]} />}
        />
        <Route
          path="/management/settings"
          element={<ProtectedRoute element={<SettingsView />} requiredPermissions={[Permission.ORG_UPDATE]} />}
        />

        {/* Industry Operations */}
        <Route
          path="/supermarket/shifts"
          element={<ProtectedRoute element={<SupermarketShiftsView />} requiredIndustry={BusinessType.SUPERMARKET} requiredPermissions={[Permission.SHIFT_OPEN]} />}
        />
        <Route
          path="/restaurant/tables"
          element={<ProtectedRoute element={<TableFloorGrid />} requiredIndustry={BusinessType.RESTAURANT} requiredPermissions={[Permission.RESTAURANT_TABLES]} />}
        />
        <Route
          path="/restaurant/kitchen"
          element={<ProtectedRoute element={<KitchenKOTScreen />} requiredIndustry={BusinessType.RESTAURANT} requiredPermissions={[Permission.RESTAURANT_KITCHEN]} />}
        />
        <Route
          path="/service/jobs"
          element={<ProtectedRoute element={<JobCardsView />} requiredIndustry={BusinessType.SERVICE} requiredPermissions={[Permission.SERVICE_JOB_UPDATE]} />}
        />
        <Route
          path="/service/assets"
          element={<ProtectedRoute element={<JobCardsView />} requiredIndustry={BusinessType.SERVICE} requiredPermissions={[Permission.CUSTOMER_VIEW]} />}
        />
        <Route
          path="/pharmacy/medicines"
          element={<ProtectedRoute element={<PharmacyView />} requiredIndustry={BusinessType.PHARMACY} requiredPermissions={[Permission.PRODUCT_VIEW]} />}
        />
        <Route
          path="/pharmacy/expiry"
          element={<ProtectedRoute element={<PharmacyView />} requiredIndustry={BusinessType.PHARMACY} requiredPermissions={[Permission.STOCK_VIEW]} />}
        />
        <Route
          path="/wholesale/orders"
          element={<ProtectedRoute element={<WholesaleOrdersView />} requiredIndustry={BusinessType.WHOLESALE} requiredPermissions={[Permission.INVOICE_VIEW]} />}
        />
        <Route
          path="/wholesale/dispatch"
          element={<ProtectedRoute element={<WholesaleOrdersView />} requiredIndustry={BusinessType.WHOLESALE} requiredPermissions={[Permission.WHOLESALE_DISPATCH]} />}
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to={getDefaultHome()} replace />} />
      </Routes>
    </WorkspaceShell>
  );
};
