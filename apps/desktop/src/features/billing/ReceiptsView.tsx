import React, { useState, useEffect, useMemo } from 'react';
import { Receipt, Search, Printer, CheckCircle2, RefreshCw, X, ArrowUpRight, DollarSign } from 'lucide-react';
import { ApiClient } from '../../services/api';
import { useAuth } from '../../store/authContext';
import { formatCurrencyINR } from '@aescion/shared-utils';
import { PrinterAdapter } from '../../services/hardware';

export const ReceiptsView: React.FC = () => {
  const { organization, activeBranch } = useAuth();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  const fetchReceipts = async () => {
    setIsLoading(true);
    try {
      const data = await ApiClient.get<any[]>('/payments/receipts');
      setReceipts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load receipts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [activeBranch?.id]);

  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      const matchesSearch =
        r.receiptNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.invoice?.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMethod = !methodFilter || r.paymentMethod === methodFilter;
      return matchesSearch && matchesMethod;
    });
  }, [receipts, searchTerm, methodFilter]);

  const handleReprintReceipt = async (receiptId: string) => {
    try {
      const receipt = await ApiClient.get<any>(`/payments/receipts/${receiptId}/reprint`);
      setSelectedReceipt(receipt);
    } catch (err: any) {
      alert(err.message || 'Failed to fetch receipt details for reprint');
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
        <div>
          <h2 className="text-xl font-semibold text-[#0F172A] flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-[#2563EB]" />
            <span>Payments & Payment Receipts</span>
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">Authoritative payment receipts ledger with multi-tender audit and safe reprints.</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchReceipts}
            className="p-2 text-[#64748B] hover:text-[#0F172A] bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] rounded-md transition"
            title="Refresh Receipts"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by receipt #, customer name, or invoice #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-md outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="text-xs font-semibold text-[#334155] bg-white border border-[#CBD5E1] rounded-md px-3 py-1.5 outline-hidden"
          >
            <option value="">All Tender Types</option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="CARD">Card</option>
            <option value="CUSTOMER_CREDIT">Customer Credit</option>
          </select>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4">Receipt #</th>
              <th className="py-3 px-4">Date & Time</th>
              <th className="py-3 px-4">Invoice #</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Tender Method</th>
              <th className="py-3 px-4">Amount Paid</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EDF1F5] font-normal text-[#334155]">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-[#94A3B8]">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#2563EB]" />
                    <span>Loading payment receipts...</span>
                  </div>
                </td>
              </tr>
            ) : filteredReceipts.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-[#94A3B8]">
                  No receipts recorded.
                </td>
              </tr>
            ) : (
              filteredReceipts.map((r) => (
                <tr key={r.id} className="hover:bg-[#F8FBFF] transition">
                  <td className="py-3 px-4 font-mono font-bold text-[#1D4ED8]">{r.receiptNumber}</td>
                  <td className="py-3 px-4 text-[#64748B]">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="py-3 px-4 font-mono font-medium text-[#0F172A]">{r.invoice?.invoiceNumber || 'N/A'}</td>
                  <td className="py-3 px-4 font-semibold text-[#0F172A]">{r.customerName}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded font-semibold text-[10px] uppercase border ${
                      r.paymentMethod === 'CASH'
                        ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                        : r.paymentMethod === 'UPI'
                        ? 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]'
                        : r.paymentMethod === 'CARD'
                        ? 'bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA]'
                        : 'bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE]'
                    }`}>
                      {r.paymentMethod}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-[#0F172A]">{formatCurrencyINR(r.amount)}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleReprintReceipt(r.id)}
                      className="px-2.5 py-1 bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#334155] hover:text-[#2563EB] text-xs font-semibold rounded inline-flex items-center space-x-1 transition shadow-2xs"
                    >
                      <Printer className="w-3 h-3" />
                      <span>Reprint</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* REPRINT MODAL */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <h3 className="font-bold text-[#0F172A] text-sm">Receipt #{selectedReceipt.receiptNumber}</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    PrinterAdapter.printReceipt({
                      companyName: organization?.name,
                      branchName: activeBranch?.name,
                      invoiceNumber: selectedReceipt.invoice?.invoiceNumber || selectedReceipt.receiptNumber,
                      date: new Date(selectedReceipt.createdAt).toLocaleDateString(),
                      items: [],
                      subtotal: selectedReceipt.amount,
                      taxTotal: 0,
                      grandTotal: selectedReceipt.amount,
                      paymentMethod: selectedReceipt.paymentMethod,
                      cashierName: 'Cashier'
                    });
                  }}
                  className="px-2.5 py-1 text-xs font-semibold bg-[#2563EB] text-white rounded flex items-center space-x-1"
                >
                  <Printer className="w-3 h-3" />
                  <span>Print Slip</span>
                </button>
                <button onClick={() => setSelectedReceipt(null)} className="text-[#94A3B8] hover:text-[#0F172A]">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="p-3.5 bg-[#F8FAFC] rounded-lg border border-[#EDF1F5] text-center space-y-1">
                <div className="text-xl font-bold text-[#0F172A]">{formatCurrencyINR(selectedReceipt.amount)}</div>
                <div className="text-[11px] text-[#047857] font-semibold">Payment Successfully Settled</div>
              </div>

              <div className="divide-y divide-[#EDF1F5]">
                <div className="flex justify-between py-1.5">
                  <span className="text-[#64748B]">Customer Name</span>
                  <span className="font-semibold text-[#0F172A]">{selectedReceipt.customerName}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[#64748B]">Invoice Reference</span>
                  <span className="font-mono font-semibold text-[#2563EB]">{selectedReceipt.invoice?.invoiceNumber}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[#64748B]">Payment Tender</span>
                  <span className="font-semibold text-[#0F172A]">{selectedReceipt.paymentMethod}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[#64748B]">Date & Time</span>
                  <span className="text-[#0F172A]">{new Date(selectedReceipt.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
