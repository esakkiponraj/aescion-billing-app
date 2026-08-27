import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Zap,
  Package,
  FileSpreadsheet,
  FileText,
  Receipt,
  Users,
  Building2,
  ShieldCheck,
  Store,
  BarChart3,
  Settings,
  Grid,
  ChefHat,
  Wrench,
  Smartphone,
  Pill,
  AlertTriangle,
  ShoppingCart,
  Truck,
  Clock
} from 'lucide-react';
import { useAuth } from '../../store/authContext';
import { getNavigationForContext } from '@aescion/capability-config';
import { BusinessType, RoleType } from '@aescion/shared-types';

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  LayoutDashboard,
  Zap,
  Package,
  FileSpreadsheet,
  FileText,
  Receipt,
  Users,
  Building2,
  ShieldCheck,
  Store,
  BarChart3,
  Settings,
  Grid,
  ChefHat,
  Wrench,
  Smartphone,
  Pill,
  AlertTriangle,
  ShoppingCart,
  Truck,
  Clock
};

interface LeftSidebarProps {
  onNavigate?: () => void;
  className?: string;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ onNavigate, className = '' }) => {
  const { organization, activeRole, capabilities, permissions } = useAuth();

  const businessType = (organization?.businessType as BusinessType) || BusinessType.SUPERMARKET;
  const roleType = (activeRole?.roleType as RoleType) || RoleType.OWNER;

  const navigationGroups = getNavigationForContext(
    businessType,
    capabilities as any,
    roleType,
    permissions
  );

  return (
    <nav className={`w-64 bg-white flex flex-col h-full overflow-y-auto ${className}`}>
      {/* Navigation Links Area - Starts directly with categories */}
      <div className="p-3.5 space-y-5 flex-1">
        {navigationGroups.map((group) => (
          <div key={group.id} className="space-y-1">
            <div className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider px-3 py-1 mb-0.5">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const IconComponent = ICON_MAP[item.icon] || LayoutDashboard;
                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    onClick={() => onNavigate?.()}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-[#EFF6FF] text-[#1D4ED8] font-semibold border border-[#BFDBFE]'
                          : 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#2563EB]'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <IconComponent className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#2563EB]' : 'text-[#64748B]'}`} />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="text-[10px] font-semibold bg-[#2563EB] text-white px-1.5 py-0.5 rounded flex-shrink-0">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
};
