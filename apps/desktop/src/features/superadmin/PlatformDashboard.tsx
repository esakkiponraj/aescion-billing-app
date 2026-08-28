import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  AlertCircle,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Clock,
  Layers,
  Store,
  ChevronRight,
  Monitor,
  Smartphone,
  Radio,
  Wifi,
  Laptop,
  CheckCircle2,
  UserCheck
} from 'lucide-react';
import { ApiClient } from '../../services/api';
import { getSocket } from '../../services/socket';

export const PlatformDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [reports, setReports] = useState<any>(null);
  const [presenceData, setPresenceData] = useState<any>({ onlineOwners: [], snapshot: {} });
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchPlatformData = useCallback(async (showFullLoading = false) => {
    if (showFullLoading) setIsLoading(true);
    setLoadError(null);
    try {
      const [statsData, reportsData, presenceData, activityData] = await Promise.all([
        ApiClient.get<any>('/super-admin/stats'),
        ApiClient.get<any>('/super-admin/reports/platform'),
        ApiClient.get<any>('/super-admin/presence'),
        ApiClient.get<any[]>('/super-admin/activity-feed?limit=8')
      ]);
      setStats(statsData);
      setReports(reportsData);
      setPresenceData(presenceData || { onlineOwners: [], snapshot: {} });
      setActivityFeed(activityData || []);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.warn('Failed to load platform stats:', err);
      setLoadError(err.message || 'Unable to fetch real-time platform data.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPlatformData(true);

    const socket = getSocket();
    if (socket) {
      socket.emit('join_super_admin');
      socket.emit('join_platform');

      const handleLivePulse = () => {
        fetchPlatformData(false);
      };

      const handlePresenceUpdate = (payload: any) => {
        if (payload?.onlineOwners) {
          setPresenceData((prev: any) => ({
            ...prev,
            onlineOwners: payload.onlineOwners,
            snapshot: {
              onlineOwnersCount: payload.onlineOwnersCount,
              activeSessionsCount: payload.activeSessionsCount
            }
          }));
          setStats((prevStats: any) => {
            if (!prevStats) return prevStats;
            const total = prevStats.totalOwners || 0;
            const online = payload.onlineOwnersCount || 0;
            return {
              ...prevStats,
              onlineOwners: online,
              offlineOwners: Math.max(0, total - online)
            };
          });
        } else {
          fetchPlatformData(false);
        }
      };

      socket.on('presence_updated', handlePresenceUpdate);
      socket.on('platform_pulse_updated', handleLivePulse);
      socket.on('platform_invoice_created', handleLivePulse);
      socket.on('platform_quotation_updated', handleLivePulse);
      socket.on('platform_payment_created', handleLivePulse);
      socket.on('platform_activity_created', handleLivePulse);
      socket.on('platform_wholesale_order_updated', handleLivePulse);
      socket.on('platform_company_status_updated', handleLivePulse);

      return () => {
        socket.off('presence_updated', handlePresenceUpdate);
        socket.off('platform_pulse_updated', handleLivePulse);
        socket.off('platform_invoice_created', handleLivePulse);
        socket.off('platform_quotation_updated', handleLivePulse);
        socket.off('platform_payment_created', handleLivePulse);
        socket.off('platform_activity_created', handleLivePulse);
        socket.off('platform_wholesale_order_updated', handleLivePulse);
        socket.off('platform_company_status_updated', handleLivePulse);
      };
    }
  }, [fetchPlatformData]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchPlatformData(false);
  };

  if (isLoading && !stats) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-500">Loading Authoritative Platform Metrics & Live Presence...</span>
      </div>
    );
  }

  if (loadError && !stats) {
    return (
      <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col items-center text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-rose-600" />
        <h3 className="text-base font-bold text-rose-900">Platform Data Unavailable</h3>
        <p className="text-xs text-rose-700 max-w-md">{loadError}</p>
        <button
          onClick={() => fetchPlatformData(true)}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const totalRevenue = stats?.totalPlatformRevenue || 0;
  const totalInvoices = stats?.totalInvoices || 0;
  const totalQuotations = stats?.totalQuotations || 0;
  const totalReceipts = stats?.totalReceipts || 0;
  const totalReceivables = stats?.totalReceivables || 0;
  const totalOwners = stats?.totalOwners || 0;
  const onlineOwnersCount = stats?.onlineOwners || presenceData?.onlineOwners?.length || 0;
  const offlineOwnersCount = Math.max(0, totalOwners - onlineOwnersCount);
  const desktopSessionsCount = stats?.desktopSessions ?? presenceData?.snapshot?.desktopSessionsCount ?? 0;
  const mobileSessionsCount = stats?.mobileSessions ?? presenceData?.snapshot?.mobileSessionsCount ?? 0;
  const onlineOwnersList = presenceData?.onlineOwners || [];

  const topCompanies = reports?.topCompanies || [];
  const businessDistribution = reports?.businessTypeDistribution || {};

  return (
    <div className="space-y-6 pb-12">
      {/* Top Welcome & Realtime Status Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 p-6 rounded-2xl text-white shadow-xl border border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              LIVE MULTI-TENANT ENGINE
            </span>
            <span className="text-xs text-slate-400">
              Synced: {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1.5 text-white">
            AESCION Platform Pulse
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Centralized monitoring and live presence across all registered companies.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition shadow-sm active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Live Refresh'}</span>
          </button>
          <button
            onClick={() => navigate('/super-admin/companies')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-indigo-600/30 active:scale-95"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Companies Directory</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. AUTHENTICATED OWNER PRESENCE & SESSIONS KPI MATRIX */}
      {/* ========================================================= */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Live Owner Presence & Device Sessions</h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">Authenticated via WebSocket Presence</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total Owners */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Total Owners</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-slate-900">{totalOwners}</div>
            <div className="mt-1 text-[10px] text-slate-500 font-medium">Registered business owners</div>
          </div>

          {/* Online Owners (Unique) */}
          <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">Online Owners</span>
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
            <div className="mt-2 text-2xl font-black text-emerald-700">{onlineOwnersCount}</div>
            <div className="mt-1 text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Unique owners online
            </div>
          </div>

          {/* Offline Owners */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Offline Owners</span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2 text-2xl font-black text-slate-700">{offlineOwnersCount}</div>
            <div className="mt-1 text-[10px] text-slate-500 font-medium">Not currently connected</div>
          </div>

          {/* Desktop Sessions */}
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wide">Desktop Sessions</span>
              <Monitor className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-blue-700">{desktopSessionsCount}</div>
            <div className="mt-1 text-[10px] text-blue-600 font-medium">Active desktop clients</div>
          </div>

          {/* Mobile Sessions */}
          <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wide">Mobile Sessions</span>
              <Smartphone className="w-4 h-4 text-purple-600" />
            </div>
            <div className="mt-2 text-2xl font-black text-purple-700">{mobileSessionsCount}</div>
            <div className="mt-1 text-[10px] text-purple-600 font-medium">Active mobile devices</div>
          </div>

          {/* Active Companies */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Active Companies</span>
              <Building2 className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="mt-2 text-2xl font-black text-indigo-600">{stats?.activeCompanies || 0}</div>
            <div className="mt-1 text-[10px] text-slate-500 font-medium">of {stats?.totalCompanies || 0} registered</div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. LIVE ACTIVE OWNERS ROSTER PANEL (CLICK TO DRILL-DOWN) */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-800">Live Active Owners Right Now</h3>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
              {onlineOwnersList.length} Connected
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Click any Owner to inspect isolated tenant workspace</span>
        </div>

        {onlineOwnersList.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center space-y-2">
            <Radio className="w-8 h-8 text-slate-300 animate-pulse" />
            <div className="text-xs font-bold text-slate-600">No Owners currently connected to realtime socket.</div>
            <p className="text-[11px] text-slate-400 max-w-sm">
              When an Owner logs in via AESCION Desktop or Mobile, their authenticated presence will appear live here instantly.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {onlineOwnersList.map((owner: any) => (
              <div
                key={owner.userId}
                onClick={() => navigate(`/super-admin/companies/${owner.organizationId}`)}
                className="p-4 hover:bg-slate-50 transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition">
                    {owner.userName?.charAt(0) || 'O'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{owner.userName}</span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded">
                        {owner.roleType}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Online
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-600 font-medium">
                      <Store className="w-3.5 h-3.5 text-slate-400" />
                      <span>{owner.companyName}</span>
                      <span className="text-slate-300">•</span>
                      <span className="px-1.5 py-0.2 text-[10px] font-semibold bg-indigo-50 text-indigo-700 rounded">
                        {owner.businessType}
                      </span>
                      {owner.branchName && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-500 text-[11px]">{owner.branchName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Platform Badges & Timing */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {owner.platform === 'both' ? (
                      <span className="px-2.5 py-1 text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 rounded-lg flex items-center gap-1.5">
                        <Laptop className="w-3.5 h-3.5" />
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Desktop + Mobile (2 Sessions)</span>
                      </span>
                    ) : owner.platform === 'desktop' ? (
                      <span className="px-2.5 py-1 text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 rounded-lg flex items-center gap-1.5">
                        <Monitor className="w-3.5 h-3.5" />
                        <span>Desktop Online</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 rounded-lg flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Mobile Online</span>
                      </span>
                    )}
                  </div>

                  <div className="text-right text-[11px] text-slate-500">
                    <div>Since: {new Date(owner.connectedSince).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    <div className="text-[10px] text-slate-400">Last touch: {new Date(owner.lastSeen).toLocaleTimeString()}</div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 3. COMMERCIAL REVENUE & FINANCIAL KPIS */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Platform Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Platform Volume</span>
            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">₹{totalRevenue.toLocaleString('en-IN')}</div>
            <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Across all {stats?.totalCompanies || 0} tenants</span>
            </div>
          </div>
        </div>

        {/* Tax Invoices */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Official Invoices</span>
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{totalInvoices.toLocaleString('en-IN')}</div>
            <div className="mt-1 text-[11px] font-medium text-slate-500">
              Total commercial bills generated
            </div>
          </div>
        </div>

        {/* Quotations */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quotations / Estimates</span>
            <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{totalQuotations.toLocaleString('en-IN')}</div>
            <div className="mt-1 text-[11px] font-medium text-slate-500">
              Active commercial quotations
            </div>
          </div>
        </div>

        {/* Receipts & Payments */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Receipts Collected</span>
            <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">{totalReceipts.toLocaleString('en-IN')}</div>
            <div className="mt-1 text-[11px] font-medium text-slate-500">
              Receivables: ₹{totalReceivables.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. INDUSTRY MARKET SHARE & TOP REVENUE TENANTS */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Industry Market Share */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800">Business Type Distribution</h3>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="space-y-3">
            {Object.keys(businessDistribution).length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">No industry records available</div>
            ) : (
              Object.entries(businessDistribution).map(([type, count]: [string, any]) => {
                const pct = stats?.totalCompanies ? Math.round((count / stats.totalCompanies) * 100) : 0;
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-700">{type}</span>
                      <span className="text-slate-500">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(5, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Top Grossing Companies */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800">Top Performing Companies by Revenue</h3>
            <button
              onClick={() => navigate('/super-admin/companies')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {topCompanies.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">No revenue data recorded yet</div>
            ) : (
              topCompanies.slice(0, 5).map((comp: any, idx: number) => (
                <div
                  key={comp.id}
                  onClick={() => navigate(`/super-admin/companies/${comp.id}`)}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-200 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{comp.name}</div>
                      <div className="text-[11px] text-slate-500">{comp.businessType} • {comp.invoiceCount || 0} invoices</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-black text-slate-900 text-xs">₹{(comp.revenue || 0).toLocaleString('en-IN')}</div>
                    <span className="text-[10px] text-emerald-600 font-semibold">Authoritative</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. LIVE ACTIVITY FEED */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">Live Multi-Tenant Activity Stream</h3>
          </div>
          <button
            onClick={() => navigate('/super-admin/activity')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>Full Stream</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {activityFeed.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">No activity recorded yet</div>
        ) : (
          <div className="space-y-3">
            {activityFeed.map((act) => (
              <div
                key={act.id}
                className="flex items-start justify-between p-3 rounded-xl bg-slate-50/60 border border-slate-100 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{act.companyName}</span>
                    <span className="text-slate-300">•</span>
                    <span className="font-semibold text-slate-700">{act.userName}</span>
                    <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded">
                      {act.action}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Entity: {act.entityType} {act.entityId ? `(#${act.entityId.slice(0, 8)})` : ''}
                  </div>
                </div>
                <span className="text-[10px] font-medium text-slate-400">
                  {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
