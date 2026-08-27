import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Building,
  Percent,
  FileText,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  Hash,
  Upload,
  Trash2,
  Image as ImageIcon,
  ShieldAlert
} from 'lucide-react';
import { ApiClient } from '../../services/api';
import { useAuth } from '../../store/authContext';
import { TaxMode } from '@aescion/shared-types';
import { Permission } from '@aescion/capability-config';
import { getInitials, resolveLogoUrl } from '../../components/common/OrganizationBrandBadge';

export const SettingsView: React.FC = () => {
  const { organization, refreshSession, updateOrganization, permissions } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Logo upload & preview state
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [newLogoBase64, setNewLogoBase64] = useState<string | null>(null);
  const [newLogoMime, setNewLogoMime] = useState<string | null>(null);
  const [isLogoRemoved, setIsLogoRemoved] = useState(false);

  const canEditBranding = permissions.includes(Permission.ORG_UPDATE);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const data = await ApiClient.get<any>('/organizations/settings');
      setSettings(data);
      setLogoPreview(data.organization?.logoUrl || null);
      setIsLogoRemoved(false);
      setNewLogoBase64(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load organization settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Handle Logo file selection with client validation
  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate MIME type
    const validMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validMimes.includes(file.type.toLowerCase())) {
      setErrorMessage('Invalid image format. Only PNG, JPEG, and WebP are allowed.');
      return;
    }

    // Validate size (max 2MB)
    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setErrorMessage('Image size exceeds 2MB limit. Please choose a smaller file.');
      return;
    }

    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setLogoPreview(result);
      setNewLogoBase64(result);
      setNewLogoMime(file.type);
      setIsLogoRemoved(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setNewLogoBase64(null);
    setNewLogoMime(null);
    setIsLogoRemoved(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCancelChanges = () => {
    fetchSettings();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(null);

    try {
      let updatedLogoUrl = settings.organization?.logoUrl;

      // 1. Process Logo changes if any
      if (isLogoRemoved) {
        await ApiClient.delete('/organizations/logo');
        updatedLogoUrl = null;
      } else if (newLogoBase64 && newLogoMime) {
        const logoUploadRes = await ApiClient.post<{ logoUrl: string }>('/organizations/logo', {
          base64: newLogoBase64,
          mimeType: newLogoMime
        });
        updatedLogoUrl = logoUploadRes.logoUrl;
      }

      // 2. Save Business Profile & Settings
      const profilePayload = {
        name: settings.organization?.name,
        legalName: settings.organization?.legalName,
        phone: settings.organization?.phone,
        email: settings.organization?.email,
        gstin: settings.organization?.gstin,
        address: settings.organization?.address,
        city: settings.organization?.city,
        state: settings.organization?.state,
        pinCode: settings.organization?.pinCode
      };

      const settingsPayload = {
        taxSettings: settings.taxSettings,
        billingSettings: settings.billingSettings
      };

      await Promise.all([
        ApiClient.put('/organizations/business-profile', profilePayload),
        ApiClient.put('/organizations/settings', settingsPayload)
      ]);

      // Update AuthContext state immediately so TopBar & LeftSidebar reflect changes reactively
      updateOrganization({
        name: settings.organization?.name,
        legalName: settings.organization?.legalName,
        logoUrl: updatedLogoUrl,
        gstin: settings.organization?.gstin,
        phone: settings.organization?.phone,
        email: settings.organization?.email
      });

      setSaveSuccess('Business Profile & Settings saved successfully!');
      setTimeout(() => setSaveSuccess(null), 4000);

      // Refresh backend session to ensure total sync
      await refreshSession();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update business settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="py-20 text-center text-[#94A3B8]">
        <RefreshCw className="w-5 h-5 animate-spin text-[#2563EB] mx-auto mb-2" />
        <span className="text-xs font-medium">Loading organization profile & settings...</span>
      </div>
    );
  }

  const currentCompanyName = settings.organization?.name || 'My Business';
  const displayInitials = getInitials(currentCompanyName);
  const resolvedPreviewUrl = resolveLogoUrl(logoPreview);

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)]">
        <div>
          <h2 className="text-xl font-semibold text-[#0F172A] flex items-center space-x-2">
            <Settings className="w-5 h-5 text-[#2563EB]" />
            <span>Organization & Business Profile</span>
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Manage company branding, logo, GST tax policies, and document numbering.
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center space-x-1.5 bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] px-3 py-1.5 rounded-md text-xs font-semibold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>{saveSuccess}</span>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center space-x-1.5 bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] px-3 py-1.5 rounded-md text-xs font-semibold animate-in fade-in">
            <AlertCircle className="w-4 h-4" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {!canEditBranding && (
        <div className="bg-[#FFFBEB] border border-[#FDE68A] text-[#B45309] p-3.5 rounded-lg text-xs flex items-center space-x-2 font-medium">
          <ShieldAlert className="w-4 h-4 text-[#F59E0B] flex-shrink-0" />
          <span>You have read-only access to organization branding. Only authorized Owners or Managers may modify company details.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5 text-xs">
        {/* SECTION 1: BUSINESS PROFILE & BRANDING */}
        <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] space-y-5">
          <div className="flex items-center space-x-2 font-semibold text-[#1D4ED8] uppercase tracking-wider text-[11px] border-b border-[#EDF1F5] pb-2.5">
            <Building className="w-4 h-4" />
            <span>Business Profile & Company Branding</span>
          </div>

          {/* Logo Management Block */}
          <div className="bg-[#FAFBFC] p-4 rounded-lg border border-[#EDF1F5] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              {/* Logo Preview Avatar */}
              <div className="w-14 h-14 rounded-lg bg-white border border-[#E2E8F0] shadow-2xs flex items-center justify-center overflow-hidden flex-shrink-0">
                {resolvedPreviewUrl && !isLogoRemoved ? (
                  <img
                    src={resolvedPreviewUrl}
                    alt="Company Logo Preview"
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <div className="w-full h-full bg-[#2563EB] flex items-center justify-center text-white font-bold text-base">
                    {displayInitials}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-semibold text-[#0F172A] text-xs">Company Logo</h4>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  Supported formats: PNG, JPEG, WebP. Max file size: 2MB.
                </p>
                {resolvedPreviewUrl && !isLogoRemoved ? (
                  <span className="inline-block mt-1 text-[10px] font-semibold text-[#047857] bg-[#ECFDF5] border border-[#A7F3D0] px-1.5 py-0.2 rounded">
                    Custom Logo Active
                  </span>
                ) : (
                  <span className="inline-block mt-1 text-[10px] font-semibold text-[#475569] bg-[#F1F5F9] border border-[#E2E8F0] px-1.5 py-0.2 rounded">
                    Initials Avatar Fallback Active
                  </span>
                )}
              </div>
            </div>

            {canEditBranding && (
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoSelect}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#334155] rounded-md font-semibold transition flex items-center space-x-1.5 shadow-2xs"
                >
                  <Upload className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>{resolvedPreviewUrl && !isLogoRemoved ? 'Replace Logo' : 'Upload Logo'}</span>
                </button>

                {(resolvedPreviewUrl && !isLogoRemoved) && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="p-1.5 text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#FEF2F2] border border-[#CBD5E1] hover:border-[#FECACA] rounded-md transition"
                    title="Remove Logo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Business Information Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-[#334155] mb-1">Company / Trade Name *</label>
              <input
                type="text"
                required
                disabled={!canEditBranding}
                value={settings.organization?.name || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  organization: { ...settings.organization, name: e.target.value }
                })}
                className="w-full aescion-input font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#334155] mb-1">Legal / Registered Name</label>
              <input
                type="text"
                disabled={!canEditBranding}
                placeholder="e.g. Seth Supermarket Private Limited"
                value={settings.organization?.legalName || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  organization: { ...settings.organization, legalName: e.target.value }
                })}
                className="w-full aescion-input"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#334155] mb-1">Official GSTIN</label>
              <input
                type="text"
                disabled={!canEditBranding}
                placeholder="e.g. 33AAAAA0000A1Z5"
                value={settings.organization?.gstin || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  organization: { ...settings.organization, gstin: e.target.value.toUpperCase() }
                })}
                className="w-full aescion-input uppercase"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#334155] mb-1">Primary Business Type</label>
              <input
                type="text"
                disabled
                value={settings.organization?.businessType || 'SUPERMARKET'}
                className="w-full aescion-input opacity-70 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#334155] mb-1">Contact Phone</label>
              <input
                type="text"
                disabled={!canEditBranding}
                value={settings.organization?.phone || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  organization: { ...settings.organization, phone: e.target.value }
                })}
                className="w-full aescion-input"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#334155] mb-1">Contact Email</label>
              <input
                type="email"
                disabled={!canEditBranding}
                value={settings.organization?.email || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  organization: { ...settings.organization, email: e.target.value }
                })}
                className="w-full aescion-input"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: GST TAX CONFIGURATION */}
        <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] space-y-4">
          <div className="flex items-center space-x-2 font-semibold text-[#1D4ED8] uppercase tracking-wider text-[11px] border-b border-[#EDF1F5] pb-2.5">
            <Percent className="w-4 h-4" />
            <span>GST Tax Policy & Calculation Mode</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#334155] mb-1">Tax Pricing Mode</label>
              <select
                value={settings.taxSettings?.taxMode || TaxMode.EXCLUSIVE}
                onChange={(e) => setSettings({
                  ...settings,
                  taxSettings: { ...settings.taxSettings, taxMode: e.target.value }
                })}
                className="w-full aescion-input font-medium"
              >
                <option value={TaxMode.EXCLUSIVE}>Exclusive of Tax (Tax added at checkout)</option>
                <option value={TaxMode.INCLUSIVE}>Inclusive of Tax (MRP includes all taxes)</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 pt-5">
              <input
                type="checkbox"
                id="enableCess"
                checked={settings.taxSettings?.enableCess || false}
                onChange={(e) => setSettings({
                  ...settings,
                  taxSettings: { ...settings.taxSettings, enableCess: e.target.checked }
                })}
                className="rounded border-[#CBD5E1] text-[#2563EB] focus:ring-[#2563EB]"
              />
              <label htmlFor="enableCess" className="font-semibold text-[#0F172A]">
                Enable Compensation Cess on luxury/tobacco items
              </label>
            </div>
          </div>
        </div>

        {/* SECTION 3: DOCUMENT PREFIXES & NUMBERING */}
        <div className="bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-[0_1px_2px_rgba(15,23,42,0.035)] space-y-4">
          <div className="flex items-center space-x-2 font-semibold text-[#1D4ED8] uppercase tracking-wider text-[11px] border-b border-[#EDF1F5] pb-2.5">
            <Hash className="w-4 h-4" />
            <span>Document Prefixes & Serial Formats</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block font-semibold text-[#334155] mb-1">Invoice Prefix</label>
              <input
                type="text"
                value={settings.billingSettings?.invoicePrefix || 'INV'}
                onChange={(e) => setSettings({
                  ...settings,
                  billingSettings: { ...settings.billingSettings, invoicePrefix: e.target.value.toUpperCase() }
                })}
                className="w-full aescion-input uppercase"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#334155] mb-1">Quotation Prefix</label>
              <input
                type="text"
                value={settings.billingSettings?.quotationPrefix || 'QTN'}
                onChange={(e) => setSettings({
                  ...settings,
                  billingSettings: { ...settings.billingSettings, quotationPrefix: e.target.value.toUpperCase() }
                })}
                className="w-full aescion-input uppercase"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#334155] mb-1">Receipt Prefix</label>
              <input
                type="text"
                value={settings.billingSettings?.receiptPrefix || 'RCP'}
                onChange={(e) => setSettings({
                  ...settings,
                  billingSettings: { ...settings.billingSettings, receiptPrefix: e.target.value.toUpperCase() }
                })}
                className="w-full aescion-input uppercase"
              />
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        {canEditBranding && (
          <div className="flex items-center justify-end space-x-2.5 pt-2">
            <button
              type="button"
              onClick={handleCancelChanges}
              disabled={isSaving}
              className="btn-secondary"
            >
              Discard Changes
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving Changes...' : 'Save Business Settings'}</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
