import React, { useState, useEffect } from 'react';
import { Truck, Plus, CheckCircle2, FileText, X } from 'lucide-react';
import { ApiClient } from '../../services/api';
import { useAuth } from '../../store/authContext';
import { formatCurrencyINR } from '@aescion/shared-utils';

export const WholesaleOrdersView: React.FC = () => {
  const { activeBranch } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [newOrder, setNewOrder] = useState({
    customerId: '',
    customerName: 'Kaveri Traders Pvt Ltd',
    items: [{ productId: '', name: 'Basmati Rice 25kg Bag', quantityOrdered: 20, unitPrice: 2200, taxRate: 5 }]
  });

  const fetchOrders = async () => {
    try {
      const data = await ApiClient.get<any[]>('/wholesale/sales-orders');
      setOrders(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [activeBranch?.id]);

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiClient.post('/wholesale/sales-orders', newOrder);
      setIsAddModalOpen(false);
      fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to create sales order');
    }
  };

  const handleCreateChallan = async (orderId: string) => {
    const vehicleNumber = prompt('Enter transport vehicle registration number (e.g. TN-09-AB-1234):');
    if (!vehicleNumber) return;

    try {
      const challan = await ApiClient.post<any>(`/wholesale/sales-orders/${orderId}/challan`, {
        vehicleNumber,
        driverName: 'Suresh Kumar',
        transporterName: 'VRL Logistics'
      });
      alert(`Delivery Challan ${challan.challanNumber} generated successfully!`);
      fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to generate challan');
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
        <div>
          <h2 className="text-xl font-semibold text-[#0F172A] flex items-center space-x-2">
            <Truck className="w-5 h-5 text-[#2563EB]" />
            <span>Wholesale Sales Orders & Dispatch</span>
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">Manage B2B orders, inventory allocation, and Delivery Challans (DC).</p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn-primary"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Sales Order</span>
        </button>
      </div>

      <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4">SO Number</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Buyer Entity</th>
              <th className="py-3 px-4">Grand Total</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Dispatch Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EDF1F5] font-normal text-[#334155]">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#94A3B8]">
                  No wholesale sales orders recorded.
                </td>
              </tr>
            ) : (
              orders.map((so) => (
                <tr key={so.id} className="hover:bg-[#F8FBFF] transition">
                  <td className="py-3 px-4 font-mono font-bold text-[#1D4ED8]">{so.orderNumber}</td>
                  <td className="py-3 px-4 text-[#64748B]">{new Date(so.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 px-4 font-semibold text-[#0F172A]">{so.customerName}</td>
                  <td className="py-3 px-4 font-bold text-[#0F172A]">{formatCurrencyINR(so.totalAmount)}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded font-semibold text-[10px] uppercase border ${
                      so.status === 'COMPLETED'
                        ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                        : 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]'
                    }`}>
                      {so.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {so.status !== 'COMPLETED' ? (
                      <button
                        onClick={() => handleCreateChallan(so.id)}
                        className="px-2.5 py-1 bg-white hover:bg-[#F8FAFC] text-[#2563EB] border border-[#CBD5E1] rounded text-xs font-semibold inline-flex items-center space-x-1 transition shadow-2xs"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Issue Delivery Challan</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-[#047857] font-semibold">Dispatched</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE SO MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <h3 className="font-bold text-[#0F172A] text-sm">Create Wholesale Sales Order</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-[#334155] font-semibold mb-1">Buyer / Distribution Agency *</label>
                <input
                  type="text"
                  required
                  value={newOrder.customerName}
                  onChange={(e) => setNewOrder({ ...newOrder, customerName: e.target.value })}
                  className="w-full aescion-input"
                />
              </div>

              <div>
                <label className="block text-[#334155] font-semibold mb-1">Product Line Description *</label>
                <input
                  type="text"
                  required
                  value={newOrder.items[0].name}
                  onChange={(e) => {
                    const updated = [...newOrder.items];
                    updated[0].name = e.target.value;
                    setNewOrder({ ...newOrder, items: updated });
                  }}
                  className="w-full aescion-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Quantity (Bags/Units)</label>
                  <input
                    type="number"
                    min="1"
                    value={newOrder.items[0].quantityOrdered}
                    onChange={(e) => {
                      const updated = [...newOrder.items];
                      updated[0].quantityOrdered = parseFloat(e.target.value) || 1;
                      setNewOrder({ ...newOrder, items: updated });
                    }}
                    className="w-full aescion-input font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Unit Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newOrder.items[0].unitPrice}
                    onChange={(e) => {
                      const updated = [...newOrder.items];
                      updated[0].unitPrice = parseFloat(e.target.value) || 0;
                      setNewOrder({ ...newOrder, items: updated });
                    }}
                    className="w-full aescion-input font-mono font-semibold"
                  />
                </div>
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
                  Save Sales Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
