import React, { useState, useEffect, useCallback } from 'react';
import { FileText, RefreshCw, Search, Filter, ShieldCheck } from 'lucide-react';
import { ApiClient } from '../../services/api';

export const SystemAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const endpoint = moduleFilter !== 'ALL'
        ? `/super-admin/audit-logs?entityType=${moduleFilter}`
        : '/super-admin/audit-logs';
      const data = await ApiClient.get<any[]>(endpoint);
      setLogs(data || []);
    } catch (err) {
      console.warn('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [moduleFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-lg font-bold text-slate-900">System Platform Audit Trail</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable system logs recording WHO • DID WHAT • WHEN across all platform tenants
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-hidden"
          >
            <option value="ALL">All Modules</option>
            <option value="INVOICE">Invoices</option>
            <option value="QUOTATION">Quotations</option>
            <option value="PAYMENT">Payments</option>
            <option value="PRODUCT">Products</option>
            <option value="CUSTOMER">Customers</option>
            <option value="ORGANIZATION">Organizations</option>
            <option value="USER">Users</option>
          </select>

          <button
            onClick={fetchLogs}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Module</th>
                <th className="py-3 px-4">Branch</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400">Loading audit trail...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400">No logs found matching criteria.</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-blue-700">{log.organization?.name || 'Platform'}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{log.userName}</td>
                    <td className="py-3 px-4">
                      <span className="bg-slate-100 text-slate-800 text-[10px] font-bold font-mono px-2 py-0.5 rounded">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{log.entityType}</td>
                    <td className="py-3 px-4 text-slate-500">{log.branch?.name || 'Main'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
