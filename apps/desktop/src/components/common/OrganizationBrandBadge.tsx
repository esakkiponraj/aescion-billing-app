import React, { useState } from 'react';
import { Organization } from '@aescion/shared-types';

interface OrganizationBrandBadgeProps {
  organization: Organization | null;
  size?: 'sm' | 'md' | 'lg';
  showBusinessType?: boolean;
  showName?: boolean;
  className?: string;
  isLoading?: boolean;
}

export function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return 'MB';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function resolveLogoUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const apiBase = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api/v1';
  const origin = apiBase.replace(/\/api\/v1\/?$/, '');
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

export const OrganizationBrandBadge: React.FC<OrganizationBrandBadgeProps> = ({
  organization,
  size = 'md',
  showBusinessType = true,
  showName = true,
  className = '',
  isLoading = false
}) => {
  const [imageError, setImageError] = useState(false);

  if (isLoading || !organization) {
    return (
      <div className={`flex items-center space-x-2.5 animate-pulse ${className}`}>
        <div className="w-8 h-8 bg-slate-200 rounded-md flex-shrink-0" />
        {showName && (
          <div className="space-y-1">
            <div className="w-24 h-3 bg-slate-200 rounded" />
            <div className="w-16 h-2 bg-slate-100 rounded" />
          </div>
        )}
      </div>
    );
  }

  const companyName = organization.name || 'My Business';
  const initials = getInitials(companyName);
  const logoUrl = resolveLogoUrl(organization.logoUrl);

  const sizeClasses = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm'
  };

  return (
    <div className={`flex items-center space-x-2.5 min-w-0 ${className}`}>
      {/* Dynamic Company Logo / Initials Avatar */}
      <div
        className={`${sizeClasses[size]} rounded-md flex items-center justify-center font-bold flex-shrink-0 overflow-hidden ${
          logoUrl && !imageError
            ? 'bg-white border border-[#E2E8F0]'
            : 'bg-[#2563EB] text-white tracking-wider'
        }`}
      >
        {logoUrl && !imageError ? (
          <img
            src={logoUrl}
            alt={companyName}
            className="w-full h-full object-contain p-0.5"
            onError={() => setImageError(true)}
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {/* Dynamic Company / Trade Name */}
      {showName && (
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-1.5">
            <span
              className="text-sm font-semibold text-[#0F172A] truncate max-w-[140px] sm:max-w-[220px] md:max-w-[280px] tracking-tight block cursor-default"
              title={companyName}
            >
              {companyName}
            </span>
            {showBusinessType && organization.businessType && (
              <span className="text-[9px] font-semibold text-[#1D4ED8] bg-[#EFF6FF] border border-[#BFDBFE] px-1.5 py-0.5 rounded uppercase tracking-wider hidden sm:inline-block flex-shrink-0">
                {organization.businessType}
              </span>
            )}
          </div>
          {organization.legalName && organization.legalName !== companyName && (
            <div className="text-[10px] text-[#64748B] font-normal truncate max-w-[200px]" title={organization.legalName}>
              {organization.legalName}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
