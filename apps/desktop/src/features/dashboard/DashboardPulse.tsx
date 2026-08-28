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
  CheckCircle2,
  FileText,
  Receipt,
  FileSpreadsheet,
  Package,
  Users
} from 'lucide-react';
import { useAuth } from '../../store/authContext';
import { ApiClient } from '../../services/api';
import { subscribeToRealtime } from '../../services/socket';
import { formatCurrencyINR } from '@aescion/shared-utils';
import { BusinessType } from '@aescion/shared-types';

export const DashboardPulse: React.FC = () => {
  const { user, organization, activeBranch } = useAuth();
  const navigate = useNavigate();

  const [period, setPeriod] = useState<'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM'>('TODAY');
  const [pulseData, setPulseData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPulse = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
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
    fetchPulse(true);

    // Live WebSocket subscriptions for zero-click realtime updates
    const unsubPulse = subscribeToRealtime('pulse_updated', () => fetchPulse(false));
    const unsubInvoice = subscribeToRealtime('invoice_created', () => fetchPulse(false));
    const unsubQuotation = subscribeToRealtime('quotation_updated', () => fetchPulse(false));
    const unsubPayment = subscribeToRealtime('payment_created', () => fetchPulse(false));
    const unsubWholesale = subscribeToRealtime('wholesale_order_updated', () => fetchPulse(false));
    const unsubCustomer = subscribeToRealtime('customer_updated', () => fetchPulse(false));
    const unsubShift = subscribeToRealtime('shift_updated', () => fetchPulse(false));

    return () => {
      unsubPulse();
      unsubInvoice();
      unsubQuotation();
      unsubPayment();
      unsubWholesale();
      unsubCustomer();
      unsubShift();
    };
  }, [period, activeBranch?.id]);

  const businessType = (organization?.businessType as BusinessType) || BusinessType.SUPERMARKET;

  const totalRevenue = pulseData?.totalRevenue ?? pulseData?.metrics?.totalSales ?? 0;
  const invoiceCount = pulseData?.invoiceCount ?? pulseData?.completedBills ?? 0;
  const quotationCount = pulseData?.quotationCount ?? 0;
  const receiptCount = pulseData?.receiptCount ?? 0;
  const salesOrderCount = pulseData?.salesOrderCount ?? 0;
  const pendingDispatches = pulseData?.pendingDispatches ?? 0;
  const receivables = pulseData?.customerReceivables ?? pulseData?.pendingReceivables ?? 0;
  const supplierPayables = pulseData?.supplierPayables ?? 0;

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* 1. Header & Live Indicator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
        <div>
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#059669] mb-1">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span className="uppercase tracking-wider text-[10px]">Authoritative Live Engine Active</span>
          </div>
          <h1 className="text-2xl font-semibold text-[#0F172A] tracking-tight">
            Welcome, {user?.firstName || 'Owner'}
          </h1>
          <div className="text-xs font-normal text-[#64748B] mt-1 flex items-center space-x-2">
            <span>Business: <strong className="text-[#334155] font-medium">{organization?.name}</strong></span>
            <span>•</span>
            <span>Active Branch: <strong className="text-[#334155] font-medium">{activeBranch?.name}</strong></span>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => fetchPulse(true)}
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

      {/* 2. Period Filter Selector */}
      <div className="bg-white p-3.5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] flex items-center justify-between">
        <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
          Time Period Scope
        </div>
        <div className="flex bg-[#F1F5F9] p-1 rounded-md">
          {[
            { id: 'TODAY', label: 'Today' },
            { id: 'THIS_WEEK', label: 'This Week' },
            { id: 'THIS_MONTH', label: 'This Month' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPeriod(tab.id as any)}
              className={`px-3 py-1 text-xs font-semibold rounded transition ${
                period === tab.id
                  ? 'bg-[#2563EB] text-white shadow-2xs'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Primary Financial & Revenue KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] border-l-4 border-l-[#2563EB] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-[#475569] uppercase text-[11px]">
            <span>Total Revenue</span>
            <DollarSign className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold text-[#0F172A] tracking-tight">
              {formatCurrencyINR(totalRevenue)}
            </div>
            <div className="text-xs text-[#64748B] mt-0.5">
              Avg Bill: {formatCurrencyINR(pulseData?.avgBasket || 0)}
            </div>
          </div>
        </div>

        {/* Estimated Margin */}
        <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] border-l-4 border-l-[#10B981] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-[#475569] uppercase text-[11px]">
            <span>Net Gross Margin</span>
            <TrendingUp className="w-4 h-4 text-[#10B981]" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold text-[#0F172A] tracking-tight">
              {formatCurrencyINR(pulseData?.estimatedProfit || 0)}
            </div>
            <div className="text-xs text-[#047857] mt-0.5 font-medium">
              Tax Compliant Realized (22%)
            </div>
          </div>
        </div>

        {/* Customer Receivables */}
        <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] border-l-4 border-l-[#8B5CF6] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-[#475569] uppercase text-[11px]">
            <span>Customer Receivables</span>
            <Users className="w-4 h-4 text-[#8B5CF6]" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold text-[#0F172A] tracking-tight">
              {formatCurrencyINR(receivables)}
            </div>
            <div className="text-xs text-[#6D28D9] mt-0.5 font-medium">
              Outstanding Credit Balance
            </div>
          </div>
        </div>

        {/* Supplier Payables */}
        <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] border-l-4 border-l-[#F97316] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-[#475569] uppercase text-[11px]">
            <span>Supplier Payables</span>
            <Truck className="w-4 h-4 text-[#F97316]" />
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold text-[#0F172A] tracking-tight">
              {formatCurrencyINR(supplierPayables)}
            </div>
            <div className="text-xs text-[#C2410C] mt-0.5 font-medium">
              Pending PO Commitments
            </div>
          </div>
        </div>
      </div>

      {/* 4. Live Commercial Counter Tiles (Quotations, Invoices, Receipts, Orders, Dispatches) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Invoices Counter */}
        <div
          onClick={() => navigate('/invoices')}
          className="bg-white p-3.5 rounded-lg border border-[#E2E8F0] hover:border-[#2563EB] cursor-pointer transition shadow-2xs group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748B] group-hover:text-[#2563EB] uppercase">Invoices Billed</span>
            <FileText className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div className="text-xl font-bold text-[#0F172A] mt-1.5">{invoiceCount}</div>
          <span className="text-[10px] text-[#64748B] flex items-center space-x-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            <span>Live Authoritative</span>
          </span>
        </div>

        {/* Quotations Counter */}
        <div
          onClick={() => navigate('/quotations')}
          className="bg-white p-3.5 rounded-lg border border-[#E2E8F0] hover:border-[#3B82F6] cursor-pointer transition shadow-2xs group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748B] group-hover:text-[#3B82F6] uppercase">Quotations</span>
            <FileSpreadsheet className="w-4 h-4 text-[#3B82F6]" />
          </div>
          <div className="text-xl font-bold text-[#0F172A] mt-1.5">{quotationCount}</div>
          <span className="text-[10px] text-[#64748B] flex items-center space-x-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
            <span>Active Estimates</span>
          </span>
        </div>

        {/* Receipts Counter */}
        <div
          onClick={() => navigate('/receipts')}
          className="bg-white p-3.5 rounded-lg border border-[#E2E8F0] hover:border-[#10B981] cursor-pointer transition shadow-2xs group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748B] group-hover:text-[#10B981] uppercase">Receipts Generated</span>
            <Receipt className="w-4 h-4 text-[#10B981]" />
          </div>
          <div className="text-xl font-bold text-[#0F172A] mt-1.5">{receiptCount}</div>
          <span className="text-[10px] text-[#64748B] flex items-center space-x-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            <span>Settled Vouchers</span>
          </span>
        </div>

        {/* Sales Orders Counter */}
        <div
          onClick={() => navigate('/wholesale')}
          className="bg-white p-3.5 rounded-lg border border-[#E2E8F0] hover:border-[#6366F1] cursor-pointer transition shadow-2xs group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748B] group-hover:text-[#6366F1] uppercase">Sales Orders</span>
            <Package className="w-4 h-4 text-[#6366F1]" />
          </div>
          <div className="text-xl font-bold text-[#0F172A] mt-1.5">{salesOrderCount}</div>
          <span className="text-[10px] text-[#64748B] flex items-center space-x-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1]" />
            <span>Wholesale B2B</span>
          </span>
        </div>

        {/* Pending Dispatches Counter */}
        <div
          onClick={() => navigate('/wholesale')}
          className="bg-white p-3.5 rounded-lg border border-[#E2E8F0] hover:border-[#F97316] cursor-pointer transition shadow-2xs group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#64748B] group-hover:text-[#F97316] uppercase">Pending Dispatch</span>
            <Truck className="w-4 h-4 text-[#F97316]" />
          </div>
          <div className="text-xl font-bold text-[#0F172A] mt-1.5">{pendingDispatches}</div>
          <span className="text-[10px] text-[#C2410C] font-semibold mt-0.5 block">
            Needs Allocation
          </span>
        </div>
      </div>

      {/* 5. Live Tender Collections Breakdown */}
      <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#0F172A] flex items-center space-x-2">
            <span>Realtime Settlement by Payment Method</span>
          </h3>
          <span className="text-xs font-bold text-[#0F172A]">
            Total Collected: {formatCurrencyINR(pulseData?.paymentBreakdown?.total || 0)}
          </span>
        </div>
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
