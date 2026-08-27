import React, { useState, useEffect } from 'react';
import { UtensilsCrossed, Plus, ChefHat, CheckCircle2, Clock, X, ArrowRight, DollarSign } from 'lucide-react';
import { ApiClient } from '../../services/api';
import { useAuth } from '../../store/authContext';
import { RestaurantTableStatus } from '@aescion/shared-types';
import { formatCurrencyINR } from '@aescion/shared-utils';
import { getSocket } from '../../services/socket';

export const TableFloorGrid: React.FC = () => {
  const { activeBranch } = useAuth();
  const [tables, setTables] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<any | null>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  const fetchTables = async () => {
    try {
      const data = await ApiClient.get<any[]>('/restaurant/tables');
      setTables(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTables();
    ApiClient.get<any[]>('/products').then(setMenuItems).catch(console.error);

    const socket = getSocket();
    socket.on('kot_updated', () => {
      fetchTables();
    });

    return () => {
      socket.off('kot_updated');
    };
  }, [activeBranch?.id]);

  const handleOpenTableOrder = (table: any) => {
    setSelectedTable(table);
    setOrderItems([]);
    setIsOrderModalOpen(true);
  };

  const handleAddItemToOrder = (item: any) => {
    setOrderItems((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.id);
      if (existing) {
        return prev.map((i) => (i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { menuItemId: item.id, name: item.name, unitPrice: item.sellingPrice, quantity: 1 }];
    });
  };

  const handleSendKOT = async () => {
    if (!selectedTable || orderItems.length === 0) return;
    try {
      await ApiClient.post('/restaurant/kots', {
        tableId: selectedTable.id,
        items: orderItems
      });
      setIsOrderModalOpen(false);
      fetchTables();
    } catch (err: any) {
      alert(err.message || 'Failed to send KOT');
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

  // Group by sections
  const sections = Array.from(new Set(tables.map((t) => t.section)));

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
        <div>
          <h2 className="text-xl font-semibold text-[#0F172A] flex items-center space-x-2">
            <UtensilsCrossed className="w-5 h-5 text-[#2563EB]" />
            <span>Restaurant Floor & Dine-In Tables</span>
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">Real-time table occupancy, ordering, and kitchen dispatch.</p>
        </div>
      </div>

      {sections.map((sec) => (
        <div key={sec} className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] space-y-3">
          <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider text-[11px]">{sec}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
            {tables
              .filter((t) => t.section === sec)
              .map((table) => {
                const isAvail = table.status === RestaurantTableStatus.AVAILABLE;
                return (
                  <div
                    key={table.id}
                    onClick={() => isAvail && handleOpenTableOrder(table)}
                    className={`p-3.5 rounded-lg border transition-all cursor-pointer flex flex-col justify-between h-32 ${
                      isAvail
                        ? 'border-[#A7F3D0] bg-[#ECFDF5]/40 hover:bg-[#ECFDF5]'
                        : table.status === RestaurantTableStatus.READY
                        ? 'border-[#BFDBFE] bg-[#EFF6FF] ring-1 ring-[#2563EB]/20 shadow-xs'
                        : 'border-[#FED7AA] bg-[#FFF7ED]/40 hover:bg-[#FFF7ED]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#0F172A]">{table.tableNumber}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                        isAvail
                          ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                          : table.status === RestaurantTableStatus.READY
                          ? 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]'
                          : 'bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA]'
                      }`}>
                        {table.status}
                      </span>
                    </div>

                    <div className="text-xs text-[#64748B] font-medium">
                      Seats: {table.capacity} Pax
                    </div>

                    <div className="pt-1.5 border-t border-[#EDF1F5] flex items-center justify-between">
                      {isAvail ? (
                        <span className="text-[11px] font-semibold text-[#047857] flex items-center">
                          <Plus className="w-3 h-3 mr-0.5" /> Start Order
                        </span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCloseTable(table.id);
                          }}
                          className="px-2 py-0.5 bg-white hover:bg-[#F8FAFC] text-[#334155] border border-[#CBD5E1] rounded text-[10px] font-semibold ml-auto transition shadow-2xs"
                        >
                          Close Table
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ))}

      {/* Dine-in Ordering & KOT Modal */}
      {isOrderModalOpen && selectedTable && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-lg shadow-xl border border-[#E2E8F0] overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
            <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Dine-In Order — Table {selectedTable.tableNumber}</h3>
                <p className="text-[11px] text-[#64748B]">Section: {selectedTable.section}</p>
              </div>
              <button onClick={() => setIsOrderModalOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto grid grid-cols-2 gap-4 text-xs">
              {/* Menu items */}
              <div>
                <h4 className="font-semibold text-[#334155] mb-2 text-xs">Restaurant Menu Items</h4>
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {menuItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleAddItemToOrder(item)}
                      className="w-full p-2 rounded-md border border-[#E2E8F0] hover:border-[#2563EB] hover:bg-[#EFF6FF]/20 flex justify-between items-center text-left transition"
                    >
                      <span className="font-medium text-[#0F172A]">{item.name}</span>
                      <span className="font-bold text-[#0F172A]">{formatCurrencyINR(item.sellingPrice)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Cart */}
              <div className="border border-[#E2E8F0] rounded-lg p-3 flex flex-col justify-between bg-[#FAFBFC]">
                <div>
                  <h4 className="font-semibold text-[#334155] mb-2 text-xs">Kitchen Order Ticket (KOT)</h4>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto">
                    {orderItems.map((i, idx) => (
                      <div key={idx} className="flex justify-between py-1 border-b border-[#EDF1F5] text-xs">
                        <span>{i.name} × {i.quantity}</span>
                        <span className="font-bold text-[#0F172A]">{formatCurrencyINR(i.unitPrice * i.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#EDF1F5]">
                  <button
                    onClick={handleSendKOT}
                    disabled={orderItems.length === 0}
                    className="w-full btn-primary"
                  >
                    <ChefHat className="w-3.5 h-3.5" />
                    <span>Dispatch KOT to Kitchen</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
