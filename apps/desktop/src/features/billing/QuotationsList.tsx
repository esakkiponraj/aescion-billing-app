import React, { useState, useEffect, useMemo } from 'react';
import { FileSpreadsheet, Plus, ArrowRight, CheckCircle2, X, Search, Filter, Printer, Edit2, Eye, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { ApiClient } from '../../services/api';
import { useAuth } from '../../store/authContext';
import { formatCurrencyINR } from '@aescion/shared-utils';

export const QuotationsList: React.FC = () => {
  const { organization, activeBranch } = useAuth();
  const [quotations, setQuotations] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedQtn, setSelectedQtn] = useState<any | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isConverting, setIsConverting] = useState<string | null>(null);

  // Form State for Create / Edit
  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    validUntil: '',
    lines: [
      { productId: '', name: '', quantity: 1, unitPrice: 0, discountAmount: 0, taxRate: 18, lineTotal: 0 }
    ]
  });

  const fetchQuotations = async () => {
    setIsLoading(true);
    try {
      const data = await ApiClient.get<any[]>(`/quotations${statusFilter ? `?status=${statusFilter}` : ''}`);
      setQuotations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load quotations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
    ApiClient.get<any[]>('/products').then(res => setProducts(Array.isArray(res) ? res : [])).catch(console.error);
    ApiClient.get<any[]>('/customers').then(res => setCustomers(Array.isArray(res) ? res : [])).catch(console.error);
  }, [statusFilter, activeBranch?.id]);

  const filteredQuotations = useMemo(() => {
    return quotations.filter(q => {
      const matchesSearch =
        q.quotationNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [quotations, searchTerm]);

  const openCreateModal = () => {
    setFormData({
      customerId: '',
      customerName: '',
      validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      lines: [{ productId: '', name: '', quantity: 1, unitPrice: 0, discountAmount: 0, taxRate: 18, lineTotal: 0 }]
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (qtn: any) => {
    setSelectedQtn(qtn);
    setFormData({
      customerId: qtn.customerId || '',
      customerName: qtn.customerName || '',
      validUntil: qtn.validUntil ? new Date(qtn.validUntil).toISOString().split('T')[0] : '',
      lines: qtn.lines.map((l: any) => ({
        productId: l.productId || '',
        name: l.name,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discountAmount: l.discountAmount || 0,
        taxRate: l.taxRate || 0,
        lineTotal: l.lineTotal
      }))
    });
    setIsEditModalOpen(true);
  };

  const handleProductSelect = (index: number, productId: string) => {
    const prod = products.find(p => p.id === productId);
    const newLines = [...formData.lines];
    if (prod) {
      newLines[index].productId = prod.id;
      newLines[index].name = prod.name;
      newLines[index].unitPrice = prod.sellingPrice;
      newLines[index].taxRate = prod.taxRate || 18;
      calculateLineTotal(newLines, index);
    }
  };

  const handleCustomerSelect = (customerId: string) => {
    const cust = customers.find(c => c.id === customerId);
    if (cust) {
      setFormData(prev => ({ ...prev, customerId: cust.id, customerName: cust.name }));
    } else {
      setFormData(prev => ({ ...prev, customerId: '', customerName: '' }));
    }
  };

  const calculateLineTotal = (linesArray: any[], index: number) => {
    const line = linesArray[index];
    const gross = (line.quantity || 1) * (line.unitPrice || 0);
    const net = Math.max(0, gross - (line.discountAmount || 0));
    const tax = (net * (line.taxRate || 0)) / 100;
    line.lineTotal = Math.round((net + tax) * 100) / 100;
    setFormData(prev => ({ ...prev, lines: linesArray }));
  };

  const addLine = () => {
    setFormData(prev => ({
      ...prev,
      lines: [...prev.lines, { productId: '', name: '', quantity: 1, unitPrice: 0, discountAmount: 0, taxRate: 18, lineTotal: 0 }]
    }));
  };

  const removeLine = (index: number) => {
    if (formData.lines.length <= 1) return;
    const newLines = formData.lines.filter((_, idx) => idx !== index);
    setFormData(prev => ({ ...prev, lines: newLines }));
  };

  const calculateTotals = useMemo(() => {
    let subtotal = 0;
    let taxTotal = 0;
    formData.lines.forEach(l => {
      const gross = (l.quantity || 1) * (l.unitPrice || 0);
      const net = Math.max(0, gross - (l.discountAmount || 0));
      const tax = (net * (l.taxRate || 0)) / 100;
      subtotal += net;
      taxTotal += tax;
    });
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxTotal: Math.round(taxTotal * 100) / 100,
      grandTotal: Math.round((subtotal + taxTotal) * 100) / 100
    };
  }, [formData.lines]);

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiClient.post('/quotations', formData);
      setIsAddModalOpen(false);
      fetchQuotations();
    } catch (err: any) {
      alert(err.message || 'Failed to create quotation');
    }
  };

  const handleUpdateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQtn) return;
    try {
      await ApiClient.put(`/quotations/${selectedQtn.id}`, formData);
      setIsEditModalOpen(false);
      fetchQuotations();
    } catch (err: any) {
      alert(err.message || 'Failed to update quotation');
    }
  };

  const handleStatusChange = async (qtnId: string, status: string) => {
    try {
      await ApiClient.put(`/quotations/${qtnId}/status`, { status });
      fetchQuotations();
    } catch (err: any) {
      alert(err.message || 'Failed to change quotation status');
    }
  };

  const handleConvert = async (qtnId: string) => {
    if (!confirm('Convert this quotation to an official invoice? This will reduce stock in inventory and generate an official bill.')) return;
    setIsConverting(qtnId);
    try {
      const invoice = await ApiClient.post<any>(`/quotations/${qtnId}/convert`, {});
      alert(`Quotation successfully converted to Invoice ${invoice.invoiceNumber}!`);
      await fetchQuotations();
    } catch (err: any) {
      alert(err.message || 'Failed to convert quotation');
    } finally {
      setIsConverting(null);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
        <div>
          <h2 className="text-xl font-semibold text-[#0F172A] flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-[#2563EB]" />
            <span>Quotations & Commercial Estimates</span>
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">Generate pre-sales estimates with safe single-conversion to invoices without inventory pre-deduction.</p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={fetchQuotations}
            className="p-2 text-[#64748B] hover:text-[#0F172A] bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] rounded-md transition"
            title="Refresh Quotations"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="btn-primary"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Quotation</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by quotation number or customer name..."
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
            <option value="DRAFT">Draft</option>
            <option value="SENT">Sent</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="REJECTED">Rejected</option>
            <option value="CONVERTED">Converted to Invoice</option>
          </select>
        </div>
      </div>

      {/* Quotations Table */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4">Quotation #</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Subtotal</th>
              <th className="py-3 px-4">GST Tax</th>
              <th className="py-3 px-4">Grand Total</th>
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
                    <span>Loading quotation estimates...</span>
                  </div>
                </td>
              </tr>
            ) : filteredQuotations.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-[#94A3B8]">
                  No quotations matching your search criteria.
                </td>
              </tr>
            ) : (
              filteredQuotations.map((q) => (
                <tr key={q.id} className="hover:bg-[#F8FBFF] transition">
                  <td className="py-3 px-4 font-mono font-bold text-[#1D4ED8]">{q.quotationNumber}</td>
                  <td className="py-3 px-4 text-[#64748B]">{new Date(q.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 px-4 font-semibold text-[#0F172A]">{q.customerName}</td>
                  <td className="py-3 px-4">{formatCurrencyINR(q.subtotal)}</td>
                  <td className="py-3 px-4">{formatCurrencyINR(q.taxTotal)}</td>
                  <td className="py-3 px-4 font-bold text-[#0F172A]">{formatCurrencyINR(q.grandTotal)}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded font-semibold text-[10px] uppercase border ${
                      q.status === 'CONVERTED'
                        ? 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]'
                        : q.status === 'ACCEPTED'
                        ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                        : q.status === 'REJECTED'
                        ? 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]'
                        : q.status === 'SENT'
                        ? 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]'
                        : 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]'
                    }`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        onClick={() => { setSelectedQtn(q); setIsPrintModalOpen(true); }}
                        className="p-1 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] rounded transition"
                        title="View / Print Estimate"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>

                      {q.status !== 'CONVERTED' && (
                        <>
                          <button
                            onClick={() => openEditModal(q)}
                            className="p-1 text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF6FF] rounded transition"
                            title="Edit Quotation"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleConvert(q.id)}
                            disabled={isConverting === q.id}
                            className="px-2 py-1 bg-[#10B981] hover:bg-[#059669] text-white text-[11px] font-semibold rounded flex items-center space-x-1 transition shadow-2xs"
                            title="Convert to Invoice"
                          >
                            <ArrowRight className="w-3 h-3" />
                            <span>{isConverting === q.id ? 'Converting...' : 'Convert'}</span>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE / EDIT MODAL */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <h3 className="font-bold text-[#0F172A] text-sm">
                {isEditModalOpen ? `Edit Quotation #${selectedQtn?.quotationNumber}` : 'Create Commercial Estimate / Quotation'}
              </h3>
              <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={isEditModalOpen ? handleUpdateQuotation : handleCreateQuotation} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[#334155] font-semibold mb-1">Customer / Client</label>
                    <select
                      value={formData.customerId}
                      onChange={(e) => handleCustomerSelect(e.target.value)}
                      className="w-full aescion-input font-medium"
                    >
                      <option value="">-- Select or Walk-in --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.phone || 'No phone'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#334155] font-semibold mb-1">Client Name (Display)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Enterprises"
                      value={formData.customerName}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                      className="w-full aescion-input"
                    />
                  </div>

                  <div>
                    <label className="block text-[#334155] font-semibold mb-1">Valid Until Date</label>
                    <input
                      type="date"
                      value={formData.validUntil}
                      onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                      className="w-full aescion-input"
                    />
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="border border-[#E2E8F0] rounded-lg overflow-hidden">
                  <div className="bg-[#F8FAFC] px-3.5 py-2 border-b border-[#E2E8F0] flex justify-between items-center">
                    <span className="font-semibold text-[#0F172A] text-xs">Quotation Line Items</span>
                    <button
                      type="button"
                      onClick={addLine}
                      className="px-2 py-1 bg-[#EFF6FF] text-[#1D4ED8] hover:bg-[#DBEAFE] font-semibold text-[11px] rounded flex items-center space-x-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Line Item</span>
                    </button>
                  </div>

                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAFBFC] border-b border-[#EDF1F5] text-[#64748B] font-semibold text-[11px]">
                      <tr>
                        <th className="py-2 px-3">Product Catalog Item</th>
                        <th className="py-2 px-3 w-20 text-right">Qty</th>
                        <th className="py-2 px-3 w-24 text-right">Unit Price</th>
                        <th className="py-2 px-3 w-20 text-right">GST %</th>
                        <th className="py-2 px-3 w-24 text-right">Line Total</th>
                        <th className="py-2 px-3 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EDF1F5]">
                      {formData.lines.map((line, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3">
                            <select
                              value={line.productId}
                              onChange={(e) => handleProductSelect(idx, e.target.value)}
                              className="w-full aescion-input text-xs"
                            >
                              <option value="">-- Select Product --</option>
                              {products.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({formatCurrencyINR(p.sellingPrice)})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              min="1"
                              value={line.quantity}
                              onChange={(e) => {
                                const newLines = [...formData.lines];
                                newLines[idx].quantity = parseFloat(e.target.value) || 1;
                                calculateLineTotal(newLines, idx);
                              }}
                              className="w-full aescion-input text-right"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              step="0.01"
                              value={line.unitPrice}
                              onChange={(e) => {
                                const newLines = [...formData.lines];
                                newLines[idx].unitPrice = parseFloat(e.target.value) || 0;
                                calculateLineTotal(newLines, idx);
                              }}
                              className="w-full aescion-input text-right font-mono"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              value={line.taxRate}
                              onChange={(e) => {
                                const newLines = [...formData.lines];
                                newLines[idx].taxRate = parseFloat(e.target.value) || 0;
                                calculateLineTotal(newLines, idx);
                              }}
                              className="w-full aescion-input text-right font-mono"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-[#0F172A]">
                            {formatCurrencyINR(line.lineTotal)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeLine(idx)}
                              className="text-[#94A3B8] hover:text-[#EF4444]"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Estimate Summary */}
                <div className="flex justify-end pt-2">
                  <div className="w-64 space-y-1.5 text-xs text-right">
                    <div className="text-[#64748B]">Subtotal: <span className="font-semibold text-[#0F172A]">{formatCurrencyINR(calculateTotals.subtotal)}</span></div>
                    <div className="text-[#64748B]">Tax (GST): <span className="font-semibold text-[#0F172A]">{formatCurrencyINR(calculateTotals.taxTotal)}</span></div>
                    <div className="text-sm font-bold text-[#0F172A] pt-1 border-t border-[#E2E8F0]">
                      Grand Total: <span className="text-[#2563EB]">{formatCurrencyINR(calculateTotals.grandTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  {isEditModalOpen ? 'Save Changes' : 'Create Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
