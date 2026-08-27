import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Edit2, Lock, CheckCircle2, X, RefreshCw, Layers } from 'lucide-react';
import { ApiClient } from '../../services/api';
import { useAuth } from '../../store/authContext';
import { Permission } from '@aescion/capability-config';

// Grouped Permissions Hierarchy
export const PERMISSION_GROUPS: { groupName: string; permissions: { id: Permission; label: string }[] }[] = [
  {
    groupName: 'Dashboard & Reports',
    permissions: [
      { id: Permission.REPORT_SALES, label: 'View Sales Analytics & Realtime Pulse' },
      { id: Permission.REPORT_FINANCIAL, label: 'View Financial Balance Reports' },
      { id: Permission.REPORT_INVENTORY, label: 'View Stock & Inventory Reports' },
      { id: Permission.REPORT_TAX_GST, label: 'View GST Tax Ledger Reports' }
    ]
  },
  {
    groupName: 'Fast POS & Cashier Shifts',
    permissions: [
      { id: Permission.POS_ACCESS, label: 'Access Fast Billing POS Terminal' },
      { id: Permission.POS_CREATE_BILL, label: 'Generate & Print POS Counter Bills' },
      { id: Permission.POS_APPLY_DISCOUNT, label: 'Apply Manual Discounts at Checkout' },
      { id: Permission.POS_HOLD_RECALL, label: 'Hold and Recall Active POS Orders' },
      { id: Permission.POS_OVERRIDE_PRICE, label: 'Manual Unit Price Override' },
      { id: Permission.SHIFT_OPEN, label: 'Open & Manage Cashier Shift' },
      { id: Permission.SHIFT_CLOSE, label: 'Close Shift & Reconcile Drawer Cash' },
      { id: Permission.SHIFT_VIEW_ALL, label: 'View All Branch Shifts' }
    ]
  },
  {
    groupName: 'Products & Inventory',
    permissions: [
      { id: Permission.PRODUCT_VIEW, label: 'View Products & Price Lists' },
      { id: Permission.PRODUCT_CREATE, label: 'Create New Products' },
      { id: Permission.PRODUCT_UPDATE, label: 'Edit Product Pricing & Details' },
      { id: Permission.PRODUCT_DELETE, label: 'Delete Products' },
      { id: Permission.STOCK_VIEW, label: 'View Stock Balances & Ledger' },
      { id: Permission.STOCK_ADJUST, label: 'Perform Manual Stock Adjustments' },
      { id: Permission.STOCK_TRANSFER, label: 'Inter-Branch Stock Transfers' }
    ]
  },
  {
    groupName: 'Quotations & Invoices',
    permissions: [
      { id: Permission.QUOTATION_VIEW, label: 'View Quotations & Estimates' },
      { id: Permission.QUOTATION_CREATE, label: 'Create & Edit Quotations' },
      { id: Permission.QUOTATION_CONVERT, label: 'Convert Quotations to Invoices' },
      { id: Permission.INVOICE_VIEW, label: 'View Invoices & Sales Bills' },
      { id: Permission.INVOICE_CREATE, label: 'Generate Official Invoices' },
      { id: Permission.INVOICE_CANCEL, label: 'Void / Cancel Finalized Invoices' }
    ]
  },
  {
    groupName: 'Payments & Receipts',
    permissions: [
      { id: Permission.PAYMENT_COLLECT, label: 'Collect Cash, UPI & Card Payments' },
      { id: Permission.RECEIPT_REPRINT, label: 'Reprint Thermal Payment Receipts' }
    ]
  },
  {
    groupName: 'Customers & Suppliers',
    permissions: [
      { id: Permission.CUSTOMER_VIEW, label: 'View Customers Directory' },
      { id: Permission.CUSTOMER_CREATE, label: 'Add & Register Customers' },
      { id: Permission.CUSTOMER_UPDATE, label: 'Edit Customer Master Records' },
      { id: Permission.CUSTOMER_CREDIT_MANAGE, label: 'Manage Customer Credit Limits' },
      { id: Permission.SUPPLIER_VIEW, label: 'View Suppliers & Purchase Orders' },
      { id: Permission.SUPPLIER_CREATE, label: 'Create Vendors Master Records' },
      { id: Permission.PO_CREATE, label: 'Issue Purchase Orders' },
      { id: Permission.GRN_CREATE, label: 'Receive Goods (GRN Stock Intake)' }
    ]
  },
  {
    groupName: 'Team, Outlets & Settings',
    permissions: [
      { id: Permission.USER_VIEW, label: 'View Team Members' },
      { id: Permission.USER_CREATE, label: 'Create & Onboard Staff Accounts' },
      { id: Permission.USER_UPDATE, label: 'Edit Staff Roles & Outlets' },
      { id: Permission.ROLE_VIEW, label: 'View Roles & Permission Matrix' },
      { id: Permission.ROLE_CREATE, label: 'Create Custom Roles' },
      { id: Permission.ROLE_UPDATE, label: 'Modify Role Permissions' },
      { id: Permission.BRANCH_VIEW, label: 'View Stores & Outlets' },
      { id: Permission.BRANCH_CREATE, label: 'Create New Branch Outlets' },
      { id: Permission.BRANCH_UPDATE, label: 'Edit Store Outlets & Registers' },
      { id: Permission.ORG_VIEW, label: 'View Organization Profile' },
      { id: Permission.ORG_UPDATE, label: 'Modify Business Settings & GST Configuration' }
    ]
  },
  {
    groupName: 'Industry Modules',
    permissions: [
      { id: Permission.RESTAURANT_TABLES, label: 'Manage Restaurant Tables & Dining Floor' },
      { id: Permission.RESTAURANT_KOT, label: 'Dispatch Orders to Kitchen (KOT)' },
      { id: Permission.RESTAURANT_KITCHEN, label: 'Kitchen KOT Display Screen' },
      { id: Permission.SERVICE_JOB_CREATE, label: 'Create Service Repair Job Cards' },
      { id: Permission.SERVICE_JOB_UPDATE, label: 'Update Service Repair Status' },
      { id: Permission.PHARMACY_EXPIRED_MANAGE, label: 'Pharmacy Expiry & Batch Control' },
      { id: Permission.WHOLESALE_DISPATCH, label: 'Wholesale Sales Orders & Delivery Challans' }
    ]
  }
];

