import React, { useState, useEffect } from 'react';
import { Building2, Plus, CheckCircle2, PackageCheck, X, Search, Edit2, RefreshCw, FileText } from 'lucide-react';
import { ApiClient } from '../../services/api';
import { useAuth } from '../../store/authContext';
import { formatCurrencyINR } from '@aescion/shared-utils';

export const SuppliersView: React.FC = () => {
  const { activeBranch } = useAuth();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'PO' | 'SUPPLIERS'>('PO');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAddPoOpen, setIsAddPoOpen] = useState(false);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isEditSupplierOpen, setIsEditSupplierOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);

  const [supplierForm, setSupplierForm] = useState({ name: '', contactPerson: '', phone: '', email: '', gstin: '', address: '' });
  const [newPo, setNewPo] = useState({
    supplierId: '',
    supplierName: '',
    items: [{ productId: '', name: '', quantityOrdered: 50, unitCost: 100, taxRate: 5 }]
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [sup, po, prod] = await Promise.all([
        ApiClient.get<any[]>('/suppliers'),
        ApiClient.get<any[]>('/suppliers/purchase-orders'),
        ApiClient.get<any[]>('/products')
      ]);
      setSuppliers(Array.isArray(sup) ? sup : []);
      setPurchaseOrders(Array.isArray(po) ? po : []);
      setProducts(Array.isArray(prod) ? prod : []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeBranch?.id]);

  const openCreateSupplier = () => {
    setSupplierForm({ name: '', contactPerson: '', phone: '', email: '', gstin: '', address: '' });
    setIsAddSupplierOpen(true);
  };

  const openEditSupplier = (s: any) => {
    setSelectedSupplier(s);
    setSupplierForm({
      name: s.name,
      contactPerson: s.contactPerson || '',
      phone: s.phone || '',
      email: s.email || '',
      gstin: s.gstin || '',
      address: s.address || ''
    });
    setIsEditSupplierOpen(true);
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiClient.post('/suppliers', supplierForm);
      setIsAddSupplierOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to add supplier');
    }
  };

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiClient.post('/suppliers/purchase-orders', newPo);
      setIsAddPoOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create PO');
    }
  };

  const handleReceiveGoods = async (po: any) => {
    if (!confirm(`Generate Goods Received Note (GRN) for ${po.poNumber}? This will immediately update stock balances in the ledger.`)) return;
    try {
      await ApiClient.put(`/suppliers/purchase-orders/${po.id}/grn`, {
        items: po.items.map((i: any) => ({ productId: i.productId, quantity: i.quantityOrdered }))
      });
      alert('GRN Processed and stock updated successfully in database!');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to receive goods');
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
        <div>
          <h2 className="text-xl font-semibold text-[#0F172A] flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-[#2563EB]" />
            <span>Suppliers & Purchase Management</span>
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">Manage vendors, Purchase Orders (PO), and Goods Received Note (GRN) inventory intake.</p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Tab Navigation */}
          <div className="flex bg-[#F1F5F9] p-1 rounded-md">
            <button
              onClick={() => setActiveTab('PO')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition ${
                activeTab === 'PO' ? 'bg-[#2563EB] text-white shadow-2xs' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Purchase Orders
            </button>
            <button
              onClick={() => setActiveTab('SUPPLIERS')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition ${
                activeTab === 'SUPPLIERS' ? 'bg-[#2563EB] text-white shadow-2xs' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Vendors Master
            </button>
          </div>

          <button
            onClick={fetchData}
            className="p-2 text-[#64748B] hover:text-[#0F172A] bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] rounded-md transition"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {activeTab === 'PO' ? (
            <button
              onClick={() => {
                setNewPo({
                  supplierId: suppliers[0]?.id || '',
                  supplierName: suppliers[0]?.name || '',
                  items: [{ productId: products[0]?.id || '', name: products[0]?.name || '', quantityOrdered: 50, unitCost: 100, taxRate: 5 }]
                });
                setIsAddPoOpen(true);
              }}
              className="btn-primary"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Issue PO</span>
            </button>
          ) : (
            <button
              onClick={openCreateSupplier}
              className="btn-primary"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Vendor</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'PO' ? (
        /* Purchase Orders Table */
        <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">PO Number</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Vendor Supplier</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF1F5] font-normal text-[#334155]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#94A3B8]">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#2563EB]" />
                      <span>Loading purchase orders...</span>
                    </div>
                  </td>
                </tr>
              ) : purchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#94A3B8]">
                    No purchase orders issued yet.
                  </td>
                </tr>
              ) : (
                purchaseOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-[#F8FBFF] transition">
                    <td className="py-3 px-4 font-mono font-bold text-[#1D4ED8]">{po.poNumber}</td>
                    <td className="py-3 px-4 text-[#64748B]">{new Date(po.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4 font-semibold text-[#0F172A]">{po.supplierName}</td>
                    <td className="py-3 px-4 font-bold text-[#0F172A]">{formatCurrencyINR(po.totalAmount)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded font-semibold text-[10px] uppercase border ${
                        po.status === 'COMPLETED'
                          ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                          : 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
                      }`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {po.status !== 'COMPLETED' && (
                        <button
                          onClick={() => handleReceiveGoods(po)}
                          className="px-2.5 py-1 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold rounded inline-flex items-center space-x-1 transition shadow-2xs"
                          title="Generate GRN & Increase Stock"
                        >
                          <PackageCheck className="w-3.5 h-3.5" />
                          <span>Receive (GRN)</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Suppliers Table */
        <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Vendor Name</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Phone Number</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">GSTIN Profile</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF1F5] font-normal text-[#334155]">
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#94A3B8]">
                    No suppliers registered.
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-[#F8FBFF] transition">
                    <td className="py-3 px-4 font-semibold text-[#0F172A]">{s.name}</td>
                    <td className="py-3 px-4 text-[#334155]">{s.contactPerson || '—'}</td>
                    <td className="py-3 px-4 text-[#64748B]">{s.phone || '—'}</td>
                    <td className="py-3 px-4 text-[#64748B]">{s.email || '—'}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#64748B]">{s.gstin || '—'}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openEditSupplier(s)}
                        className="p-1 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] rounded transition"
                        title="Edit Vendor"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE PO MODAL */}
      {isAddPoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <h3 className="font-bold text-[#0F172A] text-sm">Issue Purchase Order (PO)</h3>
              <button onClick={() => setIsAddPoOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePo} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-[#334155] font-semibold mb-1">Select Vendor Supplier *</label>
                <select
                  required
                  value={newPo.supplierId}
                  onChange={(e) => {
                    const sup = suppliers.find(s => s.id === e.target.value);
                    setNewPo({ ...newPo, supplierId: e.target.value, supplierName: sup?.name || '' });
                  }}
                  className="w-full aescion-input font-medium"
                >
                  <option value="">-- Choose Vendor --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#334155] font-semibold mb-1">Select Catalog Product *</label>
                <select
                  required
                  value={newPo.items[0]?.productId}
                  onChange={(e) => {
                    const prod = products.find(p => p.id === e.target.value);
                    setNewPo({
                      ...newPo,
                      items: [{
                        productId: e.target.value,
                        name: prod?.name || '',
                        quantityOrdered: newPo.items[0]?.quantityOrdered || 50,
                        unitCost: prod?.costPrice || 100,
                        taxRate: prod?.taxRate || 5
                      }]
                    });
                  }}
                  className="w-full aescion-input font-medium"
                >
                  <option value="">-- Choose Product --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Cost: {formatCurrencyINR(p.costPrice || 0)})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Order Quantity (Units)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newPo.items[0]?.quantityOrdered}
                    onChange={(e) => {
                      const updated = [...newPo.items];
                      updated[0].quantityOrdered = parseFloat(e.target.value) || 1;
                      setNewPo({ ...newPo, items: updated });
                    }}
                    className="w-full aescion-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Unit Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newPo.items[0]?.unitCost}
                    onChange={(e) => {
                      const updated = [...newPo.items];
                      updated[0].unitCost = parseFloat(e.target.value) || 0;
                      setNewPo({ ...newPo, items: updated });
                    }}
                    className="w-full aescion-input font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddPoOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Issue Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE SUPPLIER MODAL */}
      {isAddSupplierOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <h3 className="font-bold text-[#0F172A] text-sm">Register Vendor Supplier</h3>
              <button onClick={() => setIsAddSupplierOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-[#334155] font-semibold mb-1">Vendor Enterprise Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Southern Grains Wholesale Ltd"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  className="w-full aescion-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={supplierForm.contactPerson}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
                    className="w-full aescion-input"
                  />
                </div>
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    className="w-full aescion-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    value={supplierForm.email}
                    onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                    className="w-full aescion-input"
                  />
                </div>
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={supplierForm.gstin}
                    onChange={(e) => setSupplierForm({ ...supplierForm, gstin: e.target.value.toUpperCase() })}
                    className="w-full aescion-input uppercase"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddSupplierOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Register Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
