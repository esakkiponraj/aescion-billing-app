import React, { useState, useEffect } from 'react';
import { ChefHat, CheckCircle2, Clock, Play, Check, AlertCircle, XCircle, Filter, RefreshCw } from 'lucide-react';
import { ApiClient } from '../../services/api';
import { useAuth } from '../../store/authContext';
import { KitchenStatus } from '@aescion/shared-types';
import { getSocket } from '../../services/socket';

export const KitchenKOTScreen: React.FC = () => {
  const { activeBranch } = useAuth();
  const [kots, setKots] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [cancelModalKot, setCancelModalKot] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

  const fetchKots = async () => {
    try {
      const data = await ApiClient.get<any[]>('/restaurant/kots');
      setKots(data || []);
    } catch (err) {
      console.error('Failed to fetch KOTs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKots();
    const socket = getSocket();
    const handleKOTUpdate = () => fetchKots();

    socket.on('kot_updated', handleKOTUpdate);
    return () => {
      socket.off('kot_updated', handleKOTUpdate);
    };
  }, [activeBranch?.id]);

  const handleUpdateStatus = async (kotId: string, status: KitchenStatus) => {
    try {
      await ApiClient.put(`/restaurant/kots/${kotId}/status`, { status });
      fetchKots();
    } catch (err: any) {
      alert(err.message || 'Failed to update KOT status');
    }
  };

  const handleCancelKOT = async () => {
    if (!cancelModalKot) return;
    try {
      await ApiClient.post(`/restaurant/kots/${cancelModalKot.id}/cancel`, {
        reason: cancelReason.trim() || 'Item unavailable / Guest cancelled'
      });
      setCancelModalKot(null);
      setCancelReason('');
      fetchKots();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel KOT');
    }
  };

  const getElapsedTime = (createdAt: string) => {
    const diff = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
    if (diff < 1) return 'Just now';
    if (diff === 1) return '1 min ago';
    return `${diff} mins ago`;
  };

  const activeKots = kots.filter((k) => k.status !== KitchenStatus.SERVED && k.status !== KitchenStatus.CANCELLED);
  const filteredKots = statusFilter === 'ALL' ? activeKots : activeKots.filter((k) => k.status === statusFilter);

  const newCount = activeKots.filter((k) => k.status === KitchenStatus.NEW).length;
  const prepCount = activeKots.filter((k) => k.status === KitchenStatus.PREPARING).length;
  const readyCount = activeKots.filter((k) => k.status === KitchenStatus.READY).length;

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#E2E8F0] p-5 rounded-lg shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] flex items-center justify-center font-bold">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#0F172A] tracking-tight">Kitchen Display Screen (KDS)</h2>
            <p className="text-xs text-[#64748B]">Real-time Kitchen Order Tickets, station queues, and prep dispatch.</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#047857] bg-[#ECFDF5] px-2.5 py-1 rounded-md border border-[#A7F3D0]">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span>Live WebSocket Feed</span>
          </div>

          <button
            onClick={fetchKots}
            className="p-1.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#64748B] border border-[#CBD5E1] rounded-md text-xs transition"
            title="Refresh Tickets"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
            statusFilter === 'ALL'
              ? 'bg-[#0F172A] text-white shadow-xs'
              : 'bg-white text-[#64748B] border border-[#E2E8F0] hover:bg-[#F8FAFC]'
          }`}
        >
          All Active ({activeKots.length})
        </button>
        <button
          onClick={() => setStatusFilter(KitchenStatus.NEW)}
          className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
            statusFilter === KitchenStatus.NEW
              ? 'bg-[#EA580C] text-white shadow-xs'
              : 'bg-white text-[#EA580C] border border-[#FED7AA] hover:bg-[#FFF7ED]'
          }`}
        >
          New ({newCount})
        </button>
        <button
          onClick={() => setStatusFilter(KitchenStatus.PREPARING)}
          className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
            statusFilter === KitchenStatus.PREPARING
              ? 'bg-[#D97706] text-white shadow-xs'
              : 'bg-white text-[#D97706] border border-[#FDE68A] hover:bg-[#FFFBEB]'
          }`}
        >
          Preparing ({prepCount})
        </button>
        <button
          onClick={() => setStatusFilter(KitchenStatus.READY)}
          className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
            statusFilter === KitchenStatus.READY
              ? 'bg-[#10B981] text-white shadow-xs'
              : 'bg-white text-[#10B981] border border-[#A7F3D0] hover:bg-[#ECFDF5]'
          }`}
        >
          Ready ({readyCount})
        </button>
      </div>

      {/* Tickets Board */}
      {filteredKots.length === 0 ? (
        <div className="bg-white p-16 rounded-lg border border-[#E2E8F0] text-center text-[#94A3B8] shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
          <ChefHat className="w-12 h-12 mx-auto mb-2 stroke-1 text-[#CBD5E1]" />
          <h3 className="text-base font-bold text-[#0F172A]">Kitchen Queue is Clear</h3>
          <p className="text-xs text-[#64748B] mt-0.5">No pending tickets in this status.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredKots.map((kot) => {
            const isNew = kot.status === KitchenStatus.NEW;
            const isPrep = kot.status === KitchenStatus.PREPARING;
            const isReady = kot.status === KitchenStatus.READY;
            const isTakeaway = kot.tableNumber?.toUpperCase().includes('TKW') || kot.tableNumber === 'TAKEAWAY';

            return (
              <div
                key={kot.id}
                className={`bg-white rounded-lg border overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.035)] flex flex-col justify-between ${
                  isNew
                    ? 'border-[#FED7AA]'
                    : isPrep
                    ? 'border-[#FDE68A]'
                    : 'border-[#A7F3D0]'
                }`}
              >
                {/* Header */}
                <div
                  className={`p-3.5 flex items-center justify-between text-xs font-semibold ${
                    isNew
                      ? 'bg-[#FFF7ED] text-[#C2410C]'
                      : isPrep
                      ? 'bg-[#FFFBEB] text-[#B45309]'
                      : 'bg-[#ECFDF5] text-[#047857]'
                  }`}
                >
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-base font-black text-[#0F172A]">
                        {isTakeaway ? '🥡 Takeaway' : `Table ${kot.tableNumber}`}
                      </span>
                      <span className="text-[10px] font-mono text-[#64748B] font-normal">
                        ({kot.kotNumber})
                      </span>
                    </div>
                    <div className="text-[10px] text-[#64748B] mt-0.5">
                      Server: <strong>{kot.waiterName || 'Staff'}</strong>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        isNew
                          ? 'bg-white text-[#C2410C] border-[#FED7AA]'
                          : isPrep
                          ? 'bg-white text-[#B45309] border-[#FDE68A]'
                          : 'bg-white text-[#047857] border-[#A7F3D0]'
                      }`}
                    >
                      {kot.status}
                    </span>
                    <div className="text-[10px] text-[#64748B] mt-1 flex items-center justify-end space-x-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{getElapsedTime(kot.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Items List */}
                <div className="p-4 flex-1 space-y-2 text-xs">
                  {kot.items?.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex justify-between items-start py-1.5 border-b border-[#EDF1F5] text-xs"
                    >
                      <div className="pr-2">
                        <div className="font-bold text-[#0F172A] text-sm">{item.name}</div>
                        {item.notes ? (
                          <div className="text-[11px] text-[#EA580C] italic">Note: {item.notes}</div>
                        ) : null}
                      </div>
                      <span className="text-base font-black text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded">
                        × {item.quantity}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Action Footer */}
                <div className="p-3 bg-[#F8FAFC] border-t border-[#EDF1F5] flex items-center justify-between space-x-2">
                  <button
                    onClick={() => setCancelModalKot(kot)}
                    className="p-1.5 text-[#94A3B8] hover:text-[#EF4444] rounded transition"
                    title="Void / Cancel Ticket"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>

                  <div className="flex-1 flex justify-end">
                    {isNew && (
                      <button
                        onClick={() => handleUpdateStatus(kot.id, KitchenStatus.PREPARING)}
                        className="w-full btn-primary flex items-center justify-center space-x-1.5"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Start Preparing</span>
                      </button>
                    )}
                    {isPrep && (
                      <button
                        onClick={() => handleUpdateStatus(kot.id, KitchenStatus.READY)}
                        className="w-full px-3 py-2 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold rounded-md shadow-2xs transition flex items-center justify-center space-x-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark Ready to Serve</span>
                      </button>
                    )}
                    {isReady && (
                      <button
                        onClick={() => handleUpdateStatus(kot.id, KitchenStatus.SERVED)}
                        className="w-full btn-secondary flex items-center justify-center space-x-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#047857]" />
                        <span>Dispatched / Served</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel KOT Modal */}
      {cancelModalKot && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-lg shadow-xl border border-[#E2E8F0] p-5 space-y-4 animate-in fade-in zoom-in-95 text-xs">
            <h3 className="text-sm font-bold text-[#0F172A]">
              Cancel KOT {cancelModalKot.kotNumber}
            </h3>
            <p className="text-[#64748B]">
              Are you sure you want to cancel this ticket for Table {cancelModalKot.tableNumber}? This action will be audited.
            </p>

            <div>
              <label className="block font-semibold text-[#334155] mb-1">Cancellation Reason</label>
              <input
                type="text"
                placeholder="e.g. Out of stock, Customer cancelled"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 border border-[#CBD5E1] rounded-md focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setCancelModalKot(null)}
                className="btn-secondary"
              >
                Back
              </button>
              <button
                onClick={handleCancelKOT}
                className="px-3 py-1.5 bg-[#EF4444] hover:bg-[#DC2626] text-white rounded font-bold transition"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
