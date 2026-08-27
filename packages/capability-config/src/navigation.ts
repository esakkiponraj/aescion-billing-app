import { BusinessType, RoleType } from '@aescion/shared-types';
import { Capability } from './capabilities';
import { Permission } from './rbac';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  requiredCapability?: Capability;
  requiredPermissions?: Permission[];
  badge?: string;
  isAction?: boolean;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export function getNavigationForContext(
  businessType: BusinessType,
  enabledCapabilities: Capability[],
  roleType: RoleType,
  userPermissions: string[]
): NavGroup[] {
  const hasCapability = (cap?: Capability) => !cap || enabledCapabilities.includes(cap);
  const hasPermission = (perms?: Permission[]) => {
    if (!perms || perms.length === 0) return true;
    if (roleType === RoleType.OWNER || roleType === RoleType.SUPER_ADMIN) return true;
    return perms.some((p) => userPermissions.includes(p));
  };

  const isAllowed = (item: NavItem) => hasCapability(item.requiredCapability) && hasPermission(item.requiredPermissions);

  // Group 1: Operations Header
  let opsTitle = 'OPERATIONS';
  let pulseLabel = 'Business Pulse';

  switch (businessType) {
    case BusinessType.SUPERMARKET:
      opsTitle = 'SUPERMARKET / GROCERY OPERATIONS';
      pulseLabel = 'Supermarket Pulse';
      break;
    case BusinessType.RETAIL:
      opsTitle = 'RETAIL SHOP OPERATIONS';
      pulseLabel = 'Retail Pulse';
      break;
    case BusinessType.RESTAURANT:
      opsTitle = 'RESTAURANT / CAFE OPERATIONS';
      pulseLabel = 'Restaurant Pulse';
      break;
    case BusinessType.SERVICE:
      opsTitle = 'SERVICE & REPAIR OPERATIONS';
      pulseLabel = 'Service Center Pulse';
      break;
    case BusinessType.PHARMACY:
      opsTitle = 'PHARMACY OPERATIONS';
      pulseLabel = 'Pharmacy Pulse';
      break;
    case BusinessType.WHOLESALE:
      opsTitle = 'WHOLESALE & DISTRIBUTION';
      pulseLabel = 'Distribution Pulse';
      break;
  }

  const operationsItems: NavItem[] = [
    {
      id: 'dashboard',
      label: pulseLabel,
      path: '/dashboard',
      icon: 'LayoutDashboard'
    }
  ];

  // Industry-specific operation links
  if (businessType === BusinessType.RESTAURANT) {
    operationsItems.push(
      {
        id: 'restaurant-tables',
        label: 'Floor & Tables',
        path: '/restaurant/tables',
        icon: 'Grid',
        requiredCapability: Capability.TABLE_FLOOR_MANAGEMENT,
        requiredPermissions: [Permission.RESTAURANT_TABLES]
      },
      {
        id: 'restaurant-kitchen',
        label: 'Kitchen KOT Screen',
        path: '/restaurant/kitchen',
        icon: 'ChefHat',
        requiredCapability: Capability.KOT_KITCHEN_DISPLAY,
        requiredPermissions: [Permission.RESTAURANT_KITCHEN]
      }
    );
  }

  if (businessType === BusinessType.SERVICE) {
    operationsItems.push(
      {
        id: 'service-jobs',
        label: 'Repair Job Cards',
        path: '/service/jobs',
        icon: 'Wrench',
        requiredCapability: Capability.SERVICE_JOB_CARDS,
        requiredPermissions: [Permission.SERVICE_JOB_UPDATE]
      },
      {
        id: 'service-assets',
        label: 'Customer Assets',
        path: '/service/assets',
        icon: 'Smartphone',
        requiredCapability: Capability.CUSTOMER_ASSET_INTAKE,
        requiredPermissions: [Permission.CUSTOMER_VIEW]
      }
    );
  }

  if (businessType === BusinessType.PHARMACY) {
    operationsItems.push(
      {
        id: 'pharmacy-medicines',
        label: 'Medicine Master',
        path: '/pharmacy/medicines',
        icon: 'Pill',
        requiredCapability: Capability.MEDICINE_MASTER,
        requiredPermissions: [Permission.PRODUCT_VIEW]
      },
      {
        id: 'pharmacy-expiry',
        label: 'Batch & Expiry Control',
        path: '/pharmacy/expiry',
        icon: 'AlertTriangle',
        requiredCapability: Capability.EXPIRED_STOCK_BLOCK_ENGINE,
        requiredPermissions: [Permission.STOCK_VIEW]
      }
    );
  }

  if (businessType === BusinessType.WHOLESALE) {
    operationsItems.push(
      {
        id: 'wholesale-orders',
        label: 'Sales Orders',
        path: '/wholesale/orders',
        icon: 'ShoppingCart',
        requiredCapability: Capability.BULK_ORDERS,
        requiredPermissions: [Permission.INVOICE_VIEW]
      },
      {
        id: 'wholesale-dispatch',
        label: 'Dispatch & Challans',
        path: '/wholesale/dispatch',
        icon: 'Truck',
        requiredCapability: Capability.DISPATCH_CHALLANS,
        requiredPermissions: [Permission.WHOLESALE_DISPATCH]
      }
    );
  }

  // Common Catalog & Stock
  operationsItems.push(
    {
      id: 'products',
      label: businessType === BusinessType.RESTAURANT ? 'Menu & Items' : 'Products & Stock',
      path: '/products',
      icon: 'Package',
      requiredCapability: Capability.PRODUCTS_CATALOG,
      requiredPermissions: [Permission.PRODUCT_VIEW]
    },
    {
      id: 'fast-pos',
      label: 'Fast Billing (POS)',
      path: '/pos',
      icon: 'Zap',
      requiredCapability: Capability.FAST_POS,
      requiredPermissions: [Permission.POS_ACCESS],
      badge: 'Live'
    }
  );

  if (businessType === BusinessType.SUPERMARKET) {
    operationsItems.push({
      id: 'supermarket-shifts',
      label: 'Cashier Shifts',
      path: '/supermarket/shifts',
      icon: 'Clock',
      requiredCapability: Capability.CASHIER_SHIFTS,
      requiredPermissions: [Permission.SHIFT_OPEN]
    });
  }

  // Group 2: Billing & Documents
  const billingItems: NavItem[] = [
    {
      id: 'quotations',
      label: 'Quotations / Estimates',
      path: '/billing/quotations',
      icon: 'FileSpreadsheet',
      requiredCapability: Capability.QUOTATIONS,
      requiredPermissions: [Permission.QUOTATION_VIEW]
    },
    {
      id: 'invoices',
      label: 'Invoices & Bills',
      path: '/billing/invoices',
      icon: 'FileText',
      requiredCapability: Capability.INVOICES,
      requiredPermissions: [Permission.INVOICE_VIEW]
    },
    {
      id: 'receipts',
      label: 'Payments & Receipts',
      path: '/billing/receipts',
      icon: 'Receipt',
      requiredCapability: Capability.PAYMENTS_AND_RECEIPTS,
      requiredPermissions: [Permission.INVOICE_VIEW]
    }
  ];

  // Group 3: Management
  const managementItems: NavItem[] = [
    {
      id: 'customers',
      label: 'Customers & Credit',
      path: '/management/customers',
      icon: 'Users',
      requiredCapability: Capability.CUSTOMERS_MANAGEMENT,
      requiredPermissions: [Permission.CUSTOMER_VIEW]
    },
    {
      id: 'suppliers',
      label: 'Suppliers & Purchases',
      path: '/management/suppliers',
      icon: 'Building2',
      requiredCapability: Capability.SUPPLIERS_MANAGEMENT,
      requiredPermissions: [Permission.SUPPLIER_VIEW]
    },
    {
      id: 'team',
      label: 'Team & Access',
      path: '/management/team',
      icon: 'ShieldCheck',
      requiredCapability: Capability.TEAM_AND_ROLES,
      requiredPermissions: [Permission.USER_VIEW]
    },
    {
      id: 'branches',
      label: 'Outlets & Branches',
      path: '/management/branches',
      icon: 'Store',
      requiredCapability: Capability.BRANCHES_MANAGEMENT,
      requiredPermissions: [Permission.BRANCH_VIEW]
    },
    {
      id: 'reports',
      label: 'Reports & Audits',
      path: '/management/reports',
      icon: 'BarChart3',
      requiredCapability: Capability.REPORTS_ANALYTICS,
      requiredPermissions: [Permission.REPORT_SALES]
    },
    {
      id: 'settings',
      label: 'Settings & Tax',
      path: '/management/settings',
      icon: 'Settings',
      requiredPermissions: [Permission.ORG_UPDATE]
    }
  ];

  return [
    {
      id: 'operations',
      label: opsTitle,
      items: operationsItems.filter(isAllowed)
    },
    {
      id: 'billing',
      label: 'BILLING & DOCUMENTS',
      items: billingItems.filter(isAllowed)
    },
    {
      id: 'management',
      label: 'MANAGEMENT',
      items: managementItems.filter(isAllowed)
    }
  ].filter((g) => g.items.length > 0);
}
