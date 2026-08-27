import React, { useState, useEffect, useCallback } from 'react';
import { Store, Plus, Lock, CheckCircle2, DollarSign, AlertCircle, X, RefreshCw, Clock, History, AlertTriangle } from 'lucide-react';
import { ApiClient } from '../../services/api';
import { useAuth } from '../../store/authContext';
import { formatCurrencyINR } from '@aescion/shared-utils';

export const SupermarketShiftsView: React.FC = () => {
  const { user, activeBranch } = useAuth();
  const [shifts, setShifts] = useState<any[]>([]);
  const [activeShift, setActiveShift] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [openingFloat, setOpeningFloat] = useState<number>(2000);
  const [closingCash, setClosingCash] = useState<number>(0);
  const [closingNotes, setClosingNotes] = useState('');

  const fetchShifts = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const [allShifts, current] = await Promise.all([
        ApiClient.get<any[]>('/cashier-shifts'),
        ApiClient.get<any | null>('/cashier-shifts/active')
      ]);
      setShifts(Array.isArray(allShifts) ? allShifts : []);
      setActiveShift(current || null);
      if (current) {
        setClosingCash(current.expectedCash || 0);
      }
    } catch (err: any) {
      console.error('Error fetching cashier shifts:', err);
      setApiError(err.message || 'Failed to load shift records from server.');
    } finally {
      setIsLoading(false);
    }
  }, [activeBranch?.id]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await ApiClient.post('/cashier-shifts/open', {
        registerId: activeBranch?.id,
        openingFloat,
        openingCash: openingFloat
      });
      setIsOpenModalOpen(false);
      await fetchShifts();
    } catch (err: any) {
      alert(err.message || 'Failed to open shift');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await ApiClient.post('/cashier-shifts/close', {
        actualCashCounted: closingCash,
        actualCash: closingCash,
        notes: closingNotes
      });
      setIsCloseModalOpen(false);
      setClosingNotes('');
      await fetchShifts();
    } catch (err: any) {
      alert(err.message || 'Failed to close shift');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
        <div>
          <h2 className="text-xl font-semibold text-[#0F172A] flex items-center space-x-2">
            <Store className="w-5 h-5 text-[#2563EB]" />
            <span>Cashier Shifts & Cash Drawer Reconciliation</span>
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">Control opening floats, cashier handovers, and cash drawer variances in real time.</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchShifts}
            disabled={isLoading}
            className="p-2 text-[#64748B] hover:text-[#0F172A] bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] rounded-md transition"
            title="Refresh Shift Status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {!activeShift ? (
            <button
              onClick={() => { setOpeningFloat(2000); setIsOpenModalOpen(true); }}
              className="btn-primary"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Open Cashier Shift</span>
            </button>
          ) : (
            <button
              onClick={() => setIsCloseModalOpen(true)}
              className="px-3.5 py-2 bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-semibold rounded-md shadow-sm transition flex items-center space-x-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Close Active Shift</span>
            </button>
          )}
        </div>
      </div>

      {apiError && (
        <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] p-3.5 rounded-lg text-xs flex items-center space-x-2 font-medium">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{apiError}</span>
        </div>
      )}

      {/* Active Shift Dashboard Banner */}
      {activeShift ? (
        <div className="bg-white rounded-lg border border-[#BFDBFE] p-5 shadow-[0_1px_2px_rgba(15,23,42,0.035)] relative overflow-hidden bg-gradient-to-r from-white via-white to-[#EFF6FF]/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                <span className="text-[11px] font-semibold text-[#047857] uppercase tracking-wider">Active Shift in Progress</span>
                <span className="text-xs font-mono font-bold text-[#1D4ED8] bg-[#EFF6FF] border border-[#BFDBFE] px-2 py-0.2 rounded">
                  #{activeShift.shiftNumber || activeShift.id?.substring(0, 8)}
                </span>
              </div>
              <h3 className="text-lg font-bold text-[#0F172A]">
                Cashier: {activeShift.cashierName || user?.firstName}
              </h3>
              <div className="text-xs text-[#64748B] flex items-center space-x-3 pt-1">
                <span>Opened: {new Date(activeShift.openedAt || activeShift.startTime).toLocaleTimeString()}</span>
                <span>•</span>
                <span>Register: <strong className="text-[#334155]">{activeShift.register?.name || 'Counter 01'}</strong></span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-[#FAFBFC] rounded-lg border border-[#EDF1F5]">
                <div className="text-[10px] text-[#64748B] font-semibold uppercase">Opening Float</div>
                <div className="text-base font-bold text-[#0F172A] mt-0.5">
                  {formatCurrencyINR(activeShift.openingCash || activeShift.openingFloat || 0)}
                </div>
              </div>

              <div className="p-3 bg-[#FAFBFC] rounded-lg border border-[#EDF1F5]">
                <div className="text-[10px] text-[#047857] font-semibold uppercase">Cash Tendered</div>
                <div className="text-base font-bold text-[#047857] mt-0.5">
                  {formatCurrencyINR(activeShift.totalCashSales || 0)}
                </div>
              </div>

              <div className="p-3 bg-[#EFF6FF] rounded-lg border border-[#BFDBFE]">
                <div className="text-[10px] text-[#1D4ED8] font-semibold uppercase">Expected in Drawer</div>
                <div className="text-base font-bold text-[#1D4ED8] mt-0.5">
                  {formatCurrencyINR(activeShift.expectedCash || 0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-6 text-center shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
          <Clock className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" />
          <h3 className="text-sm font-bold text-[#0F172A]">No Active Shift on this Terminal</h3>
          <p className="text-xs text-[#64748B] max-w-md mx-auto mt-0.5">
            Open a cashier shift to record drawer floats and begin taking sales transactions.
          </p>
        </div>
      )}

      {/* Shifts History Table */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] overflow-hidden">
        <div className="p-3.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
          <span className="font-semibold text-[#0F172A] text-xs flex items-center space-x-1.5">
            <History className="w-4 h-4 text-[#2563EB]" />
            <span>Shift Reconciliations History</span>
          </span>
          <span className="text-[11px] text-[#64748B]">Total Shifts: {shifts.length}</span>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4">Shift #</th>
              <th className="py-3 px-4">Cashier</th>
              <th className="py-3 px-4">Opened</th>
              <th className="py-3 px-4">Closed</th>
              <th className="py-3 px-4">Opening Float</th>
              <th className="py-3 px-4">Counted Cash</th>
              <th className="py-3 px-4">Variance</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EDF1F5] font-normal text-[#334155]">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-[#94A3B8]">
                  Loading shift audit records...
                </td>
              </tr>
            ) : shifts.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-[#94A3B8]">
                  No shift history found.
                </td>
              </tr>
            ) : (
              shifts.map((s) => {
                const diff = s.cashDifference || 0;
                return (
                  <tr key={s.id} className="hover:bg-[#F8FBFF] transition">
                    <td className="py-3 px-4 font-mono font-bold text-[#1D4ED8]">
                      {s.shiftNumber || s.id?.substring(0, 8)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#0F172A]">{s.cashierName || 'Staff Cashier'}</td>
                    <td className="py-3 px-4 text-[#64748B]">{new Date(s.openedAt).toLocaleTimeString()}</td>
                    <td className="py-3 px-4 text-[#64748B]">{s.closedAt ? new Date(s.closedAt).toLocaleTimeString() : 'In Progress'}</td>
                    <td className="py-3 px-4">{formatCurrencyINR(s.openingCash)}</td>
                    <td className="py-3 px-4 font-bold text-[#0F172A]">{s.actualCash !== null ? formatCurrencyINR(s.actualCash) : '—'}</td>
                    <td className="py-3 px-4">
                      {s.closedAt ? (
                        diff === 0 ? (
                          <span className="text-[#047857] font-semibold">₹0.00 (Balanced)</span>
                        ) : diff > 0 ? (
                          <span className="text-[#047857] font-bold">+{formatCurrencyINR(diff)} (Surplus)</span>
                        ) : (
                          <span className="text-[#B91C1C] font-bold">{formatCurrencyINR(diff)} (Shortage)</span>
                        )
                      ) : (
                        <span className="text-[#94A3B8]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded font-semibold text-[10px] uppercase border ${
                        s.shiftStatus === 'OPEN' || s.status === 'OPEN'
                          ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                          : 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]'
                      }`}>
                        {s.shiftStatus || s.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* OPEN SHIFT MODAL */}
      {isOpenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <h3 className="font-bold text-[#0F172A] text-sm">Open Cashier Shift</h3>
              <button onClick={() => setIsOpenModalOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleOpenShift} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-[#334155] font-semibold mb-1">Opening Drawer Float (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(parseFloat(e.target.value) || 0)}
                  className="w-full aescion-input font-mono font-semibold text-sm"
                />
                <p className="text-[11px] text-[#64748B] mt-1">Starting cash in drawer at beginning of shift.</p>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsOpenModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary"
                >
                  {isSubmitting ? 'Opening...' : 'Start Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLOSE SHIFT MODAL */}
      {isCloseModalOpen && activeShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <h3 className="font-bold text-[#0F172A] text-sm">Close Cashier Shift & Reconcile</h3>
              <button onClick={() => setIsCloseModalOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCloseShift} className="p-5 space-y-3.5 text-xs">
              <div className="p-3 bg-[#EFF6FF] rounded-md border border-[#BFDBFE] flex justify-between items-center">
                <span className="text-[#1D4ED8] font-medium">Expected Drawer Balance:</span>
                <span className="text-base font-bold text-[#1D4ED8]">
                  {formatCurrencyINR(activeShift.expectedCash || 0)}
                </span>
              </div>

              <div>
                <label className="block text-[#334155] font-semibold mb-1">Physical Counted Cash (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={closingCash}
                  onChange={(e) => setClosingCash(parseFloat(e.target.value) || 0)}
                  className="w-full aescion-input font-mono font-bold text-sm"
                />
              </div>

              {closingCash !== activeShift.expectedCash && (
                <div className="p-2.5 bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] rounded-md flex items-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Variance detected: {formatCurrencyINR(closingCash - (activeShift.expectedCash || 0))}</span>
                </div>
              )}

              <div>
                <label className="block text-[#334155] font-semibold mb-1">Closing Notes / Handover Remark</label>
                <input
                  type="text"
                  placeholder="Optional handover remarks"
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  className="w-full aescion-input"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCloseModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary"
                >
                  {isSubmitting ? 'Closing Shift...' : 'Reconcile & Close'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
