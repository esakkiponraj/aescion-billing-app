import { BusinessType, RoleType } from './enums';

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  mobileNumber?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  legalName?: string;
  businessType: BusinessType;
  logoUrl?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  country: string;
  currency: string;
  timezone: string;
  gstStatus: boolean;
  gstin?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Branch {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  isMain: boolean;
  isActive: boolean;
  createdAt: Date;
}

export interface Register {
  id: string;
  organizationId: string;
  branchId: string;
  name: string;
  code: string;
  isActive: boolean;
}

export interface Role {
  id: string;
  organizationId?: string;
  name: string;
  roleType: RoleType;
  permissions: string[];
  isSystem: boolean;
}

export interface Membership {
  id: string;
  userId: string;
  organizationId: string;
  branchId?: string;
  roleId: string;
  role: Role;
  isActive: boolean;
  user?: User;
  organization?: Organization;
  branch?: Branch;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  organizationId: string;
  branchId?: string;
  roleId: string;
  roleType: RoleType;
  permissions: string[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  organization: Organization;
  branches: Branch[];
  activeBranch: Branch;
  activeRole: Role;
  permissions: string[];
  capabilities: string[];
}
