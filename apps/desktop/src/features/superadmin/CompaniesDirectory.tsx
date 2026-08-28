import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  AlertOctagon,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Shield,
  Eye,
  Store,
  Layers,
  Monitor,
  Smartphone,
  Laptop,
  Clock,
  Radio
} from 'lucide-react';
import { ApiClient } from '../../services/api';
import { getSocket } from '../../services/socket';

export const CompaniesDirectory: React.FC = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [businessTypeFilter, setBusinessTypeFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  const fetchCompanies = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        search: search.trim(),
        status: statusFilter,
        businessType: businessTypeFilter
      });

      const res = await ApiClient.get<any>(`/super-admin/companies?${queryParams.toString()}`);
      setCompanies(res.data || []);
      setTotalPages(res.meta?.totalPages || 1);
      setTotalCount(res.meta?.total || 0);
    } catch (err) {
      console.warn('Failed to load companies directory:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter, businessTypeFilter]);

  useEffect(() => {
    fetchCompanies(true);

    const socket = getSocket();
    if (socket) {
      const handleRealtime = () => {
        fetchCompanies(false);
      };

      socket.on('presence_updated', handleRealtime);
      socket.on('platform_pulse_updated', handleRealtime);
      socket.on('platform_company_status_updated', handleRealtime);

      return () => {
        socket.off('presence_updated', handleRealtime);
        socket.off('platform_pulse_updated', handleRealtime);
        socket.off('platform_company_status_updated', handleRealtime);
      };
    }
  }, [fetchCompanies]);

  const handleToggleStatus = async (companyId: string, currentStatus: string, companyName: string) => {
    const isActivating = currentStatus === 'SUSPENDED';
    const confirmMsg = isActivating
      ? `Are you sure you want to activate ${companyName}?`
      : `Are you sure you want to suspend ${companyName}? Staff members will not be able to log in.`;

    if (!window.confirm(confirmMsg)) return;

    setIsUpdatingStatus(companyId);
    try {
      await ApiClient.patch(`/super-admin/companies/${companyId}/status`, {
        active: isActivating,
        reason: isActivating ? 'Reactivated by Super Admin' : 'Suspended by Super Admin'
      });
      fetchCompanies(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update company status');
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Owners & Companies Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete platform directory of all registered enterprise tenants, owners, and active accounts ({totalCount} Total)
          </p>
        </div>

        <button
          onClick={() => fetchCompanies(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search company, owner, email, phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="SUSPENDED">Suspended Only</option>
          </select>

          {/* Business Type Filter */}
          <select
            value={businessTypeFilter}
            onChange={(e) => {
              setBusinessTypeFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600"
          >
            <option value="ALL">All Industries</option>
            <option value="SUPERMARKET">Supermarket</option>
            <option value="WHOLESALE">Wholesale</option>
            <option value="RETAIL">Retail</option>
            <option value="RESTAURANT">Restaurant</option>
            <option value="PHARMACY">Pharmacy</option>
            <option value="SERVICE">Service</option>
          </select>
        </div>
      </div>

      {/* Companies Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Company / Business</th>
                <th className="py-3 px-4">Owner & Contact</th>
                <th className="py-3 px-4 text-center">Live Presence</th>
                <th className="py-3 px-4">Industry</th>
                <th className="py-3 px-4 text-center">Branches</th>
                <th className="py-3 px-4 text-center">Users</th>
                <th className="py-3 px-4 text-right">Revenue</th>
                <th className="py-3 px-4 text-center">Account Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span>Loading companies directory...</span>
                    </div>
                  </td>
                </tr>
              ) : companies.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No companies found matching the selected filter.
                  </td>
                </tr>
              ) : (
                companies.map((company) => {
                  const isSuspended = company.status === 'SUSPENDED';
                  const isOnline = company.isOnline;
                  const onlinePlatform = company.onlinePlatform;

                  return (
                    <tr
                      key={company.id}
                      className="hover:bg-slate-50/80 transition group"
                    >
                      {/* Company Name */}
                      <td className="py-3 px-4">
                        <div
                          onClick={() => navigate(`/super-admin/companies/${company.id}`)}
                          className="font-bold text-slate-900 group-hover:text-blue-600 cursor-pointer flex items-center space-x-1.5"
                        >
                          <span>{company.name}</span>
                          <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition text-blue-600" />
                        </div>
                        {company.legalName && (
                          <div className="text-[10px] text-slate-400 font-normal">{company.legalName}</div>
                        )}
                      </td>

                      {/* Owner & Contact */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{company.ownerName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{company.ownerEmail || company.email}</div>
                      </td>

                      {/* Live Presence & Platform */}
                      <td className="py-3 px-4 text-center">
                        {isOnline ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {onlinePlatform === 'both' ? (
                              <span className="flex items-center gap-1">
                                <Laptop className="w-3 h-3" />
                                <Smartphone className="w-3 h-3" />
                                <span>2 Devices</span>
                              </span>
                            ) : onlinePlatform === 'desktop' ? (
                              <span className="flex items-center gap-1">
                                <Monitor className="w-3 h-3" />
                                <span>Desktop</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Smartphone className="w-3 h-3" />
                                <span>Mobile</span>
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 text-slate-400 text-[10px]">
                            <Clock className="w-3 h-3" />
                            <span>Offline</span>
                          </div>
                        )}
                      </td>

                      {/* Industry */}
                      <td className="py-3 px-4">
                        <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                          {company.businessType?.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Branches count */}
                      <td className="py-3 px-4 text-center font-mono">
                        {company.branchesCount}
                      </td>

                      {/* Users count */}
                      <td className="py-3 px-4 text-center font-mono">
                        {company.usersCount}
                      </td>

                      {/* Revenue */}
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ₹{(company.totalRevenue || 0).toLocaleString('en-IN')}
                      </td>

                      {/* Account Status */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center space-x-1 ${
                            isSuspended
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isSuspended ? (
                            <>
                              <AlertOctagon className="w-3 h-3" />
                              <span>SUSPENDED</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>ACTIVE</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => navigate(`/super-admin/companies/${company.id}`)}
                            title="Inspect Tenant Data"
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleToggleStatus(company.id, company.status, company.name)}
                            disabled={isUpdatingStatus === company.id}
                            title={isSuspended ? 'Reactivate Company' : 'Suspend Company'}
                            className={`p-1 rounded transition cursor-pointer disabled:opacity-50 ${
                              isSuspended
                                ? 'text-emerald-600 hover:bg-emerald-50'
                                : 'text-rose-400 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing Page <span className="font-bold text-slate-800">{page}</span> of{' '}
            <span className="font-bold text-slate-800">{totalPages}</span> ({totalCount} Companies)
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
