import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { TopBar } from './TopBar';
import { LeftSidebar } from './LeftSidebar';
import { OrganizationBrandBadge } from '../common/OrganizationBrandBadge';
import { useAuth } from '../../store/authContext';

export const WorkspaceShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { organization } = useAuth();

  // Prevent background scrolling on mobile when drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#F7F9FC] flex flex-col font-sans select-none">
      {/* Fixed-Height Top Navigation */}
      <TopBar onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

      {/* Main Layout Area: Independent Scrolling for Sidebar & Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Desktop Fixed Left Sidebar */}
        <aside className="hidden lg:flex w-64 flex-col flex-shrink-0 h-full border-r border-[#E2E8F0] bg-white overflow-hidden">
          <LeftSidebar />
        </aside>

        {/* Mobile Slide-Over Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            {/* Backdrop overlay */}
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Slide-over Menu Container */}
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-xl z-50 h-full border-r border-[#E2E8F0]">
              {/* Drawer Top Header with Single Company Branding + Close Button */}
              <div className="h-16 px-4 border-b border-[#E2E8F0] flex items-center justify-between bg-white flex-shrink-0">
                <OrganizationBrandBadge organization={organization} size="sm" />
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Navigation List */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                <LeftSidebar onNavigate={() => setIsMobileMenuOpen(false)} />
              </div>
            </div>
          </div>
        )}

        {/* Dedicated Main Content Scroll Container */}
        <main className="flex-1 min-w-0 min-h-0 h-full overflow-y-auto p-4 sm:p-6 lg:p-6 bg-[#F7F9FC]">
          {children}
        </main>
      </div>
    </div>
  );
};
