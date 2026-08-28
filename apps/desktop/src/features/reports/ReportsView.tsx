import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Package,
  AlertTriangle,
  Users,
  RefreshCw,
  Calendar,
  ArrowUpRight,
  Clock,
  ShieldCheck,
  FileText,
  Receipt,
  FileSpreadsheet,
  Truck,
  Filter,
  CheckCircle2,
  Search
} from 'lucide-react';
import { ApiClient } from '../../services/api';
import { useAuth } from '../../store/authContext';
import { formatCurrencyINR } from '@aescion/shared-utils';

export const ReportsView: React.FC = () => {
  const { activeBranch } = useAuth();
  const [pulseData, setPulseData] = useState<any>(null);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [period, setPeriod] = useState<'TODAY' | 'THIS_WEEK' | 'THIS_MONTH'>('TODAY');
  const [activeReportTab, setActiveReportTab] = useState<'OVERVIEW' | 'CHARTS' | 'SALES' | 'RECEIVABLES' | 'SUPPLIERS' | 'AUDIT'>('OVERVIEW');
  const [auditSearch, setAuditSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const [pulse, sum, logsRes] = await Promise.all([
        ApiClient.get<any>(`/reports/dashboard-pulse?period=${period}`),
        ApiClient.get<any>('/reports/summary'),
        ApiClient.get<any>('/reports/audit-logs?limit=50').catch(() => ({ logs: [] }))
      ]);
      setPulseData(pulse);
      setSummaryData(sum);
      setAuditLogs(logsRes?.logs || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [period, activeBranch?.id]);

  // Derived KPI metrics
  const totalRevenue = pulseData?.totalRevenue ?? 0;
  const invoiceCount = pulseData?.invoiceCount ?? pulseData?.completedBills ?? 0;
  const quotationCount = pulseData?.quotationCount ?? 0;
  const receiptCount = pulseData?.receiptCount ?? 0;
  const salesOrderCount = pulseData?.salesOrderCount ?? 0;
  const pendingDispatches = pulseData?.pendingDispatches ?? 0;
  const receivables = pulseData?.customerReceivables ?? pulseData?.pendingReceivables ?? 0;
  const supplierPayables = pulseData?.supplierPayables ?? 0;

  const revenueTrend = summaryData?.revenueTrend || [];
  const topProducts = summaryData?.topSellingProducts || [];
  const invoiceStatus = summaryData?.invoiceStatusBreakdown || { PAID: 0, PARTIALLY_PAID: 0, UNPAID: 0 };
  const orderStatus = summaryData?.salesOrderStatusBreakdown || { ORDER_PLACED: 0, DISPATCHED: 0, INVOICED: 0 };
  const ageing = summaryData?.receivablesAgeing || { current0to30: 0, days31to60: 0, days61to90: 0, daysAbove90: 0, total: 0 };
  const topSuppliers = summaryData?.topSuppliers || [];

  const paymentBreakdown = pulseData?.paymentBreakdown || { CASH: 0, UPI: 0, CARD: 0, CREDIT: 0, total: 0 };
  const totalTender = paymentBreakdown.total || 1;

  // Filtered audit logs
  const filteredAuditLogs = auditLogs.filter(
    (log) =>
      log.action?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.userName?.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.entityType?.toLowerCase().includes(auditSearch.toLowerCase())
  );

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
        <div>
          <h2 className="text-xl font-semibold text-[#0F172A] flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-[#2563EB]" />
            <span>Executive Business Analytics & Audit Center</span>
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Authoritative revenue analytics, product sales rankings, receivables ageing, supplier payables, and immutable audit logs.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex bg-[#F1F5F9] p-1 rounded-md">
            {[
              { id: 'TODAY', label: 'Today' },
              { id: 'THIS_WEEK', label: 'This Week' },
              { id: 'THIS_MONTH', label: 'This Month' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPeriod(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition ${
                  period === tab.id
                    ? 'bg-[#2563EB] text-white shadow-2xs'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchReports}
            className="p-2 text-[#64748B] hover:text-[#0F172A] bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] rounded-md transition"
            title="Refresh Analytics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Top 8 KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* KPI 1: Revenue */}
        <div className="bg-white p-3 rounded-lg border border-[#E2E8F0] shadow-2xs border-l-4 border-l-[#2563EB]">
          <div className="text-[10px] uppercase font-semibold text-[#64748B]">Total Revenue</div>
          <div className="text-sm font-bold text-[#0F172A] mt-1 truncate">{formatCurrencyINR(totalRevenue)}</div>
        </div>

        {/* KPI 2: Sales Orders */}
        <div className="bg-white p-3 rounded-lg border border-[#E2E8F0] shadow-2xs border-l-4 border-l-[#6366F1]">
          <div className="text-[10px] uppercase font-semibold text-[#64748B]">Sales Orders</div>
          <div className="text-sm font-bold text-[#0F172A] mt-1">{salesOrderCount}</div>
        </div>

        {/* KPI 3: Quotations */}
        <div className="bg-white p-3 rounded-lg border border-[#E2E8F0] shadow-2xs border-l-4 border-l-[#3B82F6]">
          <div className="text-[10px] uppercase font-semibold text-[#64748B]">Quotations</div>
          <div className="text-sm font-bold text-[#0F172A] mt-1">{quotationCount}</div>
        </div>

        {/* KPI 4: Invoices */}
        <div className="bg-white p-3 rounded-lg border border-[#E2E8F0] shadow-2xs border-l-4 border-l-[#10B981]">
          <div className="text-[10px] uppercase font-semibold text-[#64748B]">Invoices</div>
          <div className="text-sm font-bold text-[#0F172A] mt-1">{invoiceCount}</div>
        </div>

        {/* KPI 5: Receipts */}
        <div className="bg-white p-3 rounded-lg border border-[#E2E8F0] shadow-2xs border-l-4 border-l-[#059669]">
          <div className="text-[10px] uppercase font-semibold text-[#64748B]">Receipts</div>
          <div className="text-sm font-bold text-[#0F172A] mt-1">{receiptCount}</div>
        </div>

        {/* KPI 6: Receivables */}
        <div className="bg-white p-3 rounded-lg border border-[#E2E8F0] shadow-2xs border-l-4 border-l-[#8B5CF6]">
          <div className="text-[10px] uppercase font-semibold text-[#64748B]">Receivables</div>
          <div className="text-sm font-bold text-[#0F172A] mt-1 truncate">{formatCurrencyINR(receivables)}</div>
        </div>

        {/* KPI 7: Payables */}
        <div className="bg-white p-3 rounded-lg border border-[#E2E8F0] shadow-2xs border-l-4 border-l-[#F97316]">
          <div className="text-[10px] uppercase font-semibold text-[#64748B]">Payables</div>
          <div className="text-sm font-bold text-[#0F172A] mt-1 truncate">{formatCurrencyINR(supplierPayables)}</div>
        </div>

        {/* KPI 8: Pending Dispatches */}
        <div className="bg-white p-3 rounded-lg border border-[#E2E8F0] shadow-2xs border-l-4 border-l-[#EF4444]">
          <div className="text-[10px] uppercase font-semibold text-[#64748B]">Pending DC</div>
          <div className="text-sm font-bold text-[#0F172A] mt-1">{pendingDispatches}</div>
        </div>
      </div>

      {/* 3. Section Tabs */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] overflow-hidden">
        <div className="p-3 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap gap-1.5">
          {[
            { id: 'OVERVIEW', label: 'Visual Charts & Trends' },
            { id: 'SALES', label: 'Top Products & Invoices' },
            { id: 'RECEIVABLES', label: 'Receivables & Ageing' },
            { id: 'SUPPLIERS', label: 'Supplier Purchases' },
            { id: 'AUDIT', label: 'System Audit Logs' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveReportTab(tab.id as any)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded transition ${
                activeReportTab === tab.id
                  ? 'bg-[#2563EB] text-white shadow-2xs'
                  : 'bg-white text-[#475569] hover:bg-[#F8FAFC] border border-[#CBD5E1]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* TAB 1: VISUAL CHARTS & TRENDS */}
          {activeReportTab === 'OVERVIEW' && (
            <div className="space-y-6">
              {/* Row 1: Line Chart & Payment Donut */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Chart 1: Revenue Trend (Line Chart SVG) */}
                <div className="lg:col-span-2 bg-[#FAFBFC] p-4 rounded-lg border border-[#E2E8F0]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center space-x-1.5">
                      <TrendingUp className="w-4 h-4 text-[#2563EB]" />
                      <span>7-Day Revenue Trend (₹)</span>
                    </h3>
                    <span className="text-[11px] text-[#64748B]">Realized Bill Totals</span>
                  </div>

                  {revenueTrend.length === 0 ? (
                    <div className="py-12 text-center text-xs text-[#94A3B8]">No revenue trend data available.</div>
                  ) : (
                    <div className="space-y-2">
                      <div className="h-44 flex items-end justify-between gap-2 pt-6 px-2 border-b border-[#E2E8F0]">
                        {(() => {
                          const maxRev = Math.max(...revenueTrend.map((d: any) => d.revenue), 100);
                          return revenueTrend.map((d: any, idx: number) => {
                            const heightPct = Math.max(8, (d.revenue / maxRev) * 100);
                            return (
                              <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                                <div className="text-[10px] font-mono font-bold text-[#1D4ED8] mb-1 opacity-0 group-hover:opacity-100 transition absolute -top-4">
                                  ₹{d.revenue.toLocaleString()}
                                </div>
                                <div
                                  style={{ height: `${heightPct}%` }}
                                  className="w-full max-w-[36px] bg-[#2563EB] hover:bg-[#1D4ED8] rounded-t transition cursor-pointer shadow-xs"
                                />
                                <div className="text-[10px] font-medium text-[#64748B] mt-2 text-center truncate w-full">
                                  {d.label.split(',')[0]}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                {/* Chart 2: Payment Method Breakdown (Donut Representation) */}
                <div className="bg-[#FAFBFC] p-4 rounded-lg border border-[#E2E8F0]">
                  <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-4 flex items-center space-x-1.5">
                    <Receipt className="w-4 h-4 text-[#10B981]" />
                    <span>Payment Tender Distribution</span>
                  </h3>

                  <div className="space-y-3">
                    {[
                      { label: 'Cash in Drawer', val: paymentBreakdown.CASH, color: '#10B981' },
                      { label: 'UPI / QR Code', val: paymentBreakdown.UPI, color: '#2563EB' },
                      { label: 'Card Swipes', val: paymentBreakdown.CARD, color: '#F97316' },
                      { label: 'Customer Credit', val: paymentBreakdown.CREDIT, color: '#8B5CF6' }
                    ].map((item, idx) => {
                      const pct = Math.round((item.val / totalTender) * 100) || 0;
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-[#334155]">{item.label}</span>
                            <span className="font-mono text-[#0F172A] font-bold">
                              {formatCurrencyINR(item.val)} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${pct}%`, backgroundColor: item.color }}
                              className="h-full rounded-full transition-all duration-500"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Row 2: Status Breakdown & Ageing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Invoice Status Distribution */}
                <div className="bg-[#FAFBFC] p-4 rounded-lg border border-[#E2E8F0]">
                  <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-3">
                    Invoice Status Distribution
                  </h3>
                  <div className="space-y-2 text-xs">
                    {Object.entries(invoiceStatus).map(([st, count]: any) => (
                      <div key={st} className="flex items-center justify-between p-2 bg-white rounded border border-[#EDF1F5]">
                        <span className="font-semibold text-[#475569]">{st}</span>
                        <span className="px-2 py-0.5 bg-[#EFF6FF] text-[#1D4ED8] font-mono font-bold rounded">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sales Order Status Distribution */}
                <div className="bg-[#FAFBFC] p-4 rounded-lg border border-[#E2E8F0]">
                  <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-3">
                    Wholesale Order Pipeline
                  </h3>
                  <div className="space-y-2 text-xs">
                    {Object.entries(orderStatus).map(([st, count]: any) => (
                      <div key={st} className="flex items-center justify-between p-2 bg-white rounded border border-[#EDF1F5]">
                        <span className="font-semibold text-[#475569]">{st.replace(/_/g, ' ')}</span>
                        <span className="px-2 py-0.5 bg-[#F5F3FF] text-[#6D28D9] font-mono font-bold rounded">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Receivables Ageing Distribution */}
                <div className="bg-[#FAFBFC] p-4 rounded-lg border border-[#E2E8F0]">
                  <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-3">
                    Credit Receivables Ageing
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between p-2 bg-white rounded border border-[#EDF1F5]">
                      <span className="text-[#047857] font-semibold">0 – 30 Days (Current)</span>
                      <strong className="text-[#0F172A] font-mono">{formatCurrencyINR(ageing.current0to30)}</strong>
                    </div>
                    <div className="flex justify-between p-2 bg-white rounded border border-[#EDF1F5]">
                      <span className="text-[#B45309] font-semibold">31 – 60 Days</span>
                      <strong className="text-[#0F172A] font-mono">{formatCurrencyINR(ageing.days31to60)}</strong>
                    </div>
                    <div className="flex justify-between p-2 bg-white rounded border border-[#EDF1F5]">
                      <span className="text-[#C2410C] font-semibold">61 – 90 Days</span>
                      <strong className="text-[#0F172A] font-mono">{formatCurrencyINR(ageing.days61to90)}</strong>
                    </div>
                    <div className="flex justify-between p-2 bg-white rounded border border-[#EDF1F5]">
                      <span className="text-[#B91C1C] font-semibold">90+ Days (Overdue)</span>
                      <strong className="text-[#B91C1C] font-mono">{formatCurrencyINR(ageing.daysAbove90)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TOP PRODUCTS & INVOICES */}
          {activeReportTab === 'SALES' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Top 10 Performing Products</h3>
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3 text-right">Units Sold</th>
                    <th className="py-2.5 px-3 text-right">Total Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF1F5]">
                  {topProducts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-[#94A3B8]">
                        No product sales recorded in this period.
                      </td>
                    </tr>
                  ) : (
                    topProducts.map((p: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#F8FBFF]">
                        <td className="py-2.5 px-3 font-bold text-[#64748B]">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-[#0F172A]">{p.name}</td>
                        <td className="py-2.5 px-3 text-right font-medium text-[#334155]">{p.quantity}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#0F172A]">{formatCurrencyINR(p.revenue || p.totalRevenue)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: RECEIVABLES */}
          {activeReportTab === 'RECEIVABLES' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Customer Outstanding Receivables</h3>
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Customer Name</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">Credit Limit</th>
                    <th className="py-2.5 px-3 text-right">Current Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF1F5]">
                  {(summaryData?.outstandingCustomers || []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-[#94A3B8]">
                        All customers are settled. Zero outstanding credit.
                      </td>
                    </tr>
                  ) : (
                    summaryData?.outstandingCustomers.map((c: any) => (
                      <tr key={c.id} className="hover:bg-[#F8FBFF]">
                        <td className="py-2.5 px-3 font-semibold text-[#0F172A]">{c.name}</td>
                        <td className="py-2.5 px-3 text-[#64748B]">{c.phone || '—'}</td>
                        <td className="py-2.5 px-3 font-mono text-[#64748B]">{formatCurrencyINR(c.creditLimit || 0)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#8B5CF6]">{formatCurrencyINR(c.currentOutstanding)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: SUPPLIER PURCHASES */}
          {activeReportTab === 'SUPPLIERS' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Top Supplier Vendors & Purchasing History</h3>
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Supplier Name</th>
                    <th className="py-2.5 px-3 text-right">Purchase Orders</th>
                    <th className="py-2.5 px-3 text-right">Total Purchased Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF1F5]">
                  {topSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-[#94A3B8]">
                        No supplier purchase orders recorded.
                      </td>
                    </tr>
                  ) : (
                    topSuppliers.map((s: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#F8FBFF]">
                        <td className="py-2.5 px-3 font-semibold text-[#0F172A]">{s.name}</td>
                        <td className="py-2.5 px-3 text-right font-medium text-[#334155]">{s.poCount} POs</td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#0F172A]">{formatCurrencyINR(s.totalPurchases)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 5: AUDIT LOGS */}
          {activeReportTab === 'AUDIT' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                  <span>Immutable System Audit Trail (WHO • DID WHAT • WHEN)</span>
                </h3>
                <div className="relative w-64">
                  <input
                    type="text"
                    placeholder="Search user, action, entity..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    className="w-full aescion-input pl-7 text-xs py-1"
                  />
                  <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2 top-2" />
                </div>
              </div>

              <div className="border border-[#E2E8F0] rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Actor / User</th>
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3">Entity Type</th>
                      <th className="py-2.5 px-3">Audit Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDF1F5]">
                    {filteredAuditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[#94A3B8]">
                          No audit records found matching query.
                        </td>
                      </tr>
                    ) : (
                      filteredAuditLogs.map((log: any) => (
                        <tr key={log.id} className="hover:bg-[#F8FBFF]">
                          <td className="py-2.5 px-3 text-[#64748B] font-mono whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-[#0F172A]">{log.userName || 'System'}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] rounded text-[10px] font-mono font-semibold">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-[#64748B] font-medium">{log.entityType}</td>
                          <td className="py-2.5 px-3 text-[#475569] font-mono text-[11px]">
                            {JSON.stringify(log.details || {})}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
