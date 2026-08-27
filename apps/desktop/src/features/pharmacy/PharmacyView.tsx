import React, { useState, useEffect } from 'react';
import { Pill, Plus, AlertTriangle, CheckCircle2, ShieldAlert, X } from 'lucide-react';
import { ApiClient } from '../../services/api';
import { useAuth } from '../../store/authContext';
import { formatCurrencyINR } from '@aescion/shared-utils';

export const PharmacyView: React.FC = () => {
  const { activeBranch } = useAuth();
  const [medicines, setMedicines] = useState<any[]>([]);
  const [expiryAlerts, setExpiryAlerts] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'MASTER' | 'EXPIRY'>('MASTER');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [newMed, setNewMed] = useState({
    name: '',
    genericName: '',
    manufacturer: '',
    dosageForm: 'Tablet',
    hsn: '3004',
    taxRate: 12,
    mrp: 50,
    batchNumber: 'BT2026',
    manufacturingDate: '2026-01-01',
    expiryDate: '2027-12-31',
    initialQuantity: 100
  });

  const fetchPharmacyData = async () => {
    try {
      const [medData, alertData] = await Promise.all([
        ApiClient.get<any[]>('/pharmacy/medicines'),
        ApiClient.get<any>('/pharmacy/expiry-alerts')
      ]);
      setMedicines(medData);
      setExpiryAlerts(alertData);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPharmacyData();
  }, [activeBranch?.id]);

  const handleCreateMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiClient.post('/pharmacy/medicines', newMed);
      setIsAddModalOpen(false);
      fetchPharmacyData();
    } catch (err: any) {
      alert(err.message || 'Failed to add medicine');
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
        <div>
          <h2 className="text-xl font-semibold text-[#0F172A] flex items-center space-x-2">
            <Pill className="w-5 h-5 text-[#2563EB]" />
            <span>Pharmacy Medicine Master & Expiry Safety</span>
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">Medicine batch tracking, near-expiry alerts, and automated expired stock billing block.</p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex bg-[#F1F5F9] p-1 rounded-md">
            <button
              onClick={() => setActiveTab('MASTER')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition ${
                activeTab === 'MASTER' ? 'bg-[#2563EB] text-white shadow-2xs' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Medicine Directory
            </button>
            <button
              onClick={() => setActiveTab('EXPIRY')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition ${
                activeTab === 'EXPIRY' ? 'bg-[#2563EB] text-white shadow-2xs' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Batch Expiry Controls
            </button>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Medicine</span>
          </button>
        </div>
      </div>

      {/* Safety Notice Banner */}
      <div className="p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-lg flex items-center space-x-3 text-xs text-[#B91C1C]">
        <ShieldAlert className="w-4 h-4 text-[#EF4444] flex-shrink-0" />
        <div>
          <strong>Strict Clinical & Compliance Guard Active:</strong> Any medicine batch whose expiry date has passed is automatically blocked from billing in the POS and cannot be added to customer invoices.
        </div>
      </div>

      {activeTab === 'MASTER' ? (
        <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Medicine Name</th>
                <th className="py-3 px-4">Generic Composition</th>
                <th className="py-3 px-4">Dosage</th>
                <th className="py-3 px-4">Manufacturer</th>
                <th className="py-3 px-4">Active Batches</th>
                <th className="py-3 px-4">MRP (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF1F5] font-normal text-[#334155]">
              {medicines.map((m) => (
                <tr key={m.id} className="hover:bg-[#F8FBFF] transition">
                  <td className="py-3 px-4 font-semibold text-[#0F172A]">{m.name}</td>
                  <td className="py-3 px-4 text-[#64748B] italic">{m.genericName || 'N/A'}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 bg-[#F1F5F9] border border-[#E2E8F0] text-[#475569] rounded text-[10px] font-medium">
                      {m.dosageForm || 'Tablet'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#64748B]">{m.manufacturer || 'General Pharma'}</td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-[#2563EB]">{m.batches?.length || 1} Batch(es)</span>
                  </td>
                  <td className="py-3 px-4 font-bold text-[#0F172A]">{formatCurrencyINR(m.sellingPrice || m.mrp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] p-5 space-y-4">
          <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider text-[11px]">Batch Safety & Expiry Audit</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-[#FEF2F2] rounded-lg border border-[#FECACA] space-y-2">
              <div className="flex items-center space-x-1.5 text-[#B91C1C] font-semibold text-xs">
                <AlertTriangle className="w-4 h-4" />
                <span>Expired Batches (Strictly Blocked from Billing)</span>
              </div>
              <div className="text-2xl font-bold text-[#B91C1C]">
                {expiryAlerts?.expiredBatches?.length || 0} Batches
              </div>
            </div>

            <div className="p-4 bg-[#FFFBEB] rounded-lg border border-[#FDE68A] space-y-2">
              <div className="flex items-center space-x-1.5 text-[#B45309] font-semibold text-xs">
                <AlertTriangle className="w-4 h-4" />
                <span>Near Expiry (&lt; 60 Days Notice)</span>
              </div>
              <div className="text-2xl font-bold text-[#B45309]">
                {expiryAlerts?.nearExpiryBatches?.length || 0} Batches
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD MEDICINE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <h3 className="font-bold text-[#0F172A] text-sm">Add Pharmaceutical Medicine</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMedicine} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-[#334155] font-semibold mb-1">Brand Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dolo 650mg"
                  value={newMed.name}
                  onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                  className="w-full aescion-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Generic Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Paracetamol"
                    value={newMed.genericName}
                    onChange={(e) => setNewMed({ ...newMed, genericName: e.target.value })}
                    className="w-full aescion-input"
                  />
                </div>
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Dosage Form</label>
                  <select
                    value={newMed.dosageForm}
                    onChange={(e) => setNewMed({ ...newMed, dosageForm: e.target.value })}
                    className="w-full aescion-input font-medium"
                  >
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Syrup">Syrup</option>
                    <option value="Injection">Injection</option>
                    <option value="Ointment">Ointment</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Batch Number *</label>
                  <input
                    type="text"
                    required
                    value={newMed.batchNumber}
                    onChange={(e) => setNewMed({ ...newMed, batchNumber: e.target.value.toUpperCase() })}
                    className="w-full aescion-input uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Expiry Date *</label>
                  <input
                    type="date"
                    required
                    value={newMed.expiryDate}
                    onChange={(e) => setNewMed({ ...newMed, expiryDate: e.target.value })}
                    className="w-full aescion-input"
                  />
                </div>
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">MRP (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newMed.mrp}
                    onChange={(e) => setNewMed({ ...newMed, mrp: parseFloat(e.target.value) || 0 })}
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
                  Save Medicine & Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
