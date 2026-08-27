import React, { useState } from 'react';
import {
  Zap,
  ShoppingBag,
  Store,
  Truck,
  UtensilsCrossed,
  Wrench,
  Pill,
  ShieldCheck,
  Smartphone,
  Layers,
  Database,
  ArrowRight,
  CheckCircle2,
  Lock,
  Globe,
  Printer,
  ChevronRight,
  Sparkles,
  BarChart3
} from 'lucide-react';

interface LandingPageProps {
  onOpenSignIn: () => void;
  onOpenOnboarding: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenSignIn, onOpenOnboarding }) => {
  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#334155] font-sans selection:bg-[#2563EB] selection:text-white flex flex-col">
      {/* 1. Announcement Notice Bar */}
      <div className="bg-[#1E40AF] text-white text-xs py-2 px-4 text-center font-medium flex items-center justify-center space-x-2 border-b border-[#1D4ED8]">
        <span className="bg-[#2563EB] px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase border border-[#60A5FA]/40">Release v2.0</span>
        <span>AESCION Commerce Enterprise Edition is now Live with 6 Industry Feature Packs & Multi-Branch Support</span>
        <button onClick={onOpenOnboarding} className="underline font-semibold hover:text-[#FED7AA] ml-1 inline-flex items-center">
          Get Started <ChevronRight className="w-3 h-3 ml-0.5" />
        </button>
      </div>

      {/* 2. Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-9 h-9 rounded-md bg-[#2563EB] flex items-center justify-center shadow-sm text-white font-bold text-lg tracking-tight">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-lg font-bold tracking-tight text-[#0F172A]">AESCION</span>
                <span className="text-lg font-bold tracking-tight text-[#2563EB]">Commerce</span>
              </div>
              <span className="text-[10px] text-[#64748B] font-semibold tracking-widest uppercase block -mt-1">Enterprise Business OS</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8 text-xs font-semibold text-[#475569]">
            <a href="#features" className="hover:text-[#2563EB] transition-colors">Features</a>
            <a href="#industries" className="hover:text-[#2563EB] transition-colors">Industries</a>
            <a href="#ecosystem" className="hover:text-[#2563EB] transition-colors">Desktop + Mobile</a>
            <a href="#security" className="hover:text-[#2563EB] transition-colors">Security & Offline</a>
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-2.5">
            <button
              onClick={onOpenSignIn}
              className="btn-secondary"
            >
              Sign In
            </button>
            <button
              onClick={onOpenOnboarding}
              className="btn-primary"
            >
              <span>Start Your Business</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 3. Hero Section */}
      <section className="relative pt-12 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-b from-white via-[#F8FAFC] to-[#F7F9FC]">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center space-x-2 bg-[#EFF6FF] border border-[#BFDBFE] px-3.5 py-1 rounded-md text-xs font-semibold text-[#1D4ED8] mb-6">
            <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>One Multi-Tenant Platform Adapting to 6 Business Types</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#0F172A] tracking-tight max-w-4xl mx-auto leading-tight sm:leading-none">
            Run Your Business Faster with <span className="text-[#2563EB]">AESCION Commerce</span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-[#475569] max-w-2xl mx-auto leading-relaxed">
            Billing, inventory, customers, purchases, employees and industry-specific operations across counter desktop and mobile POS terminals.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onOpenOnboarding}
              className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] rounded-md shadow-sm transition flex items-center justify-center space-x-2"
            >
              <span>Create Your Business</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenSignIn}
              className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-[#334155] bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] rounded-md shadow-2xs transition flex items-center justify-center space-x-2"
            >
              <span>Existing Customer Sign In</span>
            </button>
          </div>

          {/* Product UI Composition Mockup */}
          <div className="mt-14 relative max-w-5xl mx-auto rounded-lg p-2 bg-[#E2E8F0] shadow-lg border border-[#CBD5E1]">
            <div className="bg-white rounded-md overflow-hidden border border-[#E2E8F0]">
              {/* Mockup Window Titlebar */}
              <div className="h-8 bg-[#F8FAFC] border-b border-[#E2E8F0] px-4 flex items-center justify-between text-xs text-[#64748B] font-medium">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                  </div>
                  <span className="ml-2 text-[#334155] font-semibold text-[11px]">AESCION Commerce Desktop — Workspace Shell</span>
                </div>
                <div className="flex items-center space-x-3 text-[11px]">
                  <span className="flex items-center text-[#047857] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] inline-block mr-1.5 animate-pulse" /> Live Real-Time Engine Active
                  </span>
                </div>
              </div>

              {/* Mockup Workspace Preview */}
              <div className="p-5 bg-[#F7F9FC] text-left grid grid-cols-1 md:grid-cols-4 gap-3.5">
                <div className="md:col-span-4 bg-white p-4 rounded-lg border border-[#E2E8F0] flex items-center justify-between shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
                  <div>
                    <div className="text-[11px] font-semibold text-[#2563EB] uppercase tracking-wider">Active Workspace</div>
                    <div className="text-xl font-bold text-[#0F172A] mt-0.5">Welcome, Owner</div>
                    <div className="text-xs text-[#64748B]">Supermarket / Grocery • Flagship Branch</div>
                  </div>
                  <div className="flex items-center space-x-2.5">
                    <div className="bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] px-2.5 py-1 rounded text-xs font-semibold flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                      <span>Operational</span>
                    </div>
                    <button onClick={onOpenOnboarding} className="px-3 py-1.5 bg-[#2563EB] text-white rounded text-xs font-semibold shadow-2xs hover:bg-[#1D4ED8] transition">
                      Fast Billing (POS)
                    </button>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] border-l-4 border-l-[#2563EB]">
                  <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">Today Revenue</div>
                  <div className="text-xl font-bold text-[#0F172A] mt-0.5">₹48,920.00</div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">62 completed bills today</div>
                </div>

                <div className="bg-white p-3.5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] border-l-4 border-l-[#10B981]">
                  <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">Estimated Margin</div>
                  <div className="text-xl font-bold text-[#047857] mt-0.5">22%</div>
                  <div className="text-[11px] text-[#047857] mt-0.5">Profit: ₹10,762.40</div>
                </div>

                <div className="bg-white p-3.5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] border-l-4 border-l-[#F97316]">
                  <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">Branch Status</div>
                  <div className="text-base font-bold text-[#C2410C] mt-0.5">Flagship Branch</div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">Multi-counter operational</div>
                </div>

                <div className="bg-white p-3.5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] border-l-4 border-l-[#8B5CF6]">
                  <div className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider">Customer Credit</div>
                  <div className="text-xl font-bold text-[#0F172A] mt-0.5">₹3,450.00</div>
                  <div className="text-[11px] text-[#6D28D9] font-semibold mt-0.5">Within limits</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Industries Section */}
      <section id="industries" className="py-16 px-4 sm:px-6 lg:px-8 bg-white border-y border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-semibold text-[#2563EB] tracking-widest uppercase">Adaptive Architecture</h2>
            <p className="mt-1.5 text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
              One Operating System Tailored for 6 Industries
            </p>
            <p className="mt-3 text-[#475569] text-sm">
              No duplicate applications or redundant sidebars. The capability registry dynamically customizes navigation, terminology, fields, and workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Retail */}
            <div className="bg-[#FAFBFC] border border-[#E2E8F0] hover:border-[#2563EB] rounded-lg p-5 transition shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
              <div className="w-10 h-10 rounded-md bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] flex items-center justify-center font-bold mb-3">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-sm font-bold text-[#0F172A]">Retail Shop</h3>
                <span className="text-[10px] font-semibold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] px-2 py-0.2 rounded">Apparel & Goods</span>
              </div>
              <p className="text-xs text-[#64748B] leading-relaxed mb-3">
                Fast POS, barcode scan, product variants (size/color), stock ledger, customer loyalty, quotations, and expense management.
              </p>
              <ul className="text-xs text-[#475569] space-y-1">
                <li className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#2563EB] mr-1.5 flex-shrink-0" /> SKU & Variant matrix</li>
                <li className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#2563EB] mr-1.5 flex-shrink-0" /> Customer credit with 30/60/90 ageing</li>
                <li className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#2563EB] mr-1.5 flex-shrink-0" /> Thermal 58mm/80mm receipt printing</li>
              </ul>
            </div>

            {/* 2. Supermarket */}
            <div className="bg-[#FAFBFC] border border-[#E2E8F0] hover:border-[#10B981] rounded-lg p-5 transition shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
              <div className="w-10 h-10 rounded-md bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] flex items-center justify-center font-bold mb-3">
                <Store className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-sm font-bold text-[#0F172A]">Supermarket / Grocery</h3>
                <span className="text-[10px] font-semibold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] px-2 py-0.2 rounded">High Speed</span>
              </div>
              <p className="text-xs text-[#64748B] leading-relaxed mb-3">
                Multi-counter fast billing, weight scale integration, hold & recall bills, cashier shift reconciliation, and near-expiry batch tracking.
              </p>
              <ul className="text-xs text-[#475569] space-y-1">
                <li className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#047857] mr-1.5 flex-shrink-0" /> Weight-based item calculation</li>
                <li className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#047857] mr-1.5 flex-shrink-0" /> Cash drawer difference & shifts</li>
                <li className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#047857] mr-1.5 flex-shrink-0" /> Batch expiry action warnings</li>
              </ul>
            </div>

            {/* 3. Wholesale */}
            <div className="bg-[#FAFBFC] border border-[#E2E8F0] hover:border-[#8B5CF6] rounded-lg p-5 transition shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
              <div className="w-10 h-10 rounded-md bg-[#F5F3FF] text-[#6D28D9] border border-[#DDD6FE] flex items-center justify-center font-bold mb-3">
                <Truck className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-sm font-bold text-[#0F172A]">Wholesale / Distribution</h3>
                <span className="text-[10px] font-semibold bg-[#F5F3FF] text-[#6D28D9] border border-[#DDD6FE] px-2 py-0.2 rounded">B2B Workflow</span>
              </div>
              <p className="text-xs text-[#64748B] leading-relaxed mb-3">
                Quotation to Sales Order, stock allocation, partial dispatch, delivery challans, salesman tracking, and dealer price lists.
              </p>
              <ul className="text-xs text-[#475569] space-y-1">
                <li className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#6D28D9] mr-1.5 flex-shrink-0" /> Delivery Challans (DC) with vehicle no.</li>
                <li className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#6D28D9] mr-1.5 flex-shrink-0" /> Dealer price lists & volume discounts</li>
                <li className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#6D28D9] mr-1.5 flex-shrink-0" /> Outstanding collection ledgers</li>
              </ul>
            </div>

            {/* 4. Restaurant */}
            <div className="bg-[#FAFBFC] border border-[#E2E8F0] hover:border-[#F97316] rounded-lg p-5 transition shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
              <div className="w-10 h-10 rounded-md bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA] flex items-center justify-center font-bold mb-3">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-sm font-bold text-[#0F172A]">Restaurant / Cafe</h3>
                <span className="text-[10px] font-semibold bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA] px-2 py-0.2 rounded">Dine-In & KOT</span>
              </div>
              <p className="text-xs text-[#64748B] leading-relaxed mb-3">
                Interactive floor & table management, Dine-In/Takeaway/Delivery, modifiers, realtime Kitchen Order Tickets (KOT), and table billing.
              </p>
              <ul className="text-xs text-[#475569] space-y-1">
                <li className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#C2410C] mr-1.5 flex-shrink-0" /> Realtime KOT WebSocket live feeds</li>
                <li className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#C2410C] mr-1.5 flex-shrink-0" /> Floor section table status indicators</li>
                <li className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#C2410C] mr-1.5 flex-shrink-0" /> Split bill & table close flow</li>
              </ul>
            </div>

            {/* 5. Service / Repair */}
            <div className="bg-[#FAFBFC] border border-[#E2E8F0] hover:border-[#F59E0B] rounded-lg p-5 transition shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
              <div className="w-10 h-10 rounded-md bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] flex items-center justify-center font-bold mb-3">
                <Wrench className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-sm font-bold text-[#0F172A]">Service / Repair</h3>
                <span className="text-[10px] font-semibold bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] px-2 py-0.2 rounded">Job Cards</span>
              </div>
              <p className="text-xs text-[#64748B] leading-relaxed mb-3">
                Customer asset intake (IMEI/Serial/Vehicle), job card lifecycle, diagnosis inspection notes, technician assignment, and spare parts billing.
              </p>
              <ul className="text-xs text-[#475569] space-y-1">
                <li className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#B45309] mr-1.5 flex-shrink-0" /> 10-Stage Job Card tracking</li>
                <li className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#B45309] mr-1.5 flex-shrink-0" /> Parts & Labour breakdown</li>
                <li className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#B45309] mr-1.5 flex-shrink-0" /> Asset service history & delivery</li>
              </ul>
            </div>

            {/* 6. Pharmacy */}
            <div className="bg-[#FAFBFC] border border-[#E2E8F0] hover:border-[#EF4444] rounded-lg p-5 transition shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
              <div className="w-10 h-10 rounded-md bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] flex items-center justify-center font-bold mb-3">
                <Pill className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-sm font-bold text-[#0F172A]">Pharmacy</h3>
                <span className="text-[10px] font-semibold bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] px-2 py-0.2 rounded">Expiry Safety</span>
              </div>
              <p className="text-xs text-[#64748B] leading-relaxed mb-3">
                Medicine Master with generic name lookup, batch-wise billing, 30/60/90-day expiry classification, and <strong>strict expiry blocking engine</strong>.
              </p>
              <ul className="text-xs text-[#475569] space-y-1">
                <li className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#B91C1C] mr-1.5 flex-shrink-0" /> Expired stock blocked at billing</li>
                <li className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#B91C1C] mr-1.5 flex-shrink-0" /> Generic salt name search</li>
                <li className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 text-[#B91C1C] mr-1.5 flex-shrink-0" /> Doctor & Prescription tracking</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Core Features Section */}
      <section id="features" className="py-16 px-4 sm:px-6 lg:px-8 bg-[#F7F9FC]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-semibold text-[#2563EB] tracking-widest uppercase">Built for Speed & Reliability</h2>
            <p className="mt-1.5 text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
              Enterprise POS & Financial Core
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
              <div className="w-9 h-9 rounded-md bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] flex items-center justify-center font-bold mb-3">
                <Zap className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-[#0F172A] mb-1.5">High-Speed POS Billing</h4>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Scan, adjust quantity, tender payments (Cash, UPI with dynamic QR, Card, Split, Credit), and print 58mm/80mm thermal receipts in seconds.
              </p>
            </div>

            <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
              <div className="w-9 h-9 rounded-md bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] flex items-center justify-center font-bold mb-3">
                <Database className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-[#0F172A] mb-1.5">Authoritative Stock Ledger</h4>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Every transaction, purchase, return, adjustment, damage, or transfer writes an immutable stock movement log. Never rely on a single mutable counter.
              </p>
            </div>

            <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
              <div className="w-9 h-9 rounded-md bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] flex items-center justify-center font-bold mb-3">
                <Lock className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-[#0F172A] mb-1.5">Multi-Tenant Isolation & RBAC</h4>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Complete backend data separation by organization and branch. Strict roles (Owner, Manager, Cashier, Accountant, Technician) and full audit history.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Desktop + Mobile & Offline Section */}
      <section id="ecosystem" className="py-16 px-4 sm:px-6 lg:px-8 bg-white border-t border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center space-x-2 bg-[#EFF6FF] border border-[#BFDBFE] px-2.5 py-0.5 rounded-md text-xs font-semibold text-[#1D4ED8] mb-3">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Unified Multi-Platform Ecosystem</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
              Counter Desktop + Mobile POS Terminal
            </h3>
            <p className="mt-3 text-[#475569] text-sm leading-relaxed">
              Use AESCION on high-speed desktop PCs for heavy checkout counters and back-office management, while running mobile POS on Android tablets and phones for floor ordering and doorstep collection.
            </p>
            <div className="mt-5 space-y-2.5 text-xs text-[#334155]">
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#047857] flex-shrink-0" />
                <span>Offline-first SQLite queue with automatic background sync.</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#047857] flex-shrink-0" />
                <span>Idempotent client transaction IDs preventing duplicate financial records.</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#047857] flex-shrink-0" />
                <span>Hardware integrations: ESC/POS 58mm/80mm, Barcode Scanners, Weight Scales.</span>
              </div>
            </div>
          </div>

          <div className="bg-[#0F172A] p-7 rounded-lg text-white shadow-md relative overflow-hidden border border-slate-800">
            <div className="relative z-10">
              <div className="text-[11px] font-semibold text-[#60A5FA] uppercase tracking-widest mb-1.5">Offline Reliability</div>
              <h4 className="text-xl font-bold mb-3">Internet Down? Business Continues.</h4>
              <p className="text-xs text-slate-300 leading-relaxed mb-5">
                When connectivity drops, authorized counters and mobile devices cache catalog items locally and queue offline invoices safely. Official sequence numbers synchronize smoothly once connection restores.
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs font-semibold">
                <div className="bg-white/5 p-3 rounded-md border border-white/10">
                  <div className="text-[#10B981] font-bold text-sm">3 Days</div>
                  <div className="text-slate-300 text-[11px]">Authorized Offline Operation</div>
                </div>
                <div className="bg-white/5 p-3 rounded-md border border-white/10">
                  <div className="text-[#60A5FA] font-bold text-sm">Zero Duplicates</div>
                  <div className="text-slate-300 text-[11px]">Idempotent Sync Engine</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Final Call to Action */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-[#1E40AF] text-white text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Ready to accelerate your business with AESCION?
          </h2>
          <p className="mt-3 text-sm text-blue-100 max-w-xl mx-auto">
            Set up your organization, branches, tax rules, and products in minutes with our guided onboarding wizard.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={onOpenOnboarding}
              className="px-6 py-3 bg-white text-[#1E40AF] hover:bg-blue-50 font-bold text-sm rounded-md shadow-sm transition"
            >
              Start Your Business Now
            </button>
            <button
              onClick={onOpenSignIn}
              className="px-6 py-3 bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-semibold text-sm rounded-md border border-blue-400/40 transition"
            >
              Sign In to Existing Workspace
            </button>
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="bg-[#0F172A] text-[#94A3B8] py-8 px-4 sm:px-6 lg:px-8 text-xs border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-[#2563EB] fill-[#2563EB]" />
            <span className="font-bold text-white">AESCION Commerce</span>
            <span>— Production-grade Business Operating System & POS Platform</span>
          </div>
          <div>
            <span>© 2026 AESCION Systems. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
