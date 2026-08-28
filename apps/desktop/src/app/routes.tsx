import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../store/authContext';

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

export const AppRoutes: React.FC = () => {
  const { isSuperAdmin } = useAuth();

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

  // 2. Tenant Owner / Staff routes
  return (
    <WorkspaceShell>
      <Routes>
        {/* Prevent access to Super Admin */}
        <Route path="/super-admin/*" element={<Navigate to="/dashboard" replace />} />

        {/* Core & Operations */}
        <Route path="/" element={<DashboardPulse />} />
        <Route path="/dashboard" element={<DashboardPulse />} />
        <Route path="/pos" element={<FastBillingPOS />} />
        <Route path="/products" element={<ProductsCatalog />} />
        <Route path="/inventory" element={<StockLedgerView />} />

        {/* Billing & Documents */}
        <Route path="/quotations" element={<QuotationsList />} />
        <Route path="/billing/quotations" element={<QuotationsList />} />
        <Route path="/invoices" element={<InvoicesList />} />
        <Route path="/billing/invoices" element={<InvoicesList />} />
        <Route path="/receipts" element={<ReceiptsView />} />
        <Route path="/billing/receipts" element={<ReceiptsView />} />
        <Route path="/payments" element={<ReceiptsView />} />

        {/* Management */}
        <Route path="/customers" element={<CustomersView />} />
        <Route path="/management/customers" element={<CustomersView />} />
        <Route path="/suppliers" element={<SuppliersView />} />
        <Route path="/management/suppliers" element={<SuppliersView />} />
        <Route path="/team" element={<TeamView />} />
        <Route path="/management/team" element={<TeamView />} />
        <Route path="/roles" element={<RolesView />} />
        <Route path="/management/roles" element={<RolesView />} />
        <Route path="/branches" element={<BranchesView />} />
        <Route path="/management/branches" element={<BranchesView />} />
        <Route path="/reports" element={<ReportsView />} />
        <Route path="/management/reports" element={<ReportsView />} />
        <Route path="/settings" element={<SettingsView />} />
        <Route path="/management/settings" element={<SettingsView />} />

        {/* Industry Operations */}
        <Route path="/supermarket/shifts" element={<SupermarketShiftsView />} />
        <Route path="/restaurant/tables" element={<TableFloorGrid />} />
        <Route path="/restaurant/kitchen" element={<KitchenKOTScreen />} />
        <Route path="/service/jobs" element={<JobCardsView />} />
        <Route path="/service/assets" element={<JobCardsView />} />
        <Route path="/pharmacy/medicines" element={<PharmacyView />} />
        <Route path="/pharmacy/expiry" element={<PharmacyView />} />
        <Route path="/wholesale/orders" element={<WholesaleOrdersView />} />
        <Route path="/wholesale/dispatch" element={<WholesaleOrdersView />} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </WorkspaceShell>
  );
};
