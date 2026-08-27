import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, Package, AlertTriangle, Users, RefreshCw, Calendar, ArrowUpRight, Clock, ShieldCheck } from 'lucide-react';
import { ApiClient } from '../../services/api';
import { useAuth } from '../../store/authContext';
import { formatCurrencyINR } from '@aescion/shared-utils';

export const ReportsView: React.FC = () => {
  const { activeBranch } = useAuth();
  const [pulseData, setPulseData] = useState<any>(null);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [period, setPeriod] = useState<'TODAY' | 'THIS_WEEK' | 'THIS_MONTH'>('TODAY');
  const [activeReportTab, setActiveReportTab] = useState<'SALES' | 'PRODUCTS' | 'STOCK' | 'SHIFTS' | 'RECEIVABLES'>('SALES');
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const [pulse, sum] = await Promise.all([
        ApiClient.get<any>(`/reports/dashboard-pulse?period=${period}`),
        ApiClient.get<any>('/reports/summary')
      ]);
      setPulseData(pulse);
      setSummaryData(sum);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [period, activeBranch?.id]);

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
        <div>
          <h2 className="text-xl font-semibold text-[#0F172A] flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-[#2563EB]" />
            <span>Business Reports & Financial Analytics</span>
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">Authoritative data-backed sales summaries, product rankings, cashier performance, and audit reports.</p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex bg-[#F1F5F9] p-1 rounded-md">
            <button
              onClick={() => setPeriod('TODAY')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition ${
                period === 'TODAY' ? 'bg-[#2563EB] text-white shadow-2xs' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setPeriod('THIS_WEEK')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition ${
                period === 'THIS_WEEK' ? 'bg-[#2563EB] text-white shadow-2xs' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setPeriod('THIS_MONTH')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition ${
                period === 'THIS_MONTH' ? 'bg-[#2563EB] text-white shadow-2xs' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              This Month
            </button>
          </div>

          <button
            onClick={fetchReports}
            className="p-2 text-[#64748B] hover:text-[#0F172A] bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] rounded-md transition"
            title="Refresh Reports"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] border-l-4 border-l-[#2563EB] space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-[#475569] uppercase text-[11px]">
            <span>Total Gross Revenue</span>
            <DollarSign className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">
            {formatCurrencyINR(pulseData?.totalRevenue || 0)}
          </div>
          <div className="text-[11px] text-[#64748B]">
            <span>{pulseData?.completedBills || 0} completed invoices</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] border-l-4 border-l-[#10B981] space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-[#475569] uppercase text-[11px]">
            <span>Net Settlement Margin</span>
            <TrendingUp className="w-4 h-4 text-[#10B981]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">
            {formatCurrencyINR(pulseData?.estimatedProfit || 0)}
          </div>
          <div className="text-[11px] text-[#047857] font-medium">
            <span>Tax Compliant Realized</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] border-l-4 border-l-[#8B5CF6] space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-[#475569] uppercase text-[11px]">
            <span>Receivables (Credit)</span>
            <Users className="w-4 h-4 text-[#8B5CF6]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">
            {formatCurrencyINR(pulseData?.pendingReceivables || 0)}
          </div>
          <div className="text-[11px] text-[#6D28D9] font-medium">
            <span>Customer balance due</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] border-l-4 border-l-[#F97316] space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-[#475569] uppercase text-[11px]">
            <span>Inventory Alert</span>
            <Package className="w-4 h-4 text-[#F97316]" />
          </div>
          <div className="text-2xl font-bold text-[#0F172A]">
            {summaryData?.lowStockItems?.length || 0}
          </div>
          <div className="text-[11px] text-[#C2410C] font-medium">
            <span>Items below minimum threshold</span>
          </div>
        </div>
      </div>

      {/* Reports Section Navigator */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] overflow-hidden">
        <div className="p-3 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap gap-1.5">
          {[
            { id: 'SALES', label: 'Sales Collections Summary' },
            { id: 'PRODUCTS', label: 'Top-Selling Products' },
            { id: 'STOCK', label: 'Low Stock Inventory Alerts' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveReportTab(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition ${
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
          {activeReportTab === 'SALES' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[#0F172A]">Sales by Payment Tender Method</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(pulseData?.paymentBreakdown || {}).map(([method, amount]: any) => (
                  <div key={method} className="p-3.5 bg-[#FAFBFC] rounded-lg border border-[#EDF1F5]">
                    <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">{method}</span>
                    <div className="text-lg font-bold text-[#0F172A] mt-1">{formatCurrencyINR(amount)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeReportTab === 'PRODUCTS' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[#0F172A]">Top Performing Products by Quantity</h3>
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3 text-right">Units Sold</th>
                    <th className="py-2.5 px-3 text-right">Total Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF1F5]">
                  {(summaryData?.topSellingProducts || []).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-[#94A3B8]">
                        No product sales recorded for this period.
                      </td>
                    </tr>
                  ) : (
                    summaryData?.topSellingProducts.map((p: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#F8FBFF]">
                        <td className="py-2.5 px-3 font-semibold text-[#0F172A]">{p.name}</td>
                        <td className="py-2.5 px-3 text-right font-medium text-[#334155]">{p.quantity}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#0F172A]">{formatCurrencyINR(p.totalRevenue)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeReportTab === 'STOCK' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[#0F172A]">Items Requiring Immediate Purchase / Replenishment</h3>
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Current Stock</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF1F5]">
                  {(summaryData?.lowStockItems || []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-[#94A3B8]">
                        All items are well stocked. No low-stock alerts.
                      </td>
                    </tr>
                  ) : (
                    summaryData?.lowStockItems.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-[#F8FBFF]">
                        <td className="py-2.5 px-3 font-semibold text-[#0F172A]">{item.name}</td>
                        <td className="py-2.5 px-3 text-[#64748B] font-mono">{item.sku || '—'}</td>
                        <td className="py-2.5 px-3 font-bold text-[#B91C1C]">{item.currentStock} {item.unit || 'PCS'}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] rounded text-[10px] font-semibold">
                            Low Stock Alert
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
