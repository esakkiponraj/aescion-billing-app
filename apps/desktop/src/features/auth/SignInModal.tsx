import React, { useState } from 'react';
import { Zap, X, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { ApiClient } from '../../services/api';
import { useAuth } from '../../store/authContext';

interface SignInModalProps {
  onClose: () => void;
  onOpenOnboarding: () => void;
}

export const SignInModal: React.FC<SignInModalProps> = ({ onClose, onOpenOnboarding }) => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setErrorMsg('Please enter both your identifier and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await ApiClient.post<any>('/auth/login', { identifier, password });
      login(response);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-lg shadow-xl border border-[#E2E8F0] overflow-hidden animate-in fade-in zoom-in-95">
        <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-md bg-[#2563EB] flex items-center justify-center font-bold text-white shadow-2xs">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Sign In to AESCION</h3>
              <p className="text-[11px] text-[#64748B]">Authorized Workspace Access</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#0F172A] p-1 rounded transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSignIn} className="p-5 space-y-3.5 bg-white text-xs">
          {errorMsg && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] px-3.5 py-2.5 rounded-md text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">Email or Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter email or username"
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-[#CBD5E1] rounded-md focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 outline-hidden transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-[#CBD5E1] rounded-md focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 outline-hidden transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white font-semibold text-xs rounded-md shadow-sm flex items-center justify-center space-x-1.5 transition mt-2"
          >
            <span>{isLoading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <div className="text-center pt-2 border-t border-[#EDF1F5]">
            <span className="text-[11px] text-[#64748B]">New enterprise store? </span>
            <button
              type="button"
              onClick={() => { onClose(); onOpenOnboarding(); }}
              className="text-[11px] font-semibold text-[#2563EB] hover:text-[#1D4ED8]"
            >
              Start 9-Step Onboarding
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
