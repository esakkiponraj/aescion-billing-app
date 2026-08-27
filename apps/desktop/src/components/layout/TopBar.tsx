import React from 'react';
import { Menu, ChevronDown, LogOut, Store } from 'lucide-react';
import { useAuth } from '../../store/authContext';
import { OrganizationBrandBadge } from '../common/OrganizationBrandBadge';

interface TopBarProps {
  onOpenMobileMenu?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenMobileMenu }) => {
  const { user, organization, branches, activeBranch, activeRole, switchBranch, logout, isLoading } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-[#E2E8F0] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-[0_1px_2px_rgba(15,23,42,0.035)] flex-shrink-0">
      {/* Left: Mobile Toggle + Company Branding + Branch Selector */}
      <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
        {/* Mobile Hamburger Toggle Button */}
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Open navigation menu"
            className="lg:hidden p-1.5 -ml-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition flex-shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* 1. Single Top-Left Company Branding */}
        <OrganizationBrandBadge
          organization={organization}
          size="md"
          isLoading={isLoading}
          className="flex-shrink-0"
        />

        {/* Vertical Divider */}
        <div className="h-5 w-px bg-[#E2E8F0] hidden sm:block flex-shrink-0" />

        {/* 2. Separate Branch / Outlet Selector */}
        {branches && branches.length > 0 && (
          <div className="relative hidden md:block flex-shrink-0">
            <div className="flex items-center space-x-1.5 bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-md pl-2.5 pr-7 py-1.5 transition shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
              <Store className="w-3.5 h-3.5 text-[#2563EB] flex-shrink-0" />
              <select
                value={activeBranch?.id || ''}
                onChange={(e) => switchBranch(e.target.value)}
                className="appearance-none bg-transparent text-[#334155] text-xs font-semibold cursor-pointer outline-hidden pr-2"
                title="Switch Active Outlet"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#64748B] absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Right: Role Pill + Live Realtime Indicator + User Profile + Logout */}
      <div className="flex items-center space-x-2.5 sm:space-x-4 flex-shrink-0">
        {/* Role Pill */}
        <div className="bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE] px-2.5 py-0.5 rounded-md text-[11px] font-semibold hidden sm:inline-block">
          {activeRole?.name || 'Staff'}
        </div>

        {/* Realtime Engine Status */}
        <div className="hidden xl:flex items-center space-x-1.5 text-xs text-[#047857] bg-[#ECFDF5] border border-[#A7F3D0] px-2.5 py-1 rounded-md font-medium">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          <span>Realtime Connected</span>
        </div>

        <div className="h-5 w-px bg-[#E2E8F0] hidden sm:block" />

        {/* User Info & Avatar */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-md bg-[#F1F5F9] text-[#334155] border border-[#CBD5E1] flex items-center justify-center font-bold text-xs flex-shrink-0">
            {user?.firstName?.charAt(0) || 'U'}
          </div>
          <div className="hidden lg:block text-left max-w-[140px]">
            <div className="text-xs font-semibold text-[#0F172A] leading-tight truncate">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="text-[10px] text-[#64748B] font-normal leading-tight truncate" title={user?.email}>
              {user?.email}
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          title="Sign Out of Workspace"
          className="p-1.5 text-[#64748B] hover:text-[#EF4444] hover:bg-[#FEF2F2] rounded-md transition-colors border border-transparent hover:border-[#FECACA]"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
