import React, { useState, useEffect } from 'react';
import { Store, Plus, MapPin, Phone, CheckCircle2, X, Edit2, Monitor, RefreshCw } from 'lucide-react';
import { ApiClient } from '../../services/api';
import { useAuth } from '../../store/authContext';

export const BranchesView: React.FC = () => {
  const { branches, refreshSession, activeBranch, switchBranch } = useAuth();
  const [allBranches, setAllBranches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddRegisterOpen, setIsAddRegisterOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<any | null>(null);

  const [branchForm, setBranchForm] = useState({
    name: '',
    code: '',
    address: '',
    city: 'Chennai',
    state: 'Tamil Nadu',
    phone: ''
  });

  const [registerForm, setRegisterForm] = useState({
    name: '',
    code: ''
  });

  const fetchBranches = async () => {
    setIsLoading(true);
    try {
      const data = await ApiClient.get<any[]>('/branches');
      setAllBranches(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const openCreateBranch = () => {
    setBranchForm({ name: '', code: '', address: '', city: 'Chennai', state: 'Tamil Nadu', phone: '' });
    setIsAddModalOpen(true);
  };

  const openEditBranch = (b: any) => {
    setSelectedBranch(b);
    setBranchForm({
      name: b.name,
      code: b.code,
      address: b.address || '',
      city: b.city || '',
      state: b.state || '',
      phone: b.phone || ''
    });
    setIsEditModalOpen(true);
  };

  const openAddRegister = (b: any) => {
    setSelectedBranch(b);
    const nextIndex = (b.registers?.length || 0) + 1;
    setRegisterForm({
      name: `${b.code}-REG-0${nextIndex}`,
      code: `REG-0${nextIndex}`
    });
    setIsAddRegisterOpen(true);
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiClient.post('/branches', branchForm);
      setIsAddModalOpen(false);
      fetchBranches();
      refreshSession();
    } catch (err: any) {
      alert(err.message || 'Failed to create branch');
    }
  };

  const handleUpdateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;
    try {
      await ApiClient.put(`/branches/${selectedBranch.id}`, branchForm);
      setIsEditModalOpen(false);
      alert('Branch details updated successfully!');
      fetchBranches();
      refreshSession();
    } catch (err: any) {
      alert(err.message || 'Failed to update branch');
    }
  };

  const handleCreateRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;
    try {
      await ApiClient.post(`/branches/${selectedBranch.id}/registers`, registerForm);
      setIsAddRegisterOpen(false);
      fetchBranches();
    } catch (err: any) {
      alert(err.message || 'Failed to add register');
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
        <div>
          <h2 className="text-xl font-semibold text-[#0F172A] flex items-center space-x-2">
            <Store className="w-5 h-5 text-[#2563EB]" />
            <span>Store Outlets & Billing Counters</span>
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">Manage multi-branch retail stores, physical locations, and POS counter terminals.</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchBranches}
            className="p-2 text-[#64748B] hover:text-[#0F172A] bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] rounded-md transition"
            title="Refresh Branches"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateBranch}
            className="btn-primary"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Outlet / Branch</span>
          </button>
        </div>
      </div>

      {/* Branches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-10 text-center text-[#94A3B8] bg-white rounded-lg border border-[#E2E8F0]">
            <RefreshCw className="w-4 h-4 animate-spin text-[#2563EB] mx-auto mb-2" />
            <span>Loading branch network...</span>
          </div>
        ) : allBranches.length === 0 ? (
          <div className="col-span-full py-10 text-center text-[#94A3B8] bg-white rounded-lg border border-[#E2E8F0]">
            No branches configured.
          </div>
        ) : (
          allBranches.map((b) => {
            const isActive = activeBranch?.id === b.id;

            return (
              <div
                key={b.id}
                className={`bg-white rounded-lg border transition shadow-[0_1px_2px_rgba(15,23,42,0.035)] p-5 flex flex-col justify-between space-y-4 ${
                  isActive ? 'border-[#2563EB] ring-1 ring-[#2563EB]/20' : 'border-[#E2E8F0]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] rounded text-[10px] font-semibold uppercase">
                      Code: {b.code}
                    </span>
                    {isActive ? (
                      <span className="px-2 py-0.5 bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] rounded text-[10px] font-semibold flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Active Session</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => switchBranch(b.id)}
                        className="text-[11px] font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
                      >
                        Switch to Outlet
                      </button>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-[#0F172A]">{b.name}</h3>
                  <div className="space-y-1 mt-2 text-xs text-[#64748B]">
                    <div className="flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#94A3B8] flex-shrink-0" />
                      <span className="truncate">{b.address ? `${b.address}, ` : ''}{b.city}, {b.state}</span>
                    </div>
                    {b.phone && (
                      <div className="flex items-center space-x-1.5">
                        <Phone className="w-3.5 h-3.5 text-[#94A3B8] flex-shrink-0" />
                        <span>{b.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Registers / Billing Counters */}
                <div className="pt-3 border-t border-[#EDF1F5] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#334155] flex items-center space-x-1">
                      <Monitor className="w-3.5 h-3.5 text-[#2563EB]" />
                      <span>Billing Registers ({b.registers?.length || 0})</span>
                    </span>
                    <button
                      onClick={() => openAddRegister(b)}
                      className="text-[11px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] flex items-center space-x-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Counter</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {b.registers?.length > 0 ? (
                      b.registers.map((r: any) => (
                        <span
                          key={r.id}
                          className="px-2 py-0.5 bg-[#F8FAFC] border border-[#CBD5E1] text-[#334155] rounded text-[10px] font-medium"
                        >
                          {r.name} ({r.code})
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-[#94A3B8] italic">No active POS terminals</span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#EDF1F5] flex justify-end">
                  <button
                    onClick={() => openEditBranch(b)}
                    className="px-2.5 py-1 bg-white hover:bg-[#F8FAFC] text-[#334155] hover:text-[#2563EB] border border-[#CBD5E1] rounded text-xs font-semibold flex items-center space-x-1 transition shadow-2xs"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit Details</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE BRANCH MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <h3 className="font-bold text-[#0F172A] text-sm">Create New Store Outlet</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[#334155] font-semibold mb-1">Outlet Trade Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Velachery Main Express"
                    value={branchForm.name}
                    onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                    className="w-full aescion-input"
                  />
                </div>
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Store Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. VLC"
                    value={branchForm.code}
                    onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value.toUpperCase() })}
                    className="w-full aescion-input uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#334155] font-semibold mb-1">Street Address</label>
                <input
                  type="text"
                  placeholder="e.g. 104 100 Feet Road"
                  value={branchForm.address}
                  onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                  className="w-full aescion-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">City</label>
                  <input
                    type="text"
                    value={branchForm.city}
                    onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })}
                    className="w-full aescion-input"
                  />
                </div>
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">State</label>
                  <input
                    type="text"
                    value={branchForm.state}
                    onChange={(e) => setBranchForm({ ...branchForm, state: e.target.value })}
                    className="w-full aescion-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#334155] font-semibold mb-1">Contact Phone</label>
                <input
                  type="text"
                  placeholder="e.g. 044-24569988"
                  value={branchForm.phone}
                  onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
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
                  Create Outlet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BRANCH MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <h3 className="font-bold text-[#0F172A] text-sm">Edit Outlet Details</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateBranch} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[#334155] font-semibold mb-1">Outlet Trade Name *</label>
                  <input
                    type="text"
                    required
                    value={branchForm.name}
                    onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                    className="w-full aescion-input"
                  />
                </div>
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Store Code *</label>
                  <input
                    type="text"
                    required
                    value={branchForm.code}
                    onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value.toUpperCase() })}
                    className="w-full aescion-input uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#334155] font-semibold mb-1">Street Address</label>
                <input
                  type="text"
                  value={branchForm.address}
                  onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                  className="w-full aescion-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">City</label>
                  <input
                    type="text"
                    value={branchForm.city}
                    onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })}
                    className="w-full aescion-input"
                  />
                </div>
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">State</label>
                  <input
                    type="text"
                    value={branchForm.state}
                    onChange={(e) => setBranchForm({ ...branchForm, state: e.target.value })}
                    className="w-full aescion-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#334155] font-semibold mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={branchForm.phone}
                  onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
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
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD REGISTER MODAL */}
      {isAddRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <h3 className="font-bold text-[#0F172A] text-sm">Add POS Counter for {selectedBranch?.name}</h3>
              <button onClick={() => setIsAddRegisterOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRegister} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-[#334155] font-semibold mb-1">Terminal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Counter 02 Fast Billing"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                  className="w-full aescion-input"
                />
              </div>

              <div>
                <label className="block text-[#334155] font-semibold mb-1">Register Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. REG-02"
                  value={registerForm.code}
                  onChange={(e) => setRegisterForm({ ...registerForm, code: e.target.value.toUpperCase() })}
                  className="w-full aescion-input uppercase"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddRegisterOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Add Terminal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
