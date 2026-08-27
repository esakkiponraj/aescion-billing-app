import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Search, Printer, Ban, CheckCircle2, AlertCircle, X, DollarSign, RefreshCw, CreditCard, Eye } from 'lucide-react';
import { ApiClient } from '../../services/api';
import { useAuth } from '../../store/authContext';
import { formatCurrencyINR } from '@aescion/shared-utils';
import { PrinterAdapter } from '../../services/hardware';

export const InvoicesList: React.FC = () => {
  const { organization, activeBranch } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<any | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'CUSTOMER_CREDIT'>('CASH');
  const [paymentRef, setPaymentRef] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const data = await ApiClient.get<any[]>(`/invoices${statusFilter ? `?status=${statusFilter}` : ''}`);
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter, activeBranch?.id]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [invoices, searchTerm]);

  const handleVoidInvoice = async (invoiceId: string) => {
    const reason = prompt('Please enter the reason for voiding this invoice (this will restore items into inventory):');
    if (!reason) return;

    try {
      await ApiClient.put(`/invoices/${invoiceId}/void`, { reason });
      alert('Invoice has been voided and stock restored to inventory.');
      fetchInvoices();
    } catch (err: any) {
      alert(err.message || 'Failed to void invoice');
    }
  };

  const openPaymentModal = (inv: any) => {
    setPaymentModalInvoice(inv);
    setPaymentAmount(inv.balanceAmount || 0);
    setPaymentMethod('CASH');
    setPaymentRef('');
  };

  const handleCollectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalInvoice) return;
    setIsSubmittingPayment(true);
    try {
      await ApiClient.post('/payments/collect', {
        invoiceId: paymentModalInvoice.id,
        amount: paymentAmount,
        method: paymentMethod,
        referenceNumber: paymentRef
      });
      alert('Payment successfully recorded and receipt generated!');
      setPaymentModalInvoice(null);
      fetchInvoices();
    } catch (err: any) {
      alert(err.message || 'Failed to record payment');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
        <div>
          <h2 className="text-xl font-semibold text-[#0F172A] flex items-center space-x-2">
            <FileText className="w-5 h-5 text-[#2563EB]" />
            <span>Invoices & Official Bills</span>
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">Immutable financial ledger with GST tax breakdowns, collections, and void audit controls.</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchInvoices}
            className="p-2 text-[#64748B] hover:text-[#0F172A] bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] rounded-md transition"
            title="Refresh Invoices"
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
            placeholder="Search by invoice number or customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-md outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold text-[#334155] bg-white border border-[#CBD5E1] rounded-md px-3 py-1.5 outline-hidden"
          >
            <option value="">All Statuses</option>
            <option value="PAID">Paid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="ISSUED">Issued (Unpaid)</option>
            <option value="VOID">Void / Cancelled</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4">Invoice #</th>
              <th className="py-3 px-4">Date & Time</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Grand Total</th>
              <th className="py-3 px-4">Paid</th>
              <th className="py-3 px-4">Balance</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EDF1F5] font-normal text-[#334155]">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-[#94A3B8]">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#2563EB]" />
                    <span>Loading invoice records...</span>
                  </div>
                </td>
              </tr>
            ) : filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-[#94A3B8]">
                  No invoices recorded matching your criteria.
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-[#F8FBFF] transition">
                  <td className="py-3 px-4 font-mono font-bold text-[#1D4ED8]">{inv.invoiceNumber}</td>
                  <td className="py-3 px-4 text-[#64748B]">{new Date(inv.createdAt).toLocaleString()}</td>
                  <td className="py-3 px-4 font-semibold text-[#0F172A]">{inv.customerName}</td>
                  <td className="py-3 px-4 font-bold text-[#0F172A]">{formatCurrencyINR(inv.grandTotal)}</td>
                  <td className="py-3 px-4 text-[#047857] font-semibold">{formatCurrencyINR(inv.paidAmount)}</td>
                  <td className="py-3 px-4">
                    {inv.balanceAmount > 0 ? (
                      <span className="text-[#B91C1C] font-semibold">{formatCurrencyINR(inv.balanceAmount)}</span>
                    ) : (
                      <span className="text-[#94A3B8]">₹0.00</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded font-semibold text-[10px] uppercase border ${
                      inv.status === 'PAID'
                        ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                        : inv.status === 'VOID'
                        ? 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]'
                        : inv.status === 'PARTIALLY_PAID'
                        ? 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
                        : 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        title="View Full Invoice"
                        className="p-1 text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF6FF] rounded transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {inv.status !== 'PAID' && inv.status !== 'VOID' && (
                        <button
                          onClick={() => openPaymentModal(inv)}
                          title="Collect Payment"
                          className="p-1 text-[#047857] hover:bg-[#ECFDF5] rounded transition"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {inv.status !== 'VOID' && (
                        <button
                          onClick={() => handleVoidInvoice(inv.id)}
                          title="Void / Cancel Invoice"
                          className="p-1 text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#FEF2F2] rounded transition"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* VIEW INVOICE MODAL */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <div>
                <h3 className="font-bold text-[#0F172A] text-sm">Invoice #{selectedInvoice.invoiceNumber}</h3>
                <span className="text-[11px] text-[#64748B]">{new Date(selectedInvoice.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    PrinterAdapter.printReceipt({
                      companyName: organization?.name,
                      branchName: activeBranch?.name,
                      invoiceNumber: selectedInvoice.invoiceNumber,
                      date: new Date(selectedInvoice.createdAt).toLocaleDateString(),
                      items: selectedInvoice.lines?.map((l: any) => ({
                        name: l.name,
                        quantity: l.quantity,
                        unitPrice: l.unitPrice,
                        total: l.lineTotal
                      })) || [],
                      subtotal: selectedInvoice.subtotal,
                      taxTotal: selectedInvoice.taxTotal,
                      grandTotal: selectedInvoice.grandTotal,
                      paymentMethod: selectedInvoice.paymentMethod || 'CASH',
                      cashierName: 'Cashier'
                    });
                  }}
                  className="px-2.5 py-1 text-xs font-semibold bg-[#2563EB] text-white rounded-md flex items-center space-x-1"
                >
                  <Printer className="w-3 h-3" />
                  <span>Print</span>
                </button>
                <button onClick={() => setSelectedInvoice(null)} className="text-[#94A3B8] hover:text-[#0F172A]">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 p-3 bg-[#FAFBFC] rounded-lg border border-[#EDF1F5]">
                <div>
                  <span className="text-[11px] text-[#64748B] block">Billed To</span>
                  <span className="font-bold text-[#0F172A] text-sm">{selectedInvoice.customerName}</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-[#64748B] block">Payment Status</span>
                  <span className="font-bold text-[#2563EB]">{selectedInvoice.status}</span>
                </div>
              </div>

              {/* Lines table */}
              <table className="w-full text-left">
                <thead className="border-b border-[#E2E8F0] text-[#64748B] font-semibold text-[11px]">
                  <tr>
                    <th className="py-2">Item</th>
                    <th className="py-2 text-right">Qty</th>
                    <th className="py-2 text-right">Rate</th>
                    <th className="py-2 text-right">Tax (GST)</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF1F5]">
                  {selectedInvoice.lines?.map((line: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-2 font-medium text-[#0F172A]">{line.name}</td>
                      <td className="py-2 text-right">{line.quantity}</td>
                      <td className="py-2 text-right">{formatCurrencyINR(line.unitPrice)}</td>
                      <td className="py-2 text-right text-[#64748B]">{formatCurrencyINR(line.taxAmount)}</td>
                      <td className="py-2 text-right font-semibold text-[#0F172A]">{formatCurrencyINR(line.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="border-t border-[#E2E8F0] pt-3 space-y-1 text-right">
                <div className="text-[#64748B]">Subtotal: <span className="font-semibold text-[#0F172A]">{formatCurrencyINR(selectedInvoice.subtotal)}</span></div>
                <div className="text-[#64748B]">Tax (GST): <span className="font-semibold text-[#0F172A]">{formatCurrencyINR(selectedInvoice.taxTotal)}</span></div>
                <div className="text-sm font-bold text-[#0F172A] pt-1">
                  Grand Total: <span className="text-[#2563EB]">{formatCurrencyINR(selectedInvoice.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COLLECT PAYMENT MODAL */}
      {paymentModalInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <h3 className="font-semibold text-[#0F172A] text-sm">
                Collect Payment for #{paymentModalInvoice.invoiceNumber}
              </h3>
              <button onClick={() => setPaymentModalInvoice(null)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCollectPayment} className="p-5 space-y-3.5 text-xs">
              <div className="p-3 bg-[#EFF6FF] rounded-md border border-[#BFDBFE] flex justify-between items-center">
                <span className="text-[#1D4ED8] font-medium">Pending Balance:</span>
                <span className="text-base font-bold text-[#1D4ED8]">
                  {formatCurrencyINR(paymentModalInvoice.balanceAmount)}
                </span>
              </div>

              <div>
                <label className="block text-[#334155] font-semibold mb-1">Collection Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  max={paymentModalInvoice.balanceAmount}
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full aescion-input font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block text-[#334155] font-semibold mb-1">Payment Tender</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full aescion-input font-semibold"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI / QR</option>
                  <option value="CARD">Card POS</option>
                  <option value="CUSTOMER_CREDIT">Customer Credit Ledger</option>
                </select>
              </div>

              <div>
                <label className="block text-[#334155] font-semibold mb-1">Transaction Ref / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. UPI-998822 or Approval Code"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full aescion-input"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalInvoice(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="btn-primary"
                >
                  {isSubmittingPayment ? 'Recording...' : 'Record Payment & Issue Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
