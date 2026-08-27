import React, { useState, useEffect } from 'react';
import { ChefHat, CheckCircle2, Clock, Play, Check, AlertCircle } from 'lucide-react';
import { ApiClient } from '../../services/api';
import { useAuth } from '../../store/authContext';
import { KitchenStatus } from '@aescion/shared-types';
import { getSocket } from '../../services/socket';

export const KitchenKOTScreen: React.FC = () => {
  const { activeBranch } = useAuth();
  const [kots, setKots] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchKots = async () => {
    try {
      const data = await ApiClient.get<any[]>('/restaurant/kots');
      setKots(data.filter((k) => k.status !== 'SERVED' && k.status !== 'CANCELLED'));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKots();
    const socket = getSocket();
    socket.on('kot_updated', () => {
      fetchKots();
    });

    return () => {
      socket.off('kot_updated');
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

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      <div className="flex items-center justify-between bg-white border border-[#E2E8F0] p-5 rounded-lg shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-md bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] flex items-center justify-center font-bold">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#0F172A] tracking-tight">Kitchen Display Screen (KDS)</h2>
            <p className="text-xs text-[#64748B]">Live Kitchen Order Tickets & Realtime Prep Station</p>
          </div>
        </div>
        <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#047857] bg-[#ECFDF5] px-2.5 py-1 rounded-md border border-[#A7F3D0]">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          <span>Live WebSocket Feed</span>
        </div>
      </div>

      {kots.length === 0 ? (
        <div className="bg-white p-12 rounded-lg border border-[#E2E8F0] text-center text-[#94A3B8] shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
          <ChefHat className="w-10 h-10 mx-auto mb-2 stroke-1 text-[#CBD5E1]" />
          <h3 className="text-sm font-bold text-[#0F172A]">Kitchen is Clear</h3>
          <p className="text-xs text-[#64748B] mt-0.5">No pending orders in the kitchen queue right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {kots.map((kot) => {
            const isNew = kot.status === KitchenStatus.NEW;
            const isPrep = kot.status === KitchenStatus.PREPARING;
            const isReady = kot.status === KitchenStatus.READY;

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
                <div className={`p-3.5 flex items-center justify-between text-xs font-semibold ${
                  isNew ? 'bg-[#FFF7ED] text-[#C2410C]' : isPrep ? 'bg-[#FFFBEB] text-[#B45309]' : 'bg-[#ECFDF5] text-[#047857]'
                }`}>
                  <div>
                    <span className="text-sm font-bold text-[#0F172A]">Table {kot.tableNumber}</span>
                    <div className="text-[10px] font-mono text-[#64748B]">{kot.kotNumber}</div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${
                      isNew
                        ? 'bg-white text-[#C2410C] border-[#FED7AA]'
                        : isPrep
                        ? 'bg-white text-[#B45309] border-[#FDE68A]'
                        : 'bg-white text-[#047857] border-[#A7F3D0]'
                    }`}>
                      {kot.status}
                    </span>
                    <div className="text-[10px] text-[#64748B] mt-0.5">{new Date(kot.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>

                {/* Items */}
                <div className="p-3.5 flex-1 space-y-1.5 text-xs">
                  {kot.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between py-1 border-b border-[#EDF1F5] text-xs">
                      <span className="font-semibold text-[#0F172A]">{item.name}</span>
                      <span className="font-bold text-[#2563EB]">× {item.quantity}</span>
                    </div>
                  ))}
                </div>

                {/* Action footer */}
                <div className="p-3 bg-[#F8FAFC] border-t border-[#EDF1F5] flex justify-end space-x-2">
                  {isNew && (
                    <button
                      onClick={() => handleUpdateStatus(kot.id, KitchenStatus.PREPARING)}
                      className="w-full btn-primary"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Start Preparing</span>
                    </button>
                  )}
                  {isPrep && (
                    <button
                      onClick={() => handleUpdateStatus(kot.id, KitchenStatus.READY)}
                      className="w-full px-3 py-1.5 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-semibold rounded-md shadow-2xs transition flex items-center justify-center space-x-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Mark Ready to Serve</span>
                    </button>
                  )}
                  {isReady && (
                    <button
                      onClick={() => handleUpdateStatus(kot.id, KitchenStatus.SERVED)}
                      className="w-full btn-secondary"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#047857]" />
                      <span>Dispatched / Served</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
