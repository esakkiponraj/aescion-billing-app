import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, User, CheckCircle2, Lock, X, Edit2, RefreshCw, KeyRound, UserCheck, UserX } from 'lucide-react';
import { ApiClient } from '../../services/api';
import { useAuth } from '../../store/authContext';
import { RolesView } from './RolesView';

export const TeamView: React.FC = () => {
  const { branches, user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'MEMBERS' | 'ROLES'>('MEMBERS');
  const [members, setMembers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    roleId: '',
    branchId: '',
    isActive: true
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [m, r] = await Promise.all([
        ApiClient.get<any[]>('/team/members'),
        ApiClient.get<any[]>('/team/roles')
      ]);
      setMembers(Array.isArray(m) ? m : []);
      setRoles(Array.isArray(r) ? r : []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      username: '',
      password: '',
      roleId: roles[0]?.id || '',
      branchId: '',
      isActive: true
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (m: any) => {
    setSelectedMember(m);
    setFormData({
      firstName: m.user?.firstName || '',
      lastName: m.user?.lastName || '',
      email: m.user?.email || '',
      username: m.user?.username || '',
      password: '',
      roleId: m.roleId || '',
      branchId: m.branchId || '',
      isActive: m.isActive !== undefined ? m.isActive : true
    });
    setIsEditModalOpen(true);
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiClient.post('/team/members', formData);
      setIsAddModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to add employee');
    }
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    try {
      const payload: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        roleId: formData.roleId,
        branchId: formData.branchId || null,
        isActive: formData.isActive
      };
      if (formData.password) payload.password = formData.password;
      await ApiClient.put(`/team/members/${selectedMember.id}`, payload);
      setIsEditModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update employee');
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
        <div>
          <h2 className="text-xl font-semibold text-[#0F172A] flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-[#2563EB]" />
            <span>Team & Access Control (RBAC)</span>
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">Manage staff onboarding, store assignment, and role permissions.</p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Tab Navigation */}
          <div className="flex bg-[#F1F5F9] p-1 rounded-md">
            <button
              onClick={() => setActiveTab('MEMBERS')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition ${
                activeTab === 'MEMBERS' ? 'bg-[#2563EB] text-white shadow-2xs' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Employees ({members.length})
            </button>
            <button
              onClick={() => setActiveTab('ROLES')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition ${
                activeTab === 'ROLES' ? 'bg-[#2563EB] text-white shadow-2xs' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Roles & Permissions ({roles.length})
            </button>
          </div>

          <button
            onClick={fetchData}
            className="p-2 text-[#64748B] hover:text-[#0F172A] bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] rounded-md transition"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {activeTab === 'MEMBERS' && (
            <button
              onClick={openCreateModal}
              className="btn-primary"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Staff</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'ROLES' ? (
        <RolesView roles={roles} onRefresh={fetchData} />
      ) : (
        /* Team Members List */
        <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Username & Email</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Assigned Outlet</th>
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
                      <span>Loading team members...</span>
                    </div>
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#94A3B8]">
                    No staff members registered.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id} className="hover:bg-[#F8FBFF] transition">
                    <td className="py-3 px-4 font-semibold text-[#0F172A] flex items-center space-x-2">
                      <div className="w-7 h-7 rounded bg-[#F1F5F9] text-[#334155] border border-[#CBD5E1] flex items-center justify-center font-bold text-[11px]">
                        {m.user?.firstName?.charAt(0) || 'U'}
                      </div>
                      <span>{m.user?.firstName} {m.user?.lastName}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-[#0F172A] font-medium">{m.user?.username}</div>
                      <div className="text-[11px] text-[#64748B]">{m.user?.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] rounded font-semibold text-[10px] uppercase">
                        {m.role?.name || 'Custom Staff'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#64748B]">
                      {m.branch?.name ? `${m.branch.name} (${m.branch.code})` : 'All Outlets (Global)'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded font-semibold text-[10px] uppercase border ${
                        m.isActive !== false
                          ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                          : 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]'
                      }`}>
                        {m.isActive !== false ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openEditModal(m)}
                        className="p-1 text-[#64748B] hover:text-[#2563EB] hover:bg-[#EFF6FF] rounded transition"
                        title="Edit Staff Member"
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

      {/* ADD MEMBER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <h3 className="font-bold text-[#0F172A] text-sm">Add Staff Employee</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full aescion-input"
                  />
                </div>
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full aescion-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#334155] font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full aescion-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full aescion-input"
                  />
                </div>
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Temporary Password</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full aescion-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Assign Role</label>
                  <select
                    value={formData.roleId}
                    onChange={(e) => setFormData(prev => ({ ...prev, roleId: e.target.value }))}
                    className="w-full aescion-input font-medium"
                    required
                  >
                    <option value="">-- Select Role --</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Assign Outlet</label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData(prev => ({ ...prev, branchId: e.target.value }))}
                    className="w-full aescion-input font-medium"
                  >
                    <option value="">Global / All Outlets</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
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
                  Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MEMBER MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <h3 className="font-bold text-[#0F172A] text-sm">Edit Employee Access</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateMember} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full aescion-input"
                  />
                </div>
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full aescion-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#334155] font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full aescion-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Role Assignment</label>
                  <select
                    value={formData.roleId}
                    onChange={(e) => setFormData(prev => ({ ...prev, roleId: e.target.value }))}
                    className="w-full aescion-input font-medium"
                    required
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#334155] font-semibold mb-1">Outlet Assignment</label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData(prev => ({ ...prev, branchId: e.target.value }))}
                    className="w-full aescion-input font-medium"
                  >
                    <option value="">Global / All Outlets</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#334155] font-semibold mb-1">Reset Password (Optional)</label>
                <input
                  type="password"
                  placeholder="Leave blank to preserve current password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full aescion-input"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded border-[#CBD5E1] text-[#2563EB] focus:ring-[#2563EB]"
                />
                <label htmlFor="isActiveToggle" className="font-semibold text-[#0F172A]">
                  Active Employee Account
                </label>
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
    </div>
  );
};
