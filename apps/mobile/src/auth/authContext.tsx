import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Organization, Branch, Role, LoginResponse } from '@aescion/shared-types';
import { saveSecureItem, getSecureItem, deleteSecureItem } from './secureStorage';
import { MobileApiClient } from '../api/mobileApiClient';
import { joinMobileBranchRoom } from '../realtime/socket';
import { syncInitialCatalog, refreshQueueCounts } from '../sync/syncEngine';

interface MobileAuthContextType {
  user: User | null;
  organization: Organization | null;
  branches: Branch[];
  activeBranch: Branch | null;
  activeRole: Role | null;
  permissions: string[];
  capabilities: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, pass: string) => Promise<void>;
  switchBranch: (branchId: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const MobileAuthContext = createContext<MobileAuthContextType | undefined>(undefined);

export const MobileAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranch, setActiveBranch] = useState<Branch | null>(null);
  const [activeRole, setActiveRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const applyAuthPayload = async (data: LoginResponse) => {
    await saveSecureItem('aescion_mobile_token', data.accessToken);
    await saveSecureItem('aescion_mobile_refresh_token', data.refreshToken);
    await saveSecureItem('aescion_mobile_branch_id', data.activeBranch.id);
    await saveSecureItem('aescion_cached_user', JSON.stringify(data.user));
    await saveSecureItem('aescion_cached_org', JSON.stringify(data.organization));
    await saveSecureItem('aescion_cached_branch', JSON.stringify(data.activeBranch));
    await saveSecureItem('aescion_cached_role', JSON.stringify(data.activeRole));
    await saveSecureItem('aescion_cached_perms', JSON.stringify(data.permissions || []));
    await saveSecureItem('aescion_cached_caps', JSON.stringify(data.capabilities || []));

    setUser(data.user);
    setOrganization(data.organization);
    setBranches(data.branches || [data.activeBranch]);
    setActiveBranch(data.activeBranch);
    setActiveRole(data.activeRole);
    setPermissions(data.permissions || []);
    setCapabilities(data.capabilities || []);

    joinMobileBranchRoom(data.organization.id, data.activeBranch.id);
    syncInitialCatalog(data.organization.id, data.activeBranch.id);
    refreshQueueCounts();
  };

  const login = async (identifier: string, pass: string) => {
    setIsLoading(true);
    try {
      const data = await MobileApiClient.post<LoginResponse>('/auth/login', {
        identifier,
        password: pass
      });
      await applyAuthPayload(data);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await deleteSecureItem('aescion_mobile_token');
    await deleteSecureItem('aescion_mobile_refresh_token');
    await deleteSecureItem('aescion_mobile_branch_id');
    await deleteSecureItem('aescion_cached_user');
    await deleteSecureItem('aescion_cached_org');
    await deleteSecureItem('aescion_cached_branch');
    await deleteSecureItem('aescion_cached_role');
    await deleteSecureItem('aescion_cached_perms');
    await deleteSecureItem('aescion_cached_caps');

    setUser(null);
    setOrganization(null);
    setBranches([]);
    setActiveBranch(null);
    setActiveRole(null);
    setPermissions([]);
    setCapabilities([]);
  };

  const refreshSession = async () => {
    const token = await getSecureItem('aescion_mobile_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await MobileApiClient.get<LoginResponse>('/auth/me');
      await applyAuthPayload(data);
    } catch (err) {
      console.warn('Online session validation failed, attempting offline cached session:', err);
      // Attempt offline restore
      const cachedUser = await getSecureItem('aescion_cached_user');
      const cachedOrg = await getSecureItem('aescion_cached_org');
      const cachedBranch = await getSecureItem('aescion_cached_branch');
      const cachedRole = await getSecureItem('aescion_cached_role');
      const cachedPerms = await getSecureItem('aescion_cached_perms');
      const cachedCaps = await getSecureItem('aescion_cached_caps');

      if (cachedUser && cachedOrg && cachedBranch) {
        setUser(JSON.parse(cachedUser));
        setOrganization(JSON.parse(cachedOrg));
        setActiveBranch(JSON.parse(cachedBranch));
        setActiveRole(cachedRole ? JSON.parse(cachedRole) : null);
        setPermissions(cachedPerms ? JSON.parse(cachedPerms) : []);
        setCapabilities(cachedCaps ? JSON.parse(cachedCaps) : []);
        refreshQueueCounts();
      } else {
        await logout();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const switchBranch = async (branchId: string) => {
    await saveSecureItem('aescion_mobile_branch_id', branchId);
    await refreshSession();
  };

  useEffect(() => {
    refreshSession();
  }, []);

  return (
    <MobileAuthContext.Provider
      value={{
        user,
        organization,
        branches,
        activeBranch,
        activeRole,
        permissions,
        capabilities,
        isAuthenticated: !!user && !!organization,
        isLoading,
        login,
        switchBranch,
        logout,
        refreshSession
      }}
    >
      {children}
    </MobileAuthContext.Provider>
  );
};

export const useMobileAuth = () => {
  const context = useContext(MobileAuthContext);
  if (!context) {
    throw new Error('useMobileAuth must be used within a MobileAuthProvider');
  }
  return context;
};
