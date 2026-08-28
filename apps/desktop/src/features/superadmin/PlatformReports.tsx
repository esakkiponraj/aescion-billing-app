import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Building2, Users, DollarSign, RefreshCw, PieChart, ShieldCheck } from 'lucide-react';
import { ApiClient } from '../../services/api';

export const PlatformReports: React.FC = () => {
  const [reports, setReports] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const data = await ApiClient.get<any>('/super-admin/reports/platform');
      setReports(data);
    } catch (err) {
      console.warn('Failed to load platform reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Platform Analytics & Financial Intelligence</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cross-tenant reporting, industry market share, and revenue volume distribution
          </p>
        </div>

        <button
          onClick={fetchReports}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-slate-400 space-y-2">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-xs">Computing platform financial intelligence...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 7-Day Revenue Velocity */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Platform Revenue Trend</h3>
            <div className="h-44 flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-slate-100">
              {reports?.last7Days?.map((day: any, idx: number) => {
                const maxRev = Math.max(...(reports.last7Days.map((d: any) => d.revenue) || [1]), 1);
                const heightPct = Math.max(8, Math.round((day.revenue / maxRev) * 100));

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                    <div className="w-full max-w-[40px] bg-slate-100 rounded-t-md overflow-hidden flex flex-col justify-end h-32">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t-md"
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500">{day.label.split(' ')[0]}</span>
                  </div>
                );
              })}
            </div>
            <div className="text-xs text-slate-500">
              Total Volume: <strong className="text-slate-900">₹{(reports?.totalPlatformRevenue || 0).toLocaleString('en-IN')}</strong>
            </div>
          </div>

          {/* Payment Method Distribution */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Settlement Method Distribution</h3>
            <div className="space-y-2.5 pt-2">
              {reports?.platformPaymentMethods && Object.entries(reports.platformPaymentMethods).map(([method, amount]: any) => (
                <div key={method} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg text-xs">
                  <span className="font-semibold text-slate-700">{method}</span>
                  <span className="font-bold text-slate-900">₹{Number(amount).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