interface RolesViewProps {
  roles?: any[];
  onRefresh?: () => void;
}

export const RolesView: React.FC<RolesViewProps> = ({ roles: propRoles, onRefresh: propOnRefresh }) => {
  const [internalRoles, setInternalRoles] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any | null>(null);

  const fetchInternalRoles = async () => {
    try {
      const data = await ApiClient.get<any[]>('/team/roles');
      setInternalRoles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!propRoles) {
      fetchInternalRoles();
    }
  }, [propRoles]);

  const roles = propRoles || internalRoles;
  const onRefresh = propOnRefresh || fetchInternalRoles;

  const [roleForm, setRoleForm] = useState<{
    name: string;
    permissions: Permission[];
  }>({
    name: '',
    permissions: []
  });

  const openCreateModal = () => {
    setRoleForm({
      name: '',
      permissions: [
        Permission.REPORT_SALES,
        Permission.POS_ACCESS,
        Permission.POS_CREATE_BILL,
        Permission.INVOICE_VIEW,
        Permission.PRODUCT_VIEW
      ]
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (role: any) => {
    setSelectedRole(role);
    const parsedPerms: Permission[] = Array.isArray(role.permissions)
      ? role.permissions
      : typeof role.permissions === 'string'
      ? JSON.parse(role.permissions || '[]')
      : [];

    setRoleForm({
      name: role.name,
      permissions: parsedPerms
    });
    setIsEditModalOpen(true);
  };

  const togglePermission = (permId: Permission) => {
    setRoleForm(prev => {
      const exists = prev.permissions.includes(permId);
      if (exists) {
        return { ...prev, permissions: prev.permissions.filter(p => p !== permId) };
      } else {
        return { ...prev, permissions: [...prev.permissions, permId] };
      }
    });
  };

  const toggleGroup = (groupPermissions: { id: Permission }[]) => {
    const permIds = groupPermissions.map(p => p.id);
    const allSelected = permIds.every(id => roleForm.permissions.includes(id));

    if (allSelected) {
      // Deselect group
      setRoleForm(prev => ({
        ...prev,
        permissions: prev.permissions.filter(p => !permIds.includes(p))
      }));
    } else {
      // Select all in group
      setRoleForm(prev => ({
        ...prev,
        permissions: Array.from(new Set([...prev.permissions, ...permIds]))
      }));
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiClient.post('/team/roles', roleForm);
      setIsAddModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to create role');
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    try {
      await ApiClient.put(`/team/roles/${selectedRole.id}`, roleForm);
      setIsEditModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update role');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#0F172A]">Access Roles & Permission Matrix</h3>
          <p className="text-xs text-[#64748B]">Assign precise functional operational permissions across modules.</p>
        </div>

        <button
          onClick={openCreateModal}
          className="btn-primary"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Custom Role</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {roles.length === 0 ? (
          <div className="col-span-full py-10 text-center text-[#94A3B8] bg-white rounded-lg border border-[#E2E8F0]">
            No roles configured.
          </div>
        ) : (
          roles.map((role) => {
            const perms: Permission[] = Array.isArray(role.permissions)
              ? role.permissions
              : typeof role.permissions === 'string'
              ? JSON.parse(role.permissions || '[]')
              : [];

            const isOwner = role.name === 'Owner' || role.name === 'Super Admin';
            const permCount = isOwner ? 'All' : perms.length;

            return (
              <div
                key={role.id}
                className="bg-white rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] p-4 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] rounded text-[10px] font-semibold uppercase">
                      {role.isSystem ? 'System Default' : 'Custom Role'}
                    </span>
                    {isOwner && <Lock className="w-3.5 h-3.5 text-[#94A3B8]" />}
                  </div>

                  <h3 className="text-sm font-bold text-[#0F172A]">{role.name}</h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    {role.isSystem
                      ? `Pre-configured business role with ${permCount} assigned permissions.`
                      : `Organization-specific custom role with ${permCount} active permissions.`}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#EDF1F5] flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#475569]">
                    {permCount} Permissions Granted
                  </span>

                  {!isOwner ? (
                    <button
                      onClick={() => openEditModal(role)}
                      className="px-2.5 py-1 bg-white hover:bg-[#F8FAFC] text-[#2563EB] border border-[#CBD5E1] rounded text-xs font-semibold flex items-center space-x-1 transition shadow-2xs"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit Permissions</span>
                    </button>
                  ) : (
                    <span className="text-[11px] font-semibold text-[#94A3B8]">Full Access</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Role Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-lg shadow-xl border border-[#E2E8F0] overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
            <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-5 py-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#0F172A]">
                {isAddModalOpen ? 'Create Custom Role' : `Edit Permissions for "${selectedRole?.name}"`}
              </h3>
              <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="text-[#94A3B8] hover:text-[#0F172A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={isAddModalOpen ? handleCreateRole : handleUpdateRole} className="p-5 space-y-4 overflow-y-auto flex-1 bg-white text-xs">
              <div>
                <label className="block font-semibold text-[#334155] mb-1">Role Title *</label>
                <input
                  type="text"
                  required
                  disabled={selectedRole?.isSystem}
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                  placeholder="e.g. Senior Cashier & Shift Supervisor"
                  className="w-full aescion-input font-medium"
                />
              </div>

              {/* Grouped Permissions Toggles */}
              <div className="space-y-3 pt-2 border-t border-[#EDF1F5]">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0F172A] text-xs">Granted Functional Permissions</span>
                  <span className="text-[#2563EB] font-semibold">{roleForm.permissions.length} Selected</span>
                </div>

                {PERMISSION_GROUPS.map((group, gIdx) => {
                  const groupPermIds = group.permissions.map(p => p.id);
                  const isAllSelected = groupPermIds.every(id => roleForm.permissions.includes(id));

                  return (
                    <div key={gIdx} className="p-3.5 bg-[#FAFBFC] rounded-lg border border-[#EDF1F5] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#334155] text-xs uppercase tracking-wider text-[11px]">{group.groupName}</span>
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.permissions)}
                          className="text-[11px] font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
                        >
                          {isAllSelected ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {group.permissions.map((perm) => {
                          const isChecked = roleForm.permissions.includes(perm.id);

                          return (
                            <label
                              key={perm.id}
                              onClick={() => togglePermission(perm.id)}
                              className={`p-2 rounded-md border flex items-center space-x-2 cursor-pointer transition select-none ${
                                isChecked
                                  ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8] font-semibold'
                                  : 'bg-white border-[#E2E8F0] text-[#475569] hover:border-[#CBD5E1]'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="w-3.5 h-3.5 text-[#2563EB] rounded-sm border-[#CBD5E1] focus:ring-0"
                              />
                              <span className="text-[11px] leading-tight">{perm.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-[#EDF1F5] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  {isAddModalOpen ? 'Create Role' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
