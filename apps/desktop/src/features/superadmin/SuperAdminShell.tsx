import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  Building2,
  Activity,
  BarChart3,
  FileText,
  LogOut,
  Layers,
  Search,
  CheckCircle2,
  Wifi,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Store
} from 'lucide-react';
import { useAuth } from '../../store/authContext';
import { getSocket } from '../../services/socket';

export const SuperAdminShell: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user, organization, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      if (socket.connected) {
        setIsSocketConnected(true);
        socket.emit('join_super_admin');
        socket.emit('join_platform');
      }
      socket.on('connect', () => {
        setIsSocketConnected(true);
        socket.emit('join_super_admin');
        socket.emit('join_platform');
      });
      socket.on('disconnect', () => setIsSocketConnected(false));
    }
  }, []);

  const navItems = [
    { label: 'Platform Pulse', path: '/super-admin', icon: Activity, exact: true },
    { label: 'Owners & Companies', path: '/super-admin/companies', icon: Building2 },
    { label: 'Live Activity Feed', path: '/super-admin/activity', icon: Layers },
    { label: 'Platform Reports', path: '/super-admin/reports', icon: BarChart3 },
    { label: 'System Audit Trail', path: '/super-admin/audit', icon: FileText }
  ];

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col antialiased text-slate-800">
      {/* Top Header */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-5 sticky top-0 z-40 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-md bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold tracking-tight text-white">AESCION COMMERCE</span>
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Super Admin OS
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Enterprise Multi-Tenant Platform Control</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 px-3 py-1 bg-slate-800/80 border border-slate-700/60 rounded-full text-xs">
            <div className={`w-2 h-2 rounded-full ${isSocketConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-[11px] font-medium text-slate-300">
              {isSocketConnected ? 'Live Multi-Tenant Socket Active' : 'Connecting Realtime...'}
            </span>
          </div>

          <div className="flex items-center space-x-3 border-l border-slate-800 pl-4">
            <div className="text-right">
              <div className="text-xs font-semibold text-white">{user?.firstName} {user?.lastName}</div>
              <div className="text-[10px] text-slate-400 font-mono">{user?.email}</div>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/');
              }}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main App Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-60 bg-white border-r border-slate-200/80 flex flex-col justify-between p-3 flex-shrink-0">
          <div className="space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Platform Navigation
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200/60 shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-500" />}
                </NavLink>
              );
            })}
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-1.5">
            <div className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-700">
              <Store className="w-3.5 h-3.5 text-blue-600" />
              <span>Platform Tenant Guard</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Multi-tenant separation is authoritatively enforced. Data is strictly isolated per company.
            </p>
          </div>
        </aside>

        {/* Content View */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC]">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};
