import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  CheckCircle2,
  FileText,
  X,
  RefreshCw,
  Package,
  ArrowRight,
  Receipt,
  Clock,
  AlertCircle,
  FileCheck
} from 'lucide-react';
import { ApiClient } from '../../services/api';
import { useAuth } from '../../store/authContext';
import { subscribeToRealtime } from '../../services/socket';
import { formatCurrencyINR } from '@aescion/shared-utils';

interface OrderItem {
  productId?: string;
  name: string;
  quantityOrdered: number;
  dispatchedQuantity?: number;
  pendingQuantity?: number;
  unitPrice: number;
  taxRate: number;
  total?: number;
}

export const WholesaleOrdersView: React.FC = () => {
  const { activeBranch } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [selectedOrderForDispatch, setSelectedOrderForDispatch] = useState<any>(null);

  // New Order Form
  const [newOrder, setNewOrder] = useState<{
    customerId: string;
    customerName: string;
    customerPhone: string;
    gstin: string;
    paymentTerms: string;
    creditDays: number;
    items: OrderItem[];
  }>({
    customerId: '',
    customerName: '',
    customerPhone: '',
    gstin: '',
    paymentTerms: 'Net 30',
    creditDays: 30,
    items: [{ name: '', quantityOrdered: 10, unitPrice: 500, taxRate: 5 }]
  });

  // Dispatch Form
  const [dispatchForm, setDispatchForm] = useState<{
    vehicleNo: string;
    transporterName: string;
    driverName: string;
    notes: string;
    items: Array<{ productId?: string; name: string; quantity: number }>;
  }>({
    vehicleNo: '',
    transporterName: '',
    driverName: '',
    notes: '',
    items: []
  });

  const fetchData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const statusParam = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
      const [ordersData, custData, prodData] = await Promise.all([
        ApiClient.get<any[]>(`/wholesale/sales-orders${statusParam}`),
        ApiClient.get<any[]>('/customers').catch(() => []),
        ApiClient.get<any[]>('/products').catch(() => [])
      ]);
      setOrders(ordersData);
      setCustomers(custData);
      setProducts(prodData);
    } catch (err) {
      console.error('Failed to load wholesale orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);

    const unsubOrder = subscribeToRealtime('wholesale_order_updated', () => fetchData(false));
    const unsubInvoice = subscribeToRealtime('invoice_created', () => fetchData(false));

    return () => {
      unsubOrder();
      unsubInvoice();
    };
  }, [activeBranch?.id, statusFilter]);

  const handleAddItemRow = () => {
    setNewOrder({
      ...newOrder,
      items: [...newOrder.items, { name: '', quantityOrdered: 1, unitPrice: 0, taxRate: 5 }]
    });
  };

  const handleRemoveItemRow = (index: number) => {
    if (newOrder.items.length <= 1) return;
    const updated = newOrder.items.filter((_, i) => i !== index);
    setNewOrder({ ...newOrder, items: updated });
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiClient.post('/wholesale/sales-orders', newOrder);
      setIsAddModalOpen(false);
      setNewOrder({
        customerId: '',
        customerName: '',
        customerPhone: '',
        gstin: '',
        paymentTerms: 'Net 30',
        creditDays: 30,
        items: [{ name: '', quantityOrdered: 10, unitPrice: 500, taxRate: 5 }]
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create sales order');
    }
  };

  const openDispatchModal = (order: any) => {
    setSelectedOrderForDispatch(order);
    const orderItems = order.items || [];
    setDispatchForm({
      vehicleNo: '',
      transporterName: 'Direct Road Transport',
      driverName: 'Primary Driver',
      notes: '',
      items: orderItems.map((it: any) => ({
        productId: it.productId,
        name: it.name,
        quantity: it.pendingQuantity ?? it.quantityOrdered
      }))
    });
    setIsDispatchModalOpen(true);
  };

  const handleExecuteDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForDispatch) return;

    try {
      const result = await ApiClient.post<any>(
        `/wholesale/sales-orders/${selectedOrderForDispatch.id}/dispatch`,
        dispatchForm
      );
      alert(`Delivery Challan ${result.challanNumber} issued successfully! Stock deducted.`);
      setIsDispatchModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch order');
    }
  };

  const handleConvertToInvoice = async (orderId: string) => {
    if (!confirm('Are you sure you want to convert this Sales Order into an official Tax Invoice?')) return;
    try {
      const res = await ApiClient.post<any>(`/wholesale/sales-orders/${orderId}/convert-to-invoice`, {});
      alert(`Invoice ${res.invoice.invoiceNumber} created successfully! Customer ledger updated.`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to convert order to invoice');
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
        <div>
          <h2 className="text-xl font-semibold text-[#0F172A] flex items-center space-x-2">
            <Truck className="w-5 h-5 text-[#2563EB]" />
            <span>Wholesale B2B Sales Orders & Dispatch</span>
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Manage bulk buyer contracts, inventory allocations, partial dispatches, Delivery Challans (DC), and Invoice conversion.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => fetchData(true)}
            className="p-2 text-[#64748B] hover:text-[#0F172A] bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] rounded-md transition"
            title="Refresh List"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary flex items-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Sales Order</span>
          </button>
        </div>
      </div>

      {/* 2. Status Filter Tabs */}
      <div className="bg-white p-3 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] flex items-center justify-between">
        <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Status Filter</span>
        <div className="flex flex-wrap gap-1 bg-[#F1F5F9] p-1 rounded-md">
          {[
            { id: 'ALL', label: 'All Orders' },
            { id: 'ORDER_PLACED', label: 'Order Placed' },
            { id: 'PARTIALLY_DISPATCHED', label: 'Partial Dispatch' },
            { id: 'DISPATCHED', label: 'Dispatched' },
            { id: 'INVOICED', label: 'Invoiced' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1 text-xs font-semibold rounded transition ${
                statusFilter === tab.id
                  ? 'bg-[#2563EB] text-white shadow-2xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Sales Orders Table */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4">SO Number</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Buyer Entity</th>
              <th className="py-3 px-4">Line Items (Ordered / Dispatched / Pending)</th>
              <th className="py-3 px-4">Order Total</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EDF1F5] font-normal text-[#334155]">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-[#94A3B8]">
                  No wholesale sales orders match the selected filter.
                </td>
              </tr>
            ) : (
              orders.map((so) => {
                const items = so.items || [];
                const totalOrdered = items.reduce((acc: number, it: any) => acc + (it.quantityOrdered || 0), 0);
                const totalDispatched = items.reduce((acc: number, it: any) => acc + (it.dispatchedQuantity || 0), 0);
                const totalPending = items.reduce((acc: number, it: any) => acc + (it.pendingQuantity ?? it.quantityOrdered), 0);

                return (
                  <tr key={so.id} className="hover:bg-[#F8FBFF] transition">
                    <td className="py-3 px-4 font-mono font-bold text-[#1D4ED8]">{so.orderNumber}</td>
                    <td className="py-3 px-4 text-[#64748B]">{new Date(so.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#0F172A]">{so.customerName}</div>
                      {so.customer?.phone && (
                        <div className="text-[11px] text-[#64748B]">{so.customer.phone}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {items.slice(0, 2).map((it: any, idx: number) => (
                          <div key={idx} className="text-[11px] flex items-center justify-between">
                            <span className="font-medium text-[#334155]">{it.name}</span>
                            <span className="font-mono text-[#64748B]">
                              {it.quantityOrdered} ord / {it.dispatchedQuantity || 0} disp
                            </span>
                          </div>
                        ))}
                        {items.length > 2 && (
                          <div className="text-[10px] text-[#2563EB] font-medium">+ {items.length - 2} more item(s)</div>
                        )}
                        <div className="text-[10px] font-semibold text-[#475569] pt-0.5 border-t border-dashed border-[#E2E8F0]">
                          Total: <strong className="text-[#0F172A]">{totalOrdered}</strong> | Pending: <strong className="text-[#B91C1C]">{totalPending}</strong>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-[#0F172A]">{formatCurrencyINR(so.totalAmount)}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded font-semibold text-[10px] uppercase border ${
                          so.status === 'INVOICED'
                            ? 'bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE]'
                            : so.status === 'DISPATCHED'
                            ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                            : so.status === 'PARTIALLY_DISPATCHED'
                            ? 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
                            : 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]'
                        }`}
                      >
                        {so.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {so.status !== 'DISPATCHED' && so.status !== 'INVOICED' && (
                        <button
                          onClick={() => openDispatchModal(so)}
                          className="px-2.5 py-1 bg-white hover:bg-[#F8FAFC] text-[#2563EB] border border-[#CBD5E1] rounded text-xs font-semibold inline-flex items-center space-x-1 transition shadow-2xs"
                        >
                          <Truck className="w-3 h-3" />
                          <span>Dispatch (DC)</span>
                        </button>
                      )}

                      {so.status !== 'INVOICED' && (
                        <button
                          onClick={() => handleConvertToInvoice(so.id)}
                          className="px-2.5 py-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded text-xs font-semibold inline-flex items-center space-x-1 transition shadow-2xs"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Bill Invoice</span>
                        </button>
                      )}

                      {so.status === 'INVOICED' && (
                        <span className="text-[11px] text-[#6D28D9] font-semibold flex items-center justify-end space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Invoiced</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE SALES ORDER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <h3 className="font-bold text-[#0F172A] text-sm flex items-center space-x-2">
                <Package className="w-4 h-4 text-[#2563EB]" />
                <span>Create Wholesale Sales Order</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Select Existing Customer</label>
                  <select
                    value={newOrder.customerId}
                    onChange={(e) => {
                      const cId = e.target.value;
                      const match = customers.find((c) => c.id === cId);
                      setNewOrder({
                        ...newOrder,
                        customerId: cId,
                        customerName: match?.name || newOrder.customerName,
                        customerPhone: match?.phone || newOrder.customerPhone,
                        gstin: match?.gstin || newOrder.gstin
                      });
                    }}
                    className="w-full aescion-input"
                  >
                    <option value="">-- New Customer / Walk-in Buyer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone}) - Outstanding: ₹{c.currentOutstanding}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Buyer / Company Name *</label>
                  <input
                    type="text"
                    required
                    value={newOrder.customerName}
                    onChange={(e) => setNewOrder({ ...newOrder, customerName: e.target.value })}
                    placeholder="e.g. Royal Wholesale Distributors"
                    className="w-full aescion-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newOrder.customerPhone}
                    onChange={(e) => setNewOrder({ ...newOrder, customerPhone: e.target.value })}
                    placeholder="9876543210"
                    className="w-full aescion-input font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[#334155] font-semibold mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={newOrder.gstin}
                    onChange={(e) => setNewOrder({ ...newOrder, gstin: e.target.value.toUpperCase() })}
                    placeholder="33AAAAA0000A1Z5"
                    className="w-full aescion-input font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Credit / Payment Terms</label>
                  <select
                    value={newOrder.paymentTerms}
                    onChange={(e) => setNewOrder({ ...newOrder, paymentTerms: e.target.value })}
                    className="w-full aescion-input"
                  >
                    <option value="Net 15">Net 15 Days</option>
                    <option value="Net 30">Net 30 Days</option>
                    <option value="Net 60">Net 60 Days</option>
                    <option value="Immediate">Immediate Cash</option>
                  </select>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[#334155] font-semibold text-xs">Order Line Items *</label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-[#2563EB] hover:text-[#1D4ED8] font-semibold text-xs flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Item Line</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {newOrder.items.map((it, idx) => (
                    <div key={idx} className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-4">
                        <label className="block text-[#64748B] text-[10px] uppercase font-semibold mb-0.5">Product Description</label>
                        <input
                          type="text"
                          required
                          value={it.name}
                          onChange={(e) => {
                            const updated = [...newOrder.items];
                            updated[idx].name = e.target.value;
                            setNewOrder({ ...newOrder, items: updated });
                          }}
                          placeholder="e.g. Sona Masoori Rice 25kg"
                          className="w-full aescion-input text-xs"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[#64748B] text-[10px] uppercase font-semibold mb-0.5">Qty</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={it.quantityOrdered}
                          onChange={(e) => {
                            const updated = [...newOrder.items];
                            updated[idx].quantityOrdered = parseFloat(e.target.value) || 1;
                            setNewOrder({ ...newOrder, items: updated });
                          }}
                          className="w-full aescion-input font-mono text-xs"
                        />
                      </div>

                      <div className="col-span-3">
                        <label className="block text-[#64748B] text-[10px] uppercase font-semibold mb-0.5">Rate (₹)</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={it.unitPrice}
                          onChange={(e) => {
                            const updated = [...newOrder.items];
                            updated[idx].unitPrice = parseFloat(e.target.value) || 0;
                            setNewOrder({ ...newOrder, items: updated });
                          }}
                          className="w-full aescion-input font-mono text-xs"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[#64748B] text-[10px] uppercase font-semibold mb-0.5">GST %</label>
                        <select
                          value={it.taxRate}
                          onChange={(e) => {
                            const updated = [...newOrder.items];
                            updated[idx].taxRate = parseFloat(e.target.value) || 0;
                            setNewOrder({ ...newOrder, items: updated });
                          }}
                          className="w-full aescion-input text-xs"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                        </select>
                      </div>

                      <div className="col-span-1 flex justify-center pt-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="text-[#94A3B8] hover:text-[#EF4444]"
                          disabled={newOrder.items.length <= 1}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
                <div className="text-xs font-semibold text-[#64748B]">
                  Estimated Order Value:{' '}
                  <strong className="text-sm font-bold text-[#0F172A]">
                    {formatCurrencyINR(
                      newOrder.items.reduce(
                        (acc, it) => acc + (it.quantityOrdered || 0) * (it.unitPrice || 0) * (1 + (it.taxRate || 0) / 100),
                        0
                      )
                    )}
                  </strong>
                </div>

                <div className="flex space-x-2">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Save Sales Order
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISPATCH / DELIVERY CHALLAN MODAL */}
      {isDispatchModalOpen && selectedOrderForDispatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <div>
                <h3 className="font-bold text-[#0F172A] text-sm flex items-center space-x-2">
                  <Truck className="w-4 h-4 text-[#2563EB]" />
                  <span>Dispatch & Issue Delivery Challan (DC)</span>
                </h3>
                <span className="text-[11px] text-[#64748B]">
                  Order: <strong className="font-mono text-[#1D4ED8]">{selectedOrderForDispatch.orderNumber}</strong> • {selectedOrderForDispatch.customerName}
                </span>
              </div>
              <button onClick={() => setIsDispatchModalOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteDispatch} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Vehicle Registration No. *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TN-09-AB-1234"
                    value={dispatchForm.vehicleNo}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, vehicleNo: e.target.value.toUpperCase() })}
                    className="w-full aescion-input font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Driver / Transporter Name</label>
                  <input
                    type="text"
                    value={dispatchForm.driverName}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, driverName: e.target.value })}
                    className="w-full aescion-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#334155] font-semibold mb-1">Logistics / Transport Carrier</label>
                <input
                  type="text"
                  value={dispatchForm.transporterName}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, transporterName: e.target.value })}
                  className="w-full aescion-input"
                />
              </div>

              {/* Items to Dispatch */}
              <div>
                <label className="block text-[#334155] font-semibold mb-1.5">Quantity to Dispatch per Item</label>
                <div className="space-y-1.5">
                  {dispatchForm.items.map((it, idx) => (
                    <div key={idx} className="p-2.5 bg-[#F8FAFC] rounded border border-[#E2E8F0] flex items-center justify-between">
                      <span className="font-semibold text-[#0F172A]">{it.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] text-[#64748B]">Dispatch Qty:</span>
                        <input
                          type="number"
                          min="0"
                          value={it.quantity}
                          onChange={(e) => {
                            const updated = [...dispatchForm.items];
                            updated[idx].quantity = parseFloat(e.target.value) || 0;
                            setDispatchForm({ ...dispatchForm, items: updated });
                          }}
                          className="w-20 aescion-input font-mono text-right text-xs py-1"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button type="button" onClick={() => setIsDispatchModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Confirm Dispatch & Issue DC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
