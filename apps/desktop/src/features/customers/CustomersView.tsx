import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, DollarSign, Clock, AlertCircle, X, Edit2, Eye, RefreshCw, FileText } from 'lucide-react';
import { ApiClient } from '../../services/api';
import { useAuth } from '../../store/authContext';
import { formatCurrencyINR } from '@aescion/shared-utils';

export const CustomersView: React.FC = () => {
  const { organization } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [ageingReport, setAgeingReport] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'LIST' | 'AGEING'>('LIST');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    creditLimit: 5000
  });

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const data = await ApiClient.get<any[]>(`/customers${search ? `?search=${search}` : ''}`);
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAgeing = async () => {
    setIsLoading(true);
    try {
      const data = await ApiClient.get<any[]>('/customers/ageing');
      setAgeingReport(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'LIST') fetchCustomers();
    else fetchAgeing();
  }, [activeTab, search]);

  const openCreateModal = () => {
    setFormData({ name: '', phone: '', email: '', address: '', gstin: '', creditLimit: 5000 });
    setIsAddModalOpen(true);
  };

  const openEditModal = (c: any) => {
    setSelectedCustomer(c);
    setFormData({
      name: c.name,
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      gstin: c.gstin || '',
      creditLimit: c.creditLimit || 5000
    });
    setIsEditModalOpen(true);
  };

  const openLedgerModal = async (c: any) => {
    setSelectedCustomer(c);
    setIsLedgerModalOpen(true);
    try {
      const data = await ApiClient.get<any[]>(`/customers/${c.id}/ledger`);
      setLedgerData(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setLedgerData([]);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiClient.post('/customers', formData);
      setIsAddModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      alert(err.message || 'Failed to create customer');
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    try {
      await ApiClient.put(`/customers/${selectedCustomer.id}`, formData);
      setIsEditModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      alert(err.message || 'Failed to update customer');
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
        <div>
          <h2 className="text-xl font-semibold text-[#0F172A] flex items-center space-x-2">
            <Users className="w-5 h-5 text-[#2563EB]" />
            <span>Customers & Credit Control</span>
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">Manage customer directory, GSTIN profiles, credit limits, and aging ledger audit.</p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Tab Navigation */}
          <div className="flex bg-[#F1F5F9] p-1 rounded-md">
            <button
              onClick={() => setActiveTab('LIST')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition ${
                activeTab === 'LIST' ? 'bg-[#2563EB] text-white shadow-2xs' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Directory
            </button>
            <button
              onClick={() => setActiveTab('AGEING')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition ${
                activeTab === 'AGEING' ? 'bg-[#2563EB] text-white shadow-2xs' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Aging Breakdown
            </button>
          </div>

          <button
            onClick={activeTab === 'LIST' ? fetchCustomers : fetchAgeing}
            className="p-2 text-[#64748B] hover:text-[#0F172A] bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] rounded-md transition"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {activeTab === 'LIST' && (
            <button
              onClick={openCreateModal}
              className="btn-primary"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Customer</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'LIST' ? (
        /* Customers Directory Table */
        <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] overflow-hidden">
          <div className="p-3 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="relative max-w-sm">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search customers by name, phone or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-md outline-hidden focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 transition"
              />
            </div>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4">GSTIN Profile</th>
                <th className="py-3 px-4">Credit Limit</th>
                <th className="py-3 px-4">Current Outstanding</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF1F5] font-normal text-[#334155]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#94A3B8]">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#2563EB]" />
                      <span>Loading customer directory...</span>
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#94A3B8]">
                    No customers registered.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-[#F8FBFF] transition">
                    <td className="py-3 px-4 font-semibold text-[#0F172A]">{c.name}</td>
                    <td className="py-3 px-4 text-[#64748B]">{c.phone || '—'}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#64748B]">{c.gstin || 'Unregistered'}</td>
                    <td className="py-3 px-4 font-medium text-[#0F172A]">{formatCurrencyINR(c.creditLimit || 0)}</td>
                    <td className="py-3 px-4">
                      {c.outstanding > 0 ? (
                        <span className="font-bold text-[#B91C1C]">{formatCurrencyINR(c.outstanding)}</span>
                      ) : (
                        <span className="text-[#047857] font-medium">₹0.00 (Settled)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => openLedgerModal(c)}
                          className="p-1 text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF6FF] rounded transition"
                          title="View Credit Ledger"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] rounded transition"
                          title="Edit Customer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Aging Breakdown View */
        <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Current (&lt; 30 Days)</th>
                <th className="py-3 px-4">31–60 Days</th>
                <th className="py-3 px-4">61–90 Days</th>
                <th className="py-3 px-4">&gt; 90 Days (Overdue)</th>
                <th className="py-3 px-4 font-bold text-[#0F172A]">Total Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF1F5] font-normal text-[#334155]">
              {ageingReport.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#94A3B8]">
                    No overdue receivables. All credit accounts are healthy!
                  </td>
                </tr>
              ) : (
                ageingReport.map((a, idx) => (
                  <tr key={idx} className="hover:bg-[#F8FBFF] transition">
                    <td className="py-3 px-4 font-semibold text-[#0F172A]">{a.customerName}</td>
                    <td className="py-3 px-4 font-medium text-[#334155]">{formatCurrencyINR(a.current)}</td>
                    <td className="py-3 px-4 font-medium text-[#B45309]">{formatCurrencyINR(a.days30)}</td>
                    <td className="py-3 px-4 font-medium text-[#C2410C]">{formatCurrencyINR(a.days60)}</td>
                    <td className="py-3 px-4 font-bold text-[#B91C1C]">{formatCurrencyINR(a.days90Plus)}</td>
                    <td className="py-3 px-4 font-bold text-[#0F172A]">{formatCurrencyINR(a.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE CUSTOMER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <h3 className="font-bold text-[#0F172A] text-sm">Register New Customer</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-[#334155] font-semibold mb-1">Customer / Enterprise Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corp or Rajesh Kumar"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full aescion-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. 9840123456"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full aescion-input"
                  />
                </div>
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. rajesh@acme.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full aescion-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">GSTIN (B2B Tax Profile)</label>
                  <input
                    type="text"
                    placeholder="e.g. 33AAAAA9999A1Z9"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    className="w-full aescion-input uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Credit Limit (₹)</label>
                  <input
                    type="number"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                    className="w-full aescion-input font-mono font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#334155] font-semibold mb-1">Billing Address</label>
                <input
                  type="text"
                  placeholder="e.g. 42 Gandhi Road, Velachery"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full aescion-input"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Register Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <h3 className="font-bold text-[#0F172A] text-sm">Edit Customer Profile</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateCustomer} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-[#334155] font-semibold mb-1">Customer / Enterprise Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full aescion-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full aescion-input"
                  />
                </div>
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full aescion-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    className="w-full aescion-input uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Credit Limit (₹)</label>
                  <input
                    type="number"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                    className="w-full aescion-input font-mono font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#334155] font-semibold mb-1">Billing Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full aescion-input"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LEDGER MODAL */}
      {isLedgerModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <div>
                <h3 className="font-bold text-[#0F172A] text-sm">Credit Ledger: {selectedCustomer.name}</h3>
                <span className="text-[11px] text-[#64748B]">Credit Limit: {formatCurrencyINR(selectedCustomer.creditLimit || 0)}</span>
              </div>
              <button onClick={() => setIsLedgerModalOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 text-xs">
              <table className="w-full text-left">
                <thead className="border-b border-[#E2E8F0] text-[#64748B] font-semibold text-[11px]">
                  <tr>
                    <th className="py-2">Date</th>
                    <th className="py-2">Event / Ref</th>
                    <th className="py-2 text-right">Debit (₹)</th>
                    <th className="py-2 text-right">Credit (₹)</th>
                    <th className="py-2 text-right">Balance (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDF1F5]">
                  {ledgerData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#94A3B8]">
                        No ledger transactions recorded for this customer.
                      </td>
                    </tr>
                  ) : (
                    ledgerData.map((l, idx) => (
                      <tr key={idx}>
                        <td className="py-2 text-[#64748B]">{new Date(l.createdAt).toLocaleDateString()}</td>
                        <td className="py-2 font-medium text-[#0F172A]">{l.type} - {l.referenceNumber || 'N/A'}</td>
                        <td className="py-2 text-right text-[#B91C1C] font-semibold">{l.debit ? formatCurrencyINR(l.debit) : '—'}</td>
                        <td className="py-2 text-right text-[#047857] font-semibold">{l.credit ? formatCurrencyINR(l.credit) : '—'}</td>
                        <td className="py-2 text-right font-bold text-[#0F172A]">{formatCurrencyINR(l.balance)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
