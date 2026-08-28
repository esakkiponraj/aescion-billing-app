import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Organization, Branch, Role, BusinessType, RoleType, LoginResponse } from '@aescion/shared-types';
import { ApiClient } from '../services/api';
import { joinBranchRoom, identifyPresence, disconnectPresence } from '../services/socket';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  branches: Branch[];
  activeBranch: Branch | null;
  activeRole: Role | null;
  permissions: string[];
  capabilities: string[];
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isLoading: boolean;
  login: (data: LoginResponse) => void;
  switchBranch: (branchId: string) => Promise<void>;
  updateOrganization: (updated: Partial<Organization>) => void;
  logout: () => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranch, setActiveBranch] = useState<Branch | null>(null);
  const [activeRole, setActiveRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const applyAuthData = (data: LoginResponse) => {
    localStorage.setItem('aescion_token', data.accessToken);
    localStorage.setItem('aescion_refresh_token', data.refreshToken);
    localStorage.setItem('aescion_active_branch_id', data.activeBranch.id);

    setUser(data.user);
    setOrganization(data.organization);
    setBranches(data.branches);
    setActiveBranch(data.activeBranch);
    setActiveRole(data.activeRole);
    setPermissions(data.permissions || []);
    setCapabilities(data.capabilities || []);

    identifyPresence(data.user.id, data.organization.id, data.activeBranch.id, data.activeRole?.roleType);
    joinBranchRoom(data.organization.id, data.activeBranch.id);
  };

  const login = (data: LoginResponse) => {
    applyAuthData(data);
  };

  const logout = () => {
    disconnectPresence();
    localStorage.removeItem('aescion_token');
    localStorage.removeItem('aescion_refresh_token');
    localStorage.removeItem('aescion_active_branch_id');
    setUser(null);
    setOrganization(null);
    setBranches([]);
    setActiveBranch(null);
    setActiveRole(null);
    setPermissions([]);
    setCapabilities([]);
  };

  const updateOrganization = (updated: Partial<Organization>) => {
    setOrganization((prev) => (prev ? { ...prev, ...updated } : null));
  };

  const refreshSession = async () => {
    const token = localStorage.getItem('aescion_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await ApiClient.get<LoginResponse>('/auth/me');
      applyAuthData(data);
    } catch (err) {
      console.warn('Session expired or invalid, logging out.');
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const switchBranch = async (branchId: string) => {
    localStorage.setItem('aescion_active_branch_id', branchId);
    await refreshSession();
  };

  useEffect(() => {
    refreshSession();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        branches,
        activeBranch,
        activeRole,
        permissions,
        capabilities,
        isAuthenticated: !!user && !!organization,
        isSuperAdmin: activeRole?.roleType === 'SUPER_ADMIN' || (activeRole?.roleType as any) === RoleType.SUPER_ADMIN,
        isLoading,
        login,
        switchBranch,
        updateOrganization,
        logout,
        refreshSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
