import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  Plus,
  ChefHat,
  CheckCircle2,
  Clock,
  X,
  ArrowRight,
  DollarSign,
  Receipt,
  Search,
  Filter,
  Users,
  Layers,
  ArrowRightLeft
} from 'lucide-react';
import { ApiClient } from '../../services/api';
import { useAuth } from '../../store/authContext';
import { RestaurantTableStatus, PaymentMethod } from '@aescion/shared-types';
import { Permission } from '@aescion/capability-config';
import { formatCurrencyINR } from '@aescion/shared-utils';
import { getSocket } from '../../services/socket';

export const TableFloorGrid: React.FC = () => {
  const { activeBranch, permissions, activeRole } = useAuth();
  const canSettle = permissions.includes(Permission.POS_CREATE_BILL) || activeRole?.roleType === 'OWNER' || activeRole?.roleType === 'MANAGER' || activeRole?.roleType === 'CASHIER';
  const canManageTables = permissions.includes(Permission.RESTAURANT_TABLES) && (activeRole?.roleType === 'OWNER' || activeRole?.roleType === 'MANAGER');

  const [tables, setTables] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [selectedTable, setSelectedTable] = useState<any | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Order state
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [itemNotes, setItemNotes] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // New Table state
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState('4');
  const [newTableSection, setNewTableSection] = useState('Ground Floor');

  // Settlement state
  const [billSummary, setBillSummary] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Transfer state
  const [targetTableId, setTargetTableId] = useState<string>('');

  const fetchTables = async () => {
    try {
      const data = await ApiClient.get<any[]>('/restaurant/tables');
      setTables(data || []);
    } catch (err) {
      console.error('Failed to fetch tables:', err);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const data = await ApiClient.get<any[]>('/products');
      setMenuItems(data || []);
    } catch (err) {
      console.error('Failed to fetch menu items:', err);
    }
  };

  useEffect(() => {
    fetchTables();
    fetchMenuItems();

    const socket = getSocket();
    const handleTableUpdate = () => fetchTables();
    const handleKOTUpdate = () => fetchTables();

    socket.on('table_updated', handleTableUpdate);
    socket.on('kot_updated', handleKOTUpdate);

    return () => {
      socket.off('table_updated', handleTableUpdate);
      socket.off('kot_updated', handleKOTUpdate);
    };
  }, [activeBranch?.id]);

  // Order Actions
  const handleOpenTableOrder = (table: any) => {
    setSelectedTable(table);
    setOrderItems([]);
    setItemNotes('');
    setIsOrderModalOpen(true);
  };

  const handleAddItemToOrder = (item: any) => {
    setOrderItems((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.id);
      if (existing) {
        return prev.map((i) => (i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { menuItemId: item.id, name: item.name, unitPrice: item.sellingPrice, quantity: 1, notes: '' }];
    });
  };

  const handleUpdateItemQuantity = (index: number, delta: number) => {
    setOrderItems((prev) => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, idx) => idx !== index);
      }
      updated[index].quantity = newQty;
      return updated;
    });
  };

  const handleSendKOT = async () => {
    if (!selectedTable || orderItems.length === 0) return;
    setIsSubmitting(true);
    try {
      await ApiClient.post('/restaurant/kots', {
        tableId: selectedTable.id,
        items: orderItems
      });
      setIsOrderModalOpen(false);
      setOrderItems([]);
      fetchTables();
    } catch (err: any) {
      alert(err.message || 'Failed to send KOT');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Settle Actions
  const handleOpenSettleModal = async (table: any) => {
    setSelectedTable(table);
    setIsSubmitting(true);
    try {
      const summary = await ApiClient.get<any>(`/restaurant/tables/${table.id}/bill-summary`);
      setBillSummary(summary);
      setIsSettleModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Failed to fetch bill summary');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSettleTable = async () => {
    if (!selectedTable) return;
    setIsSubmitting(true);
    try {
      await ApiClient.post(`/restaurant/tables/${selectedTable.id}/settle`, {
        paymentMethod
      });
      setIsSettleModalOpen(false);
      setBillSummary(null);
      fetchTables();
    } catch (err: any) {
      alert(err.message || 'Failed to settle table');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add Table
  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNumber.trim()) return;
    setIsSubmitting(true);
    try {
      await ApiClient.post('/restaurant/tables', {
        tableNumber: newTableNumber.trim(),
        capacity: Number(newTableCapacity) || 4,
        section: newTableSection.trim() || 'Ground Floor'
      });
      setIsAddTableModalOpen(false);
      setNewTableNumber('');
      fetchTables();
    } catch (err: any) {
      alert(err.message || 'Failed to create table');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Transfer Table
  const handleOpenTransferModal = (table: any) => {
    setSelectedTable(table);
    setTargetTableId('');
    setIsTransferModalOpen(true);
  };

  const handleTransferTable = async () => {
    if (!selectedTable || !targetTableId) return;
    setIsSubmitting(true);
    try {
      await ApiClient.post('/restaurant/tables/transfer', {
        fromTableId: selectedTable.id,
        toTableId: targetTableId
      });
      setIsTransferModalOpen(false);
      fetchTables();
    } catch (err: any) {
      alert(err.message || 'Failed to transfer table');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseTable = async (tableId: string) => {
    try {
      await ApiClient.post(`/restaurant/tables/${tableId}/close`, {});
      fetchTables();
    } catch (err: any) {
      alert(err.message || 'Failed to close table');
    }
  };

  // Filter sections & categories
  const sections = Array.from(new Set(tables.map((t) => t.section || 'Ground Floor')));
  const categories = ['ALL', ...Array.from(new Set(menuItems.map((m) => m.category || 'General')))];

  const filteredTables = tables.filter((t) => {
    const matchesSection = selectedSection === 'ALL' || t.section === selectedSection;
    const matchesSearch = t.tableNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSection && matchesSearch;
  });

  const filteredMenuItems = menuItems.filter((item) => {
    if (selectedCategory === 'ALL') return true;
    return item.category === selectedCategory;
  });

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
        <div>
          <h2 className="text-xl font-semibold text-[#0F172A] flex items-center space-x-2">
            <UtensilsCrossed className="w-5 h-5 text-[#2563EB]" />
            <span>Restaurant Floor & Dine-In Tables</span>
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Real-time table occupancy, waitstaff ordering, KOT dispatch, and instant settlement.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#94A3B8]" />
            <input
              type="text"
              placeholder="Search table..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-md text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
            />
          </div>

          <button
            onClick={() => setIsAddTableModalOpen(true)}
            className="btn-primary flex items-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Table</span>
          </button>
        </div>
      </div>

      {/* Section Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedSection('ALL')}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
            selectedSection === 'ALL'
              ? 'bg-[#2563EB] text-white shadow-xs'
              : 'bg-white text-[#64748B] border border-[#E2E8F0] hover:bg-[#F8FAFC]'
          }`}
        >
          All Sections ({tables.length})
        </button>
        {sections.map((sec) => (
          <button
            key={sec}
            onClick={() => setSelectedSection(sec)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              selectedSection === sec
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'bg-white text-[#64748B] border border-[#E2E8F0] hover:bg-[#F8FAFC]'
            }`}
          >
            {sec} ({tables.filter((t) => t.section === sec).length})
          </button>
        ))}
      </div>

      {/* Tables Grid */}
      <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] space-y-4">
        {filteredTables.length === 0 ? (
          <div className="text-center py-12 text-[#94A3B8]">
            <UtensilsCrossed className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">No dining tables found.</p>
            <button
              onClick={() => setIsAddTableModalOpen(true)}
              className="mt-3 text-xs text-[#2563EB] font-semibold hover:underline"
            >
              + Add first table
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            {filteredTables.map((table) => {
              const isAvail = table.status === RestaurantTableStatus.AVAILABLE;
              const isReady = table.status === RestaurantTableStatus.READY;
              const isKotSent = table.status === RestaurantTableStatus.KOT_SENT;
              const isPrep = table.status === RestaurantTableStatus.PREPARING;
              const isOccupied = table.status === RestaurantTableStatus.OCCUPIED;

              return (
                <div
                  key={table.id}
                  className={`p-3.5 rounded-lg border transition-all flex flex-col justify-between h-40 ${
                    isAvail
                      ? 'border-[#A7F3D0] bg-[#ECFDF5]/40 hover:bg-[#ECFDF5]'
                      : isReady
                      ? 'border-[#BFDBFE] bg-[#EFF6FF] ring-1 ring-[#2563EB]/20 shadow-xs'
                      : isPrep || isKotSent
                      ? 'border-[#FED7AA] bg-[#FFF7ED]/40 hover:bg-[#FFF7ED]'
                      : 'border-[#FDE68A] bg-[#FEFCE8]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-base font-bold text-[#0F172A]">{table.tableNumber}</span>
                      <div className="text-[10px] text-[#64748B] font-medium">{table.section}</div>
                    </div>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border ${
                        isAvail
                          ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                          : isReady
                          ? 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]'
                          : 'bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA]'
                      }`}
                    >
                      {table.status}
                    </span>
                  </div>

                  <div className="flex items-center text-xs text-[#64748B] space-x-1">
                    <Users className="w-3 h-3 text-[#94A3B8]" />
                    <span>{table.capacity} Pax</span>
                    {table.activeOrderId && (
                      <span className="ml-auto font-mono text-[10px] text-[#2563EB] truncate max-w-[80px]">
                        {table.activeOrderId}
                      </span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#EDF1F5] flex flex-col gap-1.5">
                    {isAvail ? (
                      <button
                        onClick={() => handleOpenTableOrder(table)}
                        className="w-full py-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded text-[11px] font-semibold transition flex items-center justify-center space-x-1 shadow-2xs"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Start Order</span>
                      </button>
                    ) : (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenTableOrder(table)}
                          className="flex-1 py-1 bg-white hover:bg-[#F8FAFC] text-[#2563EB] border border-[#BFDBFE] rounded text-[10px] font-semibold transition shadow-2xs"
                          title="Add more items (Multi-KOT)"
                        >
                          + Add KOT
                        </button>
                        {canSettle && (
                          <button
                            onClick={() => handleOpenSettleModal(table)}
                            className="flex-1 py-1 bg-[#10B981] hover:bg-[#059669] text-white rounded text-[10px] font-semibold transition shadow-2xs flex items-center justify-center space-x-0.5"
                            title="Bill & Settle"
                          >
                            <Receipt className="w-3 h-3" />
                            <span>Bill</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenTransferModal(table)}
                          className="p-1 bg-white hover:bg-[#F8FAFC] text-[#64748B] border border-[#CBD5E1] rounded text-[10px] transition shadow-2xs"
                          title="Transfer Table"
                        >
                          <ArrowRightLeft className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 1. Dine-In Order / KOT Modal */}
      {isOrderModalOpen && selectedTable && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-lg shadow-xl border border-[#E2E8F0] overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
            <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">
                  Dine-In Order — Table {selectedTable.tableNumber}
                </h3>
                <p className="text-[11px] text-[#64748B]">
                  Section: {selectedTable.section} | Status: {selectedTable.status}
                </p>
              </div>
              <button
                onClick={() => setIsOrderModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#0F172A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              {/* Menu Catalog */}
              <div className="space-y-3 flex flex-col">
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2 py-1 rounded text-[10px] font-semibold transition ${
                        selectedCategory === cat
                          ? 'bg-[#2563EB] text-white'
                          : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 flex-1">
                  {filteredMenuItems.length === 0 ? (
                    <div className="text-center py-8 text-[#94A3B8]">No menu items in this category.</div>
                  ) : (
                    filteredMenuItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleAddItemToOrder(item)}
                        className="w-full p-2.5 rounded-md border border-[#E2E8F0] hover:border-[#2563EB] hover:bg-[#EFF6FF]/20 flex justify-between items-center text-left transition bg-white"
                      >
                        <div>
                          <div className="font-semibold text-[#0F172A]">{item.name}</div>
                          <div className="text-[10px] text-[#64748B]">{item.category || 'Food'}</div>
                        </div>
                        <span className="font-bold text-[#0F172A]">{formatCurrencyINR(item.sellingPrice)}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Order Cart */}
              <div className="border border-[#E2E8F0] rounded-lg p-3.5 flex flex-col justify-between bg-[#FAFBFC]">
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-[#EDF1F5]">
                    <h4 className="font-bold text-[#334155] text-xs">Kitchen Order Ticket (KOT)</h4>
                    <span className="text-[10px] text-[#64748B] font-semibold">
                      {orderItems.length} {orderItems.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {orderItems.length === 0 ? (
                      <div className="text-center py-8 text-[#94A3B8]">Select items from the menu to build KOT.</div>
                    ) : (
                      orderItems.map((it, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 bg-white rounded border border-[#E2E8F0] text-xs"
                        >
                          <div className="flex-1 pr-2">
                            <div className="font-medium text-[#0F172A]">{it.name}</div>
                            <div className="text-[10px] text-[#64748B]">{formatCurrencyINR(it.unitPrice)} each</div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleUpdateItemQuantity(idx, -1)}
                              className="w-5 h-5 rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] font-bold flex items-center justify-center text-xs"
                            >
                              -
                            </button>
                            <span className="font-bold text-[#0F172A] w-4 text-center">{it.quantity}</span>
                            <button
                              onClick={() => handleUpdateItemQuantity(idx, 1)}
                              className="w-5 h-5 rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] font-bold flex items-center justify-center text-xs"
                            >
                              +
                            </button>
                            <span className="font-bold text-[#0F172A] ml-2 w-14 text-right">
                              {formatCurrencyINR(it.unitPrice * it.quantity)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#EDF1F5] space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-[#0F172A]">
                    <span>KOT Total:</span>
                    <span>
                      {formatCurrencyINR(
                        orderItems.reduce((acc, it) => acc + it.quantity * it.unitPrice, 0)
                      )}
                    </span>
                  </div>

                  <button
                    onClick={handleSendKOT}
                    disabled={orderItems.length === 0 || isSubmitting}
                    className="w-full btn-primary flex items-center justify-center space-x-1.5"
                  >
                    <ChefHat className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Dispatching...' : 'Dispatch KOT to Kitchen'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Bill & Settle Table Modal */}
      {isSettleModalOpen && selectedTable && billSummary && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-lg shadow-xl border border-[#E2E8F0] overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
            <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">
                  Bill & Settle — Table {selectedTable.tableNumber}
                </h3>
                <p className="text-[11px] text-[#64748B]">Order ID: {billSummary.activeOrderId}</p>
              </div>
              <button
                onClick={() => setIsSettleModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#0F172A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* Itemized active KOT summary */}
              <div className="border border-[#E2E8F0] rounded-lg p-3 bg-[#FAFBFC] space-y-2">
                <h4 className="font-bold text-[#334155] text-xs">Active KOT Line Items</h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {billSummary.items?.map((it: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center py-1 border-b border-[#EDF1F5]">
                      <span>
                        {it.name} × <strong className="text-[#0F172A]">{it.quantity}</strong>
                      </span>
                      <span className="font-bold text-[#0F172A]">
                        {formatCurrencyINR(it.quantity * it.unitPrice)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-[#EDF1F5] space-y-1 text-[11px]">
                  <div className="flex justify-between text-[#64748B]">
                    <span>Subtotal:</span>
                    <span>{formatCurrencyINR(billSummary.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[#64748B]">
                    <span>GST (5%):</span>
                    <span>{formatCurrencyINR(billSummary.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-[#0F172A] pt-1 border-t border-[#E2E8F0]">
                    <span>Grand Total:</span>
                    <span className="text-[#10B981]">{formatCurrencyINR(billSummary.grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[PaymentMethod.CASH, PaymentMethod.UPI, PaymentMethod.CARD].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`p-2.5 rounded-md border text-center font-bold transition text-xs ${
                        paymentMethod === method
                          ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]'
                          : 'border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSettleTable}
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-[#10B981] hover:bg-[#059669] text-white rounded-md font-bold text-xs transition shadow-xs flex items-center justify-center space-x-1.5"
                >
                  <Receipt className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? 'Settling Bill...'
                      : `Collect ${formatCurrencyINR(billSummary.grandTotal)} & Free Table`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Add Table Modal */}
      {isAddTableModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-lg shadow-xl border border-[#E2E8F0] overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
            <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-5 py-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0F172A]">Configure New Dining Table</h3>
              <button
                onClick={() => setIsAddTableModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#0F172A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTable} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#334155] mb-1">
                  Table Number / Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. T1, T2, Outdoor-1, VIP-A"
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-[#CBD5E1] rounded-md focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-[#334155] mb-1">
                  Seating Capacity (Pax)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={newTableCapacity}
                  onChange={(e) => setNewTableCapacity(e.target.value)}
                  className="w-full px-3 py-2 border border-[#CBD5E1] rounded-md focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#334155] mb-1">
                  Floor / Section
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ground Floor, AC Hall, Rooftop, Outdoor"
                  value={newTableSection}
                  onChange={(e) => setNewTableSection(e.target.value)}
                  className="w-full px-3 py-2 border border-[#CBD5E1] rounded-md focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddTableModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary"
                >
                  {isSubmitting ? 'Creating...' : 'Create Table'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Table Transfer Modal */}
      {isTransferModalOpen && selectedTable && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-lg shadow-xl border border-[#E2E8F0] overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
            <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-5 py-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0F172A]">
                Transfer Table Order — {selectedTable.tableNumber}
              </h3>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#0F172A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <p className="text-[#64748B]">
                Move active order <strong className="text-[#0F172A]">{selectedTable.activeOrderId}</strong> to an available table.
              </p>

              <div>
                <label className="block font-semibold text-[#334155] mb-1">
                  Select Target Available Table *
                </label>
                <select
                  value={targetTableId}
                  onChange={(e) => setTargetTableId(e.target.value)}
                  className="w-full px-3 py-2 border border-[#CBD5E1] rounded-md focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                >
                  <option value="">-- Choose Table --</option>
                  {tables
                    .filter((t) => t.status === RestaurantTableStatus.AVAILABLE && t.id !== selectedTable.id)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.tableNumber} ({t.section} • {t.capacity} Pax)
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTransferTable}
                  disabled={!targetTableId || isSubmitting}
                  className="btn-primary"
                >
                  {isSubmitting ? 'Transferring...' : 'Transfer Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
