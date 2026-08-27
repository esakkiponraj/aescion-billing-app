import React, { useState, useEffect } from 'react';
import { Package, Search, Plus, ArrowDown, ArrowUp, RefreshCw } from 'lucide-react';
import { ApiClient } from '../../services/api';
import { useAuth } from '../../store/authContext';

export const StockLedgerView: React.FC = () => {
  const { activeBranch } = useAuth();
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLedger = async () => {
    setIsLoading(true);
    try {
      const data = await ApiClient.get<any[]>('/products/stock/ledger');
      setLedgerEntries(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [activeBranch?.id]);

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
        <div>
          <h2 className="text-xl font-semibold text-[#0F172A] flex items-center space-x-2">
            <Package className="w-5 h-5 text-[#2563EB]" />
            <span>Inventory Stock Ledger & Audit Log</span>
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">Immutable historical record of every inventory movement and adjustment.</p>
        </div>

        <button
          onClick={fetchLedger}
          className="btn-secondary"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Product Name</th>
              <th className="py-3 px-4">Event Type</th>
              <th className="py-3 px-4">Reference</th>
              <th className="py-3 px-4 text-center">Movement</th>
              <th className="py-3 px-4 text-right">Balance After</th>
              <th className="py-3 px-4">Remarks / User</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EDF1F5] font-normal text-[#334155]">
            {ledgerEntries.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[#94A3B8]">
                  No stock movements recorded yet.
                </td>
              </tr>
            ) : (
              ledgerEntries.map((e) => {
                const isPositive = e.quantityChange > 0;
                return (
                  <tr key={e.id} className="hover:bg-[#F8FBFF] transition">
                    <td className="py-3 px-4 text-[#64748B] font-mono text-[11px]">
                      {new Date(e.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#0F172A]">{e.product?.name || 'Item'}</td>
                    <td className="py-3 px-4">
                      <span className="bg-[#F1F5F9] border border-[#E2E8F0] text-[#475569] px-2 py-0.5 rounded font-semibold text-[10px] uppercase">
                        {e.eventType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#64748B]">{e.referenceType || 'SYS'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center font-semibold px-2 py-0.5 rounded text-xs border ${
                        isPositive
                          ? 'text-[#047857] bg-[#ECFDF5] border-[#A7F3D0]'
                          : 'text-[#B91C1C] bg-[#FEF2F2] border-[#FECACA]'
                      }`}>
                        {isPositive ? <ArrowUp className="w-3 h-3 mr-0.5" /> : <ArrowDown className="w-3 h-3 mr-0.5" />}
                        {isPositive ? `+${e.quantityChange}` : e.quantityChange}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#0F172A]">{e.balanceAfter}</td>
                    <td className="py-3 px-4 text-[#64748B] text-[11px]">{e.notes || 'System transaction'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
