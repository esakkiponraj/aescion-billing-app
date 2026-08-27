import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Store,
  CreditCard,
  QrCode,
  Globe,
  AlertTriangle,
  Clock,
  UtensilsCrossed,
  Wrench,
  Pill,
  Truck,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../store/authContext';
import { ApiClient } from '../../services/api';
import { formatCurrencyINR } from '@aescion/shared-utils';
import { BusinessType } from '@aescion/shared-types';

export const DashboardPulse: React.FC = () => {
  const { user, organization, activeBranch } = useAuth();
  const navigate = useNavigate();

  const [period, setPeriod] = useState<'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM'>('TODAY');
  const [pulseData, setPulseData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPulse = async () => {
    setIsLoading(true);
    try {
      const data = await ApiClient.get<any>(`/reports/dashboard-pulse?period=${period}`);
      setPulseData(data);
    } catch (err) {
      console.error('Failed to fetch pulse data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPulse();
  }, [period, activeBranch?.id]);

  const businessType = (organization?.businessType as BusinessType) || BusinessType.SUPERMARKET;

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* 1. Header & Live Indicator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
        <div>
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#059669] mb-1">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span className="uppercase tracking-wider text-[10px]">Live Real-Time Engine Active</span>
          </div>
          <h1 className="text-2xl font-semibold text-[#0F172A] tracking-tight">
            Welcome, {user?.firstName || 'User'}
          </h1>
          <div className="text-xs font-normal text-[#64748B] mt-1 flex items-center space-x-2">
            <span>Business: <strong className="text-[#334155] font-medium">{organization?.name}</strong></span>
            <span>•</span>
            <span>Branch: <strong className="text-[#334155] font-medium">{activeBranch?.name}</strong></span>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={fetchPulse}
            disabled={isLoading}
            className="px-3.5 py-2 bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#64748B] text-xs font-medium rounded-md transition flex items-center space-x-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.02)]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Feed</span>
          </button>

          <button
            onClick={() => navigate('/pos')}
            className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white text-xs font-semibold rounded-md shadow-sm transition flex items-center space-x-2"
          >
            <Zap className="w-3.5 h-3.5 fill-white" />
            <span>Fast Billing (POS)</span>
          </button>
        </div>
      </div>

      {/* 2. Revenue Period Filter Tabs */}
      <div className="bg-white p-3.5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
        <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Revenue Filter</span>
          <span className="text-[10px] text-[#94A3B8] font-mono">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 bg-[#F1F5F9] p-1 rounded-md">
          {[
            { id: 'TODAY', label: 'Today' },
            { id: 'THIS_WEEK', label: 'This Week' },
            { id: 'THIS_MONTH', label: 'This Month' },
            { id: 'CUSTOM', label: 'Custom' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPeriod(tab.id as any)}
              className={`py-1.5 text-xs font-medium rounded transition ${
                period === tab.id
                  ? 'bg-[#2563EB] text-white font-semibold shadow-xs'
                  : 'text-[#334155] hover:bg-[#EAF2FF] hover:text-[#1D4ED8]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Today Revenue */}
        <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] border-l-4 border-l-[#2563EB] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#475569] uppercase tracking-wider text-[11px]">
              {period === 'TODAY' ? 'Today Revenue' : 'Total Revenue'}
            </span>
            <span className="text-[10px] font-semibold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] px-1.5 py-0.5 rounded">Live</span>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold text-[#0F172A] tracking-tight">
              {formatCurrencyINR(pulseData?.totalRevenue || 0)}
            </div>
            <div className="text-xs text-[#64748B] mt-0.5">
              {pulseData?.completedBills || 0} completed bill(s)
            </div>
          </div>
        </div>

        {/* KPI 2: Estimated Gross Margin */}
        <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] border-l-4 border-l-[#10B981] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#475569] uppercase tracking-wider text-[11px]">Gross Margin</span>
            <TrendingUp className="w-4 h-4 text-[#10B981]" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold text-[#0F172A] tracking-tight">
              {formatCurrencyINR(pulseData?.estimatedProfit || 0)}
            </div>
            <div className="text-xs text-[#047857] mt-0.5 font-medium">
              Tax Compliant Settlement
            </div>
          </div>
        </div>

        {/* KPI 3: Operational Branch */}
        <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] border-l-4 border-l-[#F97316] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#475569] uppercase tracking-wider text-[11px]">Active Outlet</span>
            <Store className="w-4 h-4 text-[#F97316]" />
          </div>
          <div className="my-2">
            <div className="text-lg font-bold text-[#0F172A] truncate">
              {activeBranch?.name || 'Main Branch'}
            </div>
            <div className="text-xs text-[#C2410C] mt-0.5 font-medium">
              Code: {activeBranch?.code || 'MAIN'}
            </div>
          </div>
        </div>

        {/* KPI 4: Pending Receivables */}
        <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] border-l-4 border-l-[#8B5CF6] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#475569] uppercase tracking-wider text-[11px]">Receivables</span>
            <DollarSign className="w-4 h-4 text-[#8B5CF6]" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold text-[#0F172A] tracking-tight">
              {formatCurrencyINR(pulseData?.pendingReceivables || 0)}
            </div>
            <div className="text-xs text-[#6D28D9] mt-0.5 font-medium">
              Customer Credit Due
            </div>
          </div>
        </div>
      </div>

      {/* 4. Live Tender Collections Breakdown */}
      <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
        <h3 className="text-sm font-semibold text-[#0F172A] mb-3 flex items-center space-x-2">
          <span>Realtime Payment Collections Breakdown</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-[#FAFBFC] rounded-lg border border-[#EDF1F5]">
            <div className="text-[11px] font-semibold text-[#047857] flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
              <span>Cash in Drawer</span>
            </div>
            <div className="text-lg font-bold text-[#0F172A] mt-1">
              {formatCurrencyINR(pulseData?.paymentBreakdown?.CASH || 0)}
            </div>
          </div>

          <div className="p-3 bg-[#FAFBFC] rounded-lg border border-[#EDF1F5]">
            <div className="text-[11px] font-semibold text-[#1D4ED8] flex items-center space-x-1">
              <QrCode className="w-3 h-3 text-[#2563EB]" />
              <span>UPI / QR Net</span>
            </div>
            <div className="text-lg font-bold text-[#0F172A] mt-1">
              {formatCurrencyINR(pulseData?.paymentBreakdown?.UPI || 0)}
            </div>
          </div>

          <div className="p-3 bg-[#FAFBFC] rounded-lg border border-[#EDF1F5]">
            <div className="text-[11px] font-semibold text-[#C2410C] flex items-center space-x-1">
              <CreditCard className="w-3 h-3 text-[#F97316]" />
              <span>Card POS Swipes</span>
            </div>
            <div className="text-lg font-bold text-[#0F172A] mt-1">
              {formatCurrencyINR(pulseData?.paymentBreakdown?.CARD || 0)}
            </div>
          </div>

          <div className="p-3 bg-[#FAFBFC] rounded-lg border border-[#EDF1F5]">
            <div className="text-[11px] font-semibold text-[#6D28D9] flex items-center space-x-1">
              <DollarSign className="w-3 h-3 text-[#8B5CF6]" />
              <span>Customer Credit</span>
            </div>
            <div className="text-lg font-bold text-[#0F172A] mt-1">
              {formatCurrencyINR(pulseData?.paymentBreakdown?.CREDIT || 0)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
