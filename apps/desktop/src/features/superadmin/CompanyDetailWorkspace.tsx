import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  Store,
  Package,
  FileText,
  FileSpreadsheet,
  Receipt,
  DollarSign,
  TrendingUp,
  Clock,
  ShieldCheck,
  AlertTriangle,
  ChevronLeft,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertCircle,
  Truck,
  UserCheck,
  CreditCard,
  History,
  BarChart3,
  Monitor,
  Smartphone,
  Laptop,
  Radio
} from 'lucide-react';
import { ApiClient } from '../../services/api';
import { getSocket } from '../../services/socket';

export const CompanyDetailWorkspace: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'presence' | 'branches' | 'users' | 'products' | 'customers' | 'suppliers' | 'sales_orders' | 'quotations' | 'invoices' | 'receipts' | 'reports' | 'audit'
  >('overview');

  const [company, setCompany] = useState<any>(null);
  const [tabData, setTabData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchCompanyHeader = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await ApiClient.get<any>(`/super-admin/companies/${id}`);
      setCompany(data);
    } catch (err) {
      console.warn('Failed to load company details:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const fetchTabData = useCallback(async () => {
    if (!id) return;
    setIsTabLoading(true);
    try {
      let endpoint = `/super-admin/companies/${id}/overview`;
      if (activeTab === 'presence') endpoint = `/super-admin/companies/${id}/presence`;
      else if (activeTab === 'branches') endpoint = `/super-admin/companies/${id}/branches`;
      else if (activeTab === 'users') endpoint = `/super-admin/companies/${id}/users`;
      else if (activeTab === 'products') endpoint = `/super-admin/companies/${id}/products`;
      else if (activeTab === 'customers') endpoint = `/super-admin/companies/${id}/customers`;
      else if (activeTab === 'suppliers') endpoint = `/super-admin/companies/${id}/suppliers`;
      else if (activeTab === 'sales_orders') endpoint = `/super-admin/companies/${id}/sales-orders`;
      else if (activeTab === 'quotations') endpoint = `/super-admin/companies/${id}/quotations`;
      else if (activeTab === 'invoices') endpoint = `/super-admin/companies/${id}/invoices`;
      else if (activeTab === 'receipts') endpoint = `/super-admin/companies/${id}/receipts`;
      else if (activeTab === 'reports') endpoint = `/super-admin/companies/${id}/reports`;
      else if (activeTab === 'audit') endpoint = `/super-admin/companies/${id}/audit-logs`;

      const data = await ApiClient.get<any>(endpoint);
      setTabData(data);
    } catch (err) {
      console.warn(`Failed to load tab data for ${activeTab}:`, err);
    } finally {
      setIsTabLoading(false);
    }
  }, [id, activeTab]);

  useEffect(() => {
    fetchCompanyHeader();
  }, [fetchCompanyHeader]);

  useEffect(() => {
    fetchTabData();
  }, [fetchTabData]);

  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      const handleLiveUpdate = () => {
        fetchCompanyHeader();
        fetchTabData();
      };

      socket.on('presence_updated', handleLiveUpdate);
      socket.on('tenant_presence_updated', handleLiveUpdate);
      socket.on('platform_invoice_created', handleLiveUpdate);
      socket.on('platform_quotation_updated', handleLiveUpdate);
      socket.on('platform_payment_created', handleLiveUpdate);
      socket.on('platform_company_status_updated', handleLiveUpdate);

      return () => {
        socket.off('presence_updated', handleLiveUpdate);
        socket.off('tenant_presence_updated', handleLiveUpdate);
        socket.off('platform_invoice_created', handleLiveUpdate);
        socket.off('platform_quotation_updated', handleLiveUpdate);
        socket.off('platform_payment_created', handleLiveUpdate);
        socket.off('platform_company_status_updated', handleLiveUpdate);
      };
    }
  }, [fetchCompanyHeader, fetchTabData]);

  const handleToggleStatus = async () => {
    if (!company) return;
    const isActivating = company.status === 'SUSPENDED';
    const confirmMsg = isActivating
      ? `Activate ${company.name}?`
      : `Suspend ${company.name}? Staff accounts will be temporarily locked.`;

    if (!window.confirm(confirmMsg)) return;

    setIsUpdatingStatus(true);
    try {
      await ApiClient.patch(`/super-admin/companies/${id}/status`, {
        active: isActivating,
        reason: isActivating ? 'Reactivated by Platform Super Admin' : 'Suspended by Platform Super Admin'
      });
      fetchCompanyHeader();
    } catch (err: any) {
      alert(err.message || 'Failed to update company status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading || !company) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-500">Loading scoped company workspace...</span>
      </div>
    );
  }

  const isSuspended = company.status === 'SUSPENDED';
  const fin = company.financials || {};
  const isOnline = company.presence?.status === 'ONLINE';
  const activeSessions = company.presence?.activeSessionsCount || 0;

  const tabs: { id: typeof activeTab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview & Pulse', icon: Building2 },
    { id: 'presence', label: `Presence (${activeSessions} Sessions)`, icon: Radio },
    { id: 'invoices', label: `Invoices (${fin.invoiceCount || 0})`, icon: FileText },
    { id: 'quotations', label: `Quotations (${fin.quotationCount || 0})`, icon: FileSpreadsheet },
    { id: 'receipts', label: `Receipts (${fin.receiptCount || 0})`, icon: Receipt },
    { id: 'branches', label: `Branches (${company.counts?.branches || 0})`, icon: Store },
    { id: 'users', label: `Staff (${company.counts?.memberships || 0})`, icon: Users },
    { id: 'products', label: `Products (${company.counts?.products || 0})`, icon: Package },
    { id: 'customers', label: `Customers (${company.counts?.customers || 0})`, icon: UserCheck },
    { id: 'suppliers', label: `Suppliers (${company.counts?.suppliers || 0})`, icon: Truck },
    { id: 'sales_orders', label: `Sales Orders (${fin.salesOrderCount || 0})`, icon: FileSpreadsheet },
    { id: 'reports', label: 'Visual Reports', icon: BarChart3 },
    { id: 'audit', label: `Audit Trail (${company.counts?.auditLogs || 0})`, icon: History }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/super-admin/companies')}
          className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>&larr; Back to Companies Directory</span>
        </button>

        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-mono text-slate-400">Tenant ID: {company.id}</span>
          <button
            onClick={() => {
              fetchCompanyHeader();
              fetchTabData();
            }}
            className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Tenant Context Hero Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-bold text-lg flex items-center justify-center shadow-xs">
              {company.name.substring(0, 1).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-xl font-bold text-slate-900">{company.name}</h1>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center space-x-1 ${
                    isSuspended
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isSuspended ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                  <span>{company.status}</span>
                </span>
                <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  {company.businessType?.replace('_', ' ')}
                </span>
                {isOnline ? (
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE ONLINE ({activeSessions} {activeSessions === 1 ? 'Session' : 'Sessions'})
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-medium rounded-full">
                    Offline
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {company.legalName || 'Registered Enterprise'} • Registered {new Date(company.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              disabled={isUpdatingStatus}
              onClick={handleToggleStatus}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                isSuspended
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
              }`}
            >
              {isUpdatingStatus ? 'Updating...' : isSuspended ? 'Reactivate Company' : 'Suspend Company'}
            </button>
          </div>
        </div>

        {/* Owner Info & Contact Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Owner</span>
            <div className="font-semibold text-slate-800">{company.owner?.firstName} {company.owner?.lastName || 'N/A'}</div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Owner Email</span>
            <div className="font-mono text-slate-700 text-[11px]">{company.owner?.email || company.email || 'N/A'}</div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Phone</span>
            <div className="font-mono text-slate-700 text-[11px]">{company.phone || company.owner?.mobileNumber || 'N/A'}</div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Currency / Region</span>
            <div className="font-semibold text-slate-800">{company.currency} • {company.country}</div>
          </div>
        </div>
      </div>

      {/* Scoped Business KPIs Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Total Revenue</div>
          <div className="text-xl font-bold text-slate-900 mt-1">₹{(fin.totalRevenue || 0).toLocaleString('en-IN')}</div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Authoritative Invoiced</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Collected</div>
          <div className="text-xl font-bold text-slate-900 mt-1">₹{(fin.totalPaid || 0).toLocaleString('en-IN')}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Direct & POS Receipts</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Outstanding Invoices</div>
          <div className="text-xl font-bold text-amber-600 mt-1">₹{(fin.totalOutstanding || 0).toLocaleString('en-IN')}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Unsettled Balance</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Customer Receivables</div>
          <div className="text-xl font-bold text-blue-600 mt-1">₹{(fin.totalReceivables || 0).toLocaleString('en-IN')}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Ledger Balances</div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 flex space-x-1 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-1.5 px-3.5 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Container */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs min-h-[300px]">
        {isTabLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-400">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Loading scoped {activeTab.replace('_', ' ')}...</span>
          </div>
        ) : !tabData ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No data found for this module.
          </div>
        ) : (
          <div>
            {/* 1. OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Recent Invoices */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Recent Invoices</h3>
                      <button
                        onClick={() => setActiveTab('invoices')}
                        className="text-[11px] font-semibold text-blue-600 hover:underline"
                      >
                        View All
                      </button>
                    </div>

                    <div className="space-y-2">
                      {tabData.recentInvoices?.length === 0 ? (
                        <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400">No invoices yet</div>
                      ) : (
                        tabData.recentInvoices?.map((inv: any) => (
                          <div key={inv.id} className="p-3 bg-slate-50/80 rounded-xl flex items-center justify-between text-xs">
                            <div>
                              <div className="font-bold text-slate-800">{inv.invoiceNumber}</div>
                              <div className="text-[10px] text-slate-500">{inv.customerName || 'Walk-in'} • {new Date(inv.createdAt).toLocaleDateString()}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-slate-900">₹{Number(inv.grandTotal).toLocaleString('en-IN')}</div>
                              <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-semibold">{inv.status}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Recent Quotations */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Recent Quotations</h3>
                      <button
                        onClick={() => setActiveTab('quotations')}
                        className="text-[11px] font-semibold text-blue-600 hover:underline"
                      >
                        View All
                      </button>
                    </div>

                    <div className="space-y-2">
                      {tabData.recentQuotations?.length === 0 ? (
                        <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400">No quotations yet</div>
                      ) : (
                        tabData.recentQuotations?.map((qtn: any) => (
                          <div key={qtn.id} className="p-3 bg-slate-50/80 rounded-xl flex items-center justify-between text-xs">
                            <div>
                              <div className="font-bold text-slate-800">{qtn.quotationNumber}</div>
                              <div className="text-[10px] text-slate-500">{qtn.customerName} • {new Date(qtn.createdAt).toLocaleDateString()}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-slate-900">₹{Number(qtn.grandTotal).toLocaleString('en-IN')}</div>
                              <span className="text-[10px] px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded font-semibold">{qtn.status}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. PRESENCE & SESSIONS TAB */}
            {activeTab === 'presence' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Active Realtime Device Sessions</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Live authenticated WebSocket connections for {company.name}
                    </p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                    tabData.status === 'ONLINE' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {tabData.status === 'ONLINE' ? `ONLINE (${tabData.activeSessionsCount} ACTIVE)` : 'CURRENTLY OFFLINE'}
                  </span>
                </div>

                {tabData.sessions?.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                    No active sessions currently connected. When staff or the owner log in on Desktop or Mobile, their sessions will appear here live.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tabData.sessions?.map((sess: any, index: number) => (
                      <div key={index} className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {sess.platform === 'desktop' ? (
                              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                <Monitor className="w-4 h-4" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                                <Smartphone className="w-4 h-4" />
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-slate-900 text-xs">{sess.userName}</div>
                              <div className="text-[10px] text-slate-500">{sess.roleType} • {sess.platform?.toUpperCase()}</div>
                            </div>
                          </div>

                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Connected
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-100">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Connected At</span>
                            <div className="font-semibold text-slate-700">{new Date(sess.connectedAt).toLocaleTimeString()}</div>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Last Heartbeat</span>
                            <div className="font-semibold text-slate-700">{new Date(sess.lastSeen).toLocaleTimeString()}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. INVOICES TAB */}
            {activeTab === 'invoices' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Invoice #</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 text-right">Grand Total</th>
                      <th className="py-2.5 px-3 text-right">Balance</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Array.isArray(tabData) && tabData.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{inv.invoiceNumber}</td>
                        <td className="py-2.5 px-3">{inv.customerName || 'Walk-in'}</td>
                        <td className="py-2.5 px-3 text-slate-500">{new Date(inv.createdAt).toLocaleDateString()}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">₹{Number(inv.grandTotal).toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3 text-right text-amber-600 font-semibold">₹{Number(inv.balanceAmount || 0).toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full">
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. QUOTATIONS TAB */}
            {activeTab === 'quotations' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Quotation #</th>
                      <th className="py-2.5 px-3">Client</th>
                      <th className="py-2.5 px-3">Items</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Array.isArray(tabData) && tabData.map((q: any) => (
                      <tr key={q.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{q.quotationNumber}</td>
                        <td className="py-2.5 px-3 font-medium">{q.customerName}</td>
                        <td className="py-2.5 px-3 text-slate-500">{q.lines?.length || 0} lines</td>
                        <td className="py-2.5 px-3 text-slate-500">{new Date(q.createdAt).toLocaleDateString()}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">₹{Number(q.grandTotal).toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-full">
                            {q.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 5. RECEIPTS TAB */}
            {activeTab === 'receipts' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Receipt #</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 text-right">Amount Collected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Array.isArray(tabData) && tabData.map((rcp: any) => (
                      <tr key={rcp.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{rcp.receiptNumber}</td>
                        <td className="py-2.5 px-3">{rcp.customerName || 'Customer'}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700">{rcp.paymentMethod}</td>
                        <td className="py-2.5 px-3 text-slate-500">{new Date(rcp.issuedAt || rcp.createdAt).toLocaleDateString()}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600">₹{Number(rcp.amountPaid).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 6. USERS / STAFF TAB */}
            {activeTab === 'users' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Staff Name</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Branch</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Array.isArray(tabData) && tabData.map((u: any) => (
                      <tr key={u.userId} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{u.name}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{u.email}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700">{u.role}</td>
                        <td className="py-2.5 px-3 text-slate-500">{u.branchName}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${u.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                            {u.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 7. PRODUCTS TAB */}
            {activeTab === 'products' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-right">Price</th>
                      <th className="py-2.5 px-3 text-right">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Array.isArray(tabData) && tabData.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{p.name}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{p.sku}</td>
                        <td className="py-2.5 px-3">{p.category || 'General'}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">₹{Number(p.sellingPrice).toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-700">{p.currentStock} {p.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 8. CUSTOMERS TAB */}
            {activeTab === 'customers' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Customer Name</th>
                      <th className="py-2.5 px-3">Phone</th>
                      <th className="py-2.5 px-3">Credit Limit</th>
                      <th className="py-2.5 px-3 text-right">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Array.isArray(tabData) && tabData.map((c: any) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{c.name}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{c.phone || 'N/A'}</td>
                        <td className="py-2.5 px-3">₹{Number(c.creditLimit || 0).toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-amber-600">₹{Number(c.currentOutstanding || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 9. OTHER TABS (BRANCHES, SUPPLIERS, SALES ORDERS, REPORTS, AUDIT) */}
            {activeTab === 'branches' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.isArray(tabData) && tabData.map((b: any) => (
                  <div key={b.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{b.name}</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded">{b.code}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{b.address || 'Standard Location'}</div>
                    <div className="mt-3 text-[11px] text-slate-600 flex items-center gap-4">
                      <span>Staff: {b._count?.memberships || 0}</span>
                      <span>Invoices: {b._count?.invoices || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'audit' && (
              <div className="space-y-2">
                {Array.isArray(tabData) && tabData.map((log: any) => (
                  <div key={log.id} className="p-3 bg-slate-50/80 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-800">{log.action} • {log.userName}</div>
                      <div className="text-[10px] text-slate-500">Module: {log.entityType}</div>
                    </div>
                    <div className="text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
