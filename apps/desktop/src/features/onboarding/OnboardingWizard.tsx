import React, { useState } from 'react';
import {
  Zap,
  ShoppingBag,
  Store,
  Truck,
  UtensilsCrossed,
  Wrench,
  Pill,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  AlertCircle,
  Building,
  User,
  Shield,
  FileText,
  Percent,
  Sliders,
  Sparkles,
  X
} from 'lucide-react';
import { BusinessType, TaxMode } from '@aescion/shared-types';
import { ApiClient } from '../../services/api';
import { useAuth } from '../../store/authContext';
import confetti from 'canvas-confetti';

interface OnboardingWizardProps {
  onClose: () => void;
}

const STEPS = [
  { id: 1, title: 'Owner Account', icon: User },
  { id: 2, title: 'Business Type', icon: Zap },
  { id: 3, title: 'Business Details', icon: Building },
  { id: 4, title: 'Branches', icon: Store },
  { id: 5, title: 'Team Setup', icon: Shield },
  { id: 6, title: 'GST & Taxes', icon: Percent },
  { id: 7, title: 'Billing Setup', icon: FileText },
  { id: 8, title: 'Industry Rules', icon: Sliders },
  { id: 9, title: 'Review & Launch', icon: Sparkles }
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onClose }) => {
  const { login } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    // 01 Owner
    owner: {
      firstName: '',
      lastName: '',
      mobileNumber: '',
      email: '',
      username: '',
      password: '',
      confirmPassword: ''
    },
    // 02 Business Type
    businessType: BusinessType.SUPERMARKET as BusinessType,
    // 03 Business Details
    business: {
      name: '',
      legalName: '',
      phone: '',
      email: '',
      address: '',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pinCode: '600001',
      country: 'India',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      gstStatus: true,
      gstin: '33AAAAA0000A1Z5'
    },
    // 04 Branches & Outlets
    branches: [
      {
        name: 'Main Branch Outlet',
        code: 'MAIN',
        address: '123 Business Street',
        city: 'Chennai',
        state: 'Tamil Nadu',
        registers: [{ name: 'Counter 01', code: 'REG-01' }]
      }
    ],
    // 05 Team Members
    team: [
      {
        firstName: 'Staff',
        lastName: 'Cashier',
        email: 'cashier@business.com',
        username: 'staff_cashier',
        password: 'Password@123',
        roleName: 'Cashier'
      }
    ],
    // 06 Taxes
    taxSettings: {
      taxMode: TaxMode.EXCLUSIVE as TaxMode,
      enableCess: false,
      defaultRates: [0, 5, 12, 18, 28]
    },
    // 07 Billing
    billingSettings: {
      invoicePrefix: 'INV',
      quotationPrefix: 'QTN',
      receiptPrefix: 'RCP',
      defaultReceiptFormat: '80MM'
    },
    // 08 Industry Rules
    industryConfig: {
      enableKOT: false,
      enableJobCards: false,
      enableBatchExpiry: false,
      enableDeliveryChallans: false
    }
  });

  const handleBusinessTypeSelect = (type: BusinessType) => {
    let industryConfig = {
      enableKOT: false,
      enableJobCards: false,
      enableBatchExpiry: false,
      enableDeliveryChallans: false
    };

    if (type === BusinessType.RESTAURANT) industryConfig.enableKOT = true;
    if (type === BusinessType.SERVICE) industryConfig.enableJobCards = true;
    if (type === BusinessType.PHARMACY) industryConfig.enableBatchExpiry = true;
    if (type === BusinessType.WHOLESALE) industryConfig.enableDeliveryChallans = true;

    setFormData({
      ...formData,
      businessType: type,
      industryConfig
    });
  };

  const validateStep = (step: number) => {
    setErrorMsg(null);
    if (step === 1) {
      const { firstName, lastName, mobileNumber, email, username, password, confirmPassword } = formData.owner;
      if (!firstName || !lastName || !mobileNumber || !email || !username || !password) {
        setErrorMsg('Please fill in all owner registration fields.');
        return false;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return false;
      }
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters.');
        return false;
      }
    }

    if (step === 3) {
      if (!formData.business.name) {
        setErrorMsg('Business trade name is required.');
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 9) {
        setCurrentStep((prev) => prev + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    setErrorMsg(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const response = await ApiClient.post<any>('/onboarding/create-business', formData);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      login(response);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create business workspace. Please verify inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-lg shadow-xl border border-[#E2E8F0] overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="bg-[#F8FAFC] text-[#0F172A] px-6 py-4 flex items-center justify-between border-b border-[#E2E8F0]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-md bg-[#2563EB] flex items-center justify-center font-bold text-white shadow-2xs">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">AESCION Business Onboarding Wizard</h2>
              <p className="text-[11px] text-[#64748B]">Step {currentStep} of 9 — {STEPS[currentStep - 1].title}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#0F172A] p-1 rounded transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="bg-[#FAFBFC] border-b border-[#E2E8F0] px-6 py-2.5 overflow-x-auto">
          <div className="flex items-center space-x-1.5 min-w-max">
            {STEPS.map((s, idx) => {
              const isPassed = currentStep > s.id;
              const isCurrent = currentStep === s.id;
              return (
                <React.Fragment key={s.id}>
                  <div
                    onClick={() => isPassed && setCurrentStep(s.id)}
                    className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition ${
                      isCurrent
                        ? 'bg-[#2563EB] text-white shadow-2xs'
                        : isPassed
                        ? 'text-[#047857] bg-[#ECFDF5] border border-[#A7F3D0]'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold border border-current">
                      {isPassed ? '✓' : s.id}
                    </span>
                    <span>{s.title}</span>
                  </div>
                  {idx < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-[#CBD5E1] flex-shrink-0" />}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Wizard Content Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-[#F7F9FC] text-xs">
          {errorMsg && (
            <div className="mb-4 bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] px-3.5 py-2.5 rounded-md text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: Owner Registration */}
          {currentStep === 1 && (
            <div className="space-y-4 max-w-xl mx-auto">
              <div className="text-center mb-5">
                <h3 className="text-base font-bold text-[#0F172A]">Create Business Owner Account</h3>
                <p className="text-xs text-[#64748B]">The primary administrator of this organization workspace.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">First Name *</label>
                  <input
                    type="text"
                    value={formData.owner.firstName}
                    onChange={(e) => setFormData({ ...formData, owner: { ...formData.owner, firstName: e.target.value } })}
                    placeholder="e.g. Rahul"
                    className="w-full aescion-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={formData.owner.lastName}
                    onChange={(e) => setFormData({ ...formData, owner: { ...formData.owner, lastName: e.target.value } })}
                    placeholder="e.g. Sharma"
                    className="w-full aescion-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Mobile Number *</label>
                  <input
                    type="text"
                    value={formData.owner.mobileNumber}
                    onChange={(e) => setFormData({ ...formData, owner: { ...formData.owner, mobileNumber: e.target.value } })}
                    placeholder="9876543210"
                    className="w-full aescion-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={formData.owner.email}
                    onChange={(e) => setFormData({ ...formData, owner: { ...formData.owner, email: e.target.value } })}
                    placeholder="owner@business.com"
                    className="w-full aescion-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Username *</label>
                <input
                  type="text"
                  value={formData.owner.username}
                  onChange={(e) => setFormData({ ...formData, owner: { ...formData.owner, username: e.target.value } })}
                  placeholder="e.g. rahul_sharma"
                  className="w-full aescion-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Password *</label>
                  <input
                    type="password"
                    value={formData.owner.password}
                    onChange={(e) => setFormData({ ...formData, owner: { ...formData.owner, password: e.target.value } })}
                    placeholder="Enter strong password"
                    className="w-full aescion-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Confirm Password *</label>
                  <input
                    type="password"
                    value={formData.owner.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, owner: { ...formData.owner, confirmPassword: e.target.value } })}
                    placeholder="Repeat password"
                    className="w-full aescion-input"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Business Type */}
          {currentStep === 2 && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="text-center mb-5">
                <h3 className="text-base font-bold text-[#0F172A]">Select Primary Business Domain</h3>
                <p className="text-xs text-[#64748B]">Tailors POS workflows, stock tracking, and reporting models.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { type: BusinessType.SUPERMARKET, title: 'Supermarket / Grocery', icon: ShoppingBag, desc: 'Barcode scanning, weight scale, multi-register shifts' },
                  { type: BusinessType.RESTAURANT, title: 'Restaurant & Cafe', icon: UtensilsCrossed, desc: 'Table management, KOT kitchen screen, captains' },
                  { type: BusinessType.RETAIL, title: 'Retail & Fashion', icon: Store, desc: 'Sizes, colors, barcode scanning, fast checkout' },
                  { type: BusinessType.SERVICE, title: 'Service & Repair', icon: Wrench, desc: 'Job cards, spare parts, repair status tracking' },
                  { type: BusinessType.PHARMACY, title: 'Pharmacy & Medical', icon: Pill, desc: 'Batch tracking, expiry controls, generic substitutes' },
                  { type: BusinessType.WHOLESALE, title: 'Wholesale & B2B', icon: Truck, desc: 'Delivery challans, bulk pricing, credit ledgers' }
                ].map((b) => {
                  const isSelected = formData.businessType === b.type;
                  const Icon = b.icon;
                  return (
                    <div
                      key={b.type}
                      onClick={() => handleBusinessTypeSelect(b.type)}
                      className={`p-4 rounded-lg border transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#2563EB] bg-[#EFF6FF] ring-1 ring-[#2563EB]/20 shadow-xs'
                          : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1]'
                      }`}
                    >
                      <div>
                        <div className={`w-8 h-8 rounded-md flex items-center justify-center mb-2.5 ${
                          isSelected ? 'bg-[#2563EB] text-white' : 'bg-[#F1F5F9] text-[#2563EB]'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <h4 className="text-xs font-bold text-[#0F172A]">{b.title}</h4>
                        <p className="text-[11px] text-[#64748B] mt-1">{b.desc}</p>
                      </div>

                      {isSelected && (
                        <div className="mt-3 flex items-center text-[11px] font-semibold text-[#1D4ED8]">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          <span>Selected</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Business Details */}
          {currentStep === 3 && (
            <div className="space-y-4 max-w-xl mx-auto">
              <div className="text-center mb-5">
                <h3 className="text-base font-bold text-[#0F172A]">Organization & Enterprise Profile</h3>
                <p className="text-xs text-[#64748B]">Official trade name and contact address.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Company / Trade Name *</label>
                <input
                  type="text"
                  value={formData.business.name}
                  onChange={(e) => setFormData({ ...formData, business: { ...formData.business, name: e.target.value } })}
                  placeholder="e.g. Seth Supermarket"
                  className="w-full aescion-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Legal Registered Name</label>
                <input
                  type="text"
                  value={formData.business.legalName}
                  onChange={(e) => setFormData({ ...formData, business: { ...formData.business, legalName: e.target.value } })}
                  placeholder="e.g. Seth Supermarket Pvt Ltd"
                  className="w-full aescion-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Business Phone</label>
                  <input
                    type="text"
                    value={formData.business.phone}
                    onChange={(e) => setFormData({ ...formData, business: { ...formData.business, phone: e.target.value } })}
                    placeholder="044-24567890"
                    className="w-full aescion-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Business Email</label>
                  <input
                    type="email"
                    value={formData.business.email}
                    onChange={(e) => setFormData({ ...formData, business: { ...formData.business, email: e.target.value } })}
                    placeholder="support@sethmarket.com"
                    className="w-full aescion-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Street Address</label>
                <input
                  type="text"
                  value={formData.business.address}
                  onChange={(e) => setFormData({ ...formData, business: { ...formData.business, address: e.target.value } })}
                  placeholder="123 100ft Road, Velachery"
                  className="w-full aescion-input"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">City</label>
                  <input
                    type="text"
                    value={formData.business.city}
                    onChange={(e) => setFormData({ ...formData, business: { ...formData.business, city: e.target.value } })}
                    className="w-full aescion-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">State</label>
                  <input
                    type="text"
                    value={formData.business.state}
                    onChange={(e) => setFormData({ ...formData, business: { ...formData.business, state: e.target.value } })}
                    className="w-full aescion-input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">PIN Code</label>
                  <input
                    type="text"
                    value={formData.business.pinCode}
                    onChange={(e) => setFormData({ ...formData, business: { ...formData.business, pinCode: e.target.value } })}
                    className="w-full aescion-input"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Branches */}
          {currentStep === 4 && (
            <div className="space-y-4 max-w-xl mx-auto">
              <div className="text-center mb-5">
                <h3 className="text-base font-bold text-[#0F172A]">Primary Store Branch & Terminal</h3>
                <p className="text-xs text-[#64748B]">Initialize your first physical retail branch and billing register.</p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] space-y-3 shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-[#334155] mb-1">Branch Name *</label>
                    <input
                      type="text"
                      value={formData.branches[0].name}
                      onChange={(e) => {
                        const updated = [...formData.branches];
                        updated[0].name = e.target.value;
                        setFormData({ ...formData, branches: updated });
                      }}
                      className="w-full aescion-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1">Store Code</label>
                    <input
                      type="text"
                      value={formData.branches[0].code}
                      onChange={(e) => {
                        const updated = [...formData.branches];
                        updated[0].code = e.target.value.toUpperCase();
                        setFormData({ ...formData, branches: updated });
                      }}
                      className="w-full aescion-input uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Initial POS Counter Register</label>
                  <input
                    type="text"
                    value={formData.branches[0].registers[0].name}
                    onChange={(e) => {
                      const updated = [...formData.branches];
                      updated[0].registers[0].name = e.target.value;
                      setFormData({ ...formData, branches: updated });
                    }}
                    className="w-full aescion-input"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Team Setup */}
          {currentStep === 5 && (
            <div className="space-y-4 max-w-xl mx-auto">
              <div className="text-center mb-5">
                <h3 className="text-base font-bold text-[#0F172A]">Staff Cashier Account (Optional)</h3>
                <p className="text-xs text-[#64748B]">Pre-configure your primary store cashier for shift operations.</p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] space-y-3 shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1">Cashier First Name</label>
                    <input
                      type="text"
                      value={formData.team[0].firstName}
                      onChange={(e) => {
                        const updated = [...formData.team];
                        updated[0].firstName = e.target.value;
                        setFormData({ ...formData, team: updated });
                      }}
                      className="w-full aescion-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1">Last Name</label>
                    <input
                      type="text"
                      value={formData.team[0].lastName}
                      onChange={(e) => {
                        const updated = [...formData.team];
                        updated[0].lastName = e.target.value;
                        setFormData({ ...formData, team: updated });
                      }}
                      className="w-full aescion-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1">Cashier Username</label>
                    <input
                      type="text"
                      value={formData.team[0].username}
                      onChange={(e) => {
                        const updated = [...formData.team];
                        updated[0].username = e.target.value;
                        setFormData({ ...formData, team: updated });
                      }}
                      className="w-full aescion-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1">Assigned Role</label>
                    <input
                      type="text"
                      disabled
                      value="Cashier"
                      className="w-full aescion-input opacity-75"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: GST & Taxes */}
          {currentStep === 6 && (
            <div className="space-y-4 max-w-xl mx-auto">
              <div className="text-center mb-5">
                <h3 className="text-base font-bold text-[#0F172A]">GST Tax Configuration</h3>
                <p className="text-xs text-[#64748B]">Compliant Indian GST calculation policies.</p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] space-y-4 shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    value={formData.business.gstin}
                    onChange={(e) => setFormData({ ...formData, business: { ...formData.business, gstin: e.target.value.toUpperCase() } })}
                    className="w-full aescion-input font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Pricing Tax Mode</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { mode: TaxMode.EXCLUSIVE, title: 'Exclusive of Tax', desc: 'Taxes added at checkout' },
                      { mode: TaxMode.INCLUSIVE, title: 'Inclusive of Tax', desc: 'MRP includes GST' }
                    ].map((m) => (
                      <div
                        key={m.mode}
                        onClick={() => setFormData({ ...formData, taxSettings: { ...formData.taxSettings, taxMode: m.mode } })}
                        className={`p-3 rounded-lg border text-xs cursor-pointer transition ${
                          formData.taxSettings.taxMode === m.mode
                            ? 'border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8] font-semibold ring-1 ring-[#2563EB]/20'
                            : 'border-[#E2E8F0] bg-white text-[#334155]'
                        }`}
                      >
                        <div className="font-bold">{m.title}</div>
                        <div className="text-[11px] text-[#64748B] mt-0.5">{m.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: Billing Setup */}
          {currentStep === 7 && (
            <div className="space-y-4 max-w-xl mx-auto">
              <div className="text-center mb-5">
                <h3 className="text-base font-bold text-[#0F172A]">Document Prefixes & Formats</h3>
                <p className="text-xs text-[#64748B]">Serial prefixes for invoices, receipts and thermal printer sizing.</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Invoice Prefix</label>
                  <input
                    type="text"
                    value={formData.billingSettings.invoicePrefix}
                    onChange={(e) => setFormData({ ...formData, billingSettings: { ...formData.billingSettings, invoicePrefix: e.target.value } })}
                    className="w-full aescion-input uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Quotation Prefix</label>
                  <input
                    type="text"
                    value={formData.billingSettings.quotationPrefix}
                    onChange={(e) => setFormData({ ...formData, billingSettings: { ...formData.billingSettings, quotationPrefix: e.target.value } })}
                    className="w-full aescion-input uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Receipt Prefix</label>
                  <input
                    type="text"
                    value={formData.billingSettings.receiptPrefix}
                    onChange={(e) => setFormData({ ...formData, billingSettings: { ...formData.billingSettings, receiptPrefix: e.target.value } })}
                    className="w-full aescion-input uppercase font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Default POS Receipt Printer Format</label>
                <div className="grid grid-cols-3 gap-3">
                  {['80MM', '58MM', 'A4'].map((fmt) => (
                    <div
                      key={fmt}
                      onClick={() => setFormData({ ...formData, billingSettings: { ...formData.billingSettings, defaultReceiptFormat: fmt as any } })}
                      className={`p-3 text-center rounded-lg border text-xs font-semibold cursor-pointer transition ${
                        formData.billingSettings.defaultReceiptFormat === fmt
                          ? 'border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8] ring-1 ring-[#2563EB]/20'
                          : 'border-[#E2E8F0] bg-white text-[#334155]'
                      }`}
                    >
                      {fmt} Thermal
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 8: Industry Rules */}
          {currentStep === 8 && (
            <div className="space-y-4 max-w-xl mx-auto text-center">
              <div className="mb-5">
                <h3 className="text-base font-bold text-[#0F172A]">Industry Pack Initialized</h3>
                <p className="text-xs text-[#64748B]">Automated configuration based on {formData.businessType}.</p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] text-left space-y-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
                <div className="flex items-center space-x-2 text-xs font-bold text-[#0F172A]">
                  <CheckCircle2 className="w-4 h-4 text-[#047857]" />
                  <span>Configured: {formData.businessType} Feature Pack</span>
                </div>
                <p className="text-xs text-[#475569] leading-relaxed">
                  Initial starter products, categories, stock ledger entries, and registers will be generated automatically so you can start billing immediately after creation.
                </p>
              </div>
            </div>
          )}

          {/* STEP 9: Review & Create */}
          {currentStep === 9 && (
            <div className="space-y-4 max-w-xl mx-auto">
              <div className="text-center mb-5">
                <h3 className="text-base font-bold text-[#0F172A]">Review & Launch Workspace</h3>
                <p className="text-xs text-[#64748B]">Everything is ready to create your business workspace.</p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] space-y-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.035)] text-xs text-[#334155]">
                <div className="flex justify-between py-1 border-b border-[#EDF1F5]">
                  <span className="font-semibold text-[#64748B]">Owner</span>
                  <span className="font-bold text-[#0F172A]">{formData.owner.firstName} {formData.owner.lastName} ({formData.owner.email})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#EDF1F5]">
                  <span className="font-semibold text-[#64748B]">Business Name</span>
                  <span className="font-bold text-[#0F172A]">{formData.business.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#EDF1F5]">
                  <span className="font-semibold text-[#64748B]">Industry Type</span>
                  <span className="font-bold text-[#1D4ED8] bg-[#EFF6FF] border border-[#BFDBFE] px-2 py-0.2 rounded-full">{formData.businessType}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#EDF1F5]">
                  <span className="font-semibold text-[#64748B]">Main Branch</span>
                  <span className="font-bold text-[#0F172A]">{formData.branches[0].name} ({formData.branches[0].code})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#EDF1F5]">
                  <span className="font-semibold text-[#64748B]">Tax Mode</span>
                  <span className="font-bold text-[#0F172A]">{formData.taxSettings.taxMode} GST</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="bg-[#F8FAFC] px-6 py-3.5 border-t border-[#E2E8F0] flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 1 || isSubmitting}
            className="btn-secondary"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <button
            onClick={handleNext}
            disabled={isSubmitting}
            className="btn-primary"
          >
            <span>{currentStep === 9 ? (isSubmitting ? 'Creating Workspace...' : 'Launch Business') : 'Continue'}</span>
            {currentStep < 9 && <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
