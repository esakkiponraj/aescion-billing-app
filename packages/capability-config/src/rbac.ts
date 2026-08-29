import { BusinessType, RoleType } from '@aescion/shared-types';

export enum Permission {
  // Organization & Branches
  ORG_VIEW = 'org:view',
  ORG_UPDATE = 'org:update',
  BRANCH_VIEW = 'branch:view',
  BRANCH_CREATE = 'branch:create',
  BRANCH_UPDATE = 'branch:update',

  // Users & Roles
  USER_VIEW = 'user:view',
  USER_CREATE = 'user:create',
  USER_UPDATE = 'user:update',
  ROLE_VIEW = 'role:view',
  ROLE_CREATE = 'role:create',
  ROLE_UPDATE = 'role:update',

  // Billing & POS
  POS_ACCESS = 'pos:access',
  POS_CREATE_BILL = 'pos:create_bill',
  POS_HOLD_RECALL = 'pos:hold_recall',
  POS_APPLY_DISCOUNT = 'pos:apply_discount',
  POS_OVERRIDE_PRICE = 'pos:override_price',
  POS_CREDIT_OVERRIDE = 'pos:credit_override',
  QUOTATION_VIEW = 'quotation:view',
  QUOTATION_CREATE = 'quotation:create',
  QUOTATION_CONVERT = 'quotation:convert',
  INVOICE_VIEW = 'invoice:view',
  INVOICE_CREATE = 'invoice:create',
  INVOICE_CANCEL = 'invoice:cancel',
  PAYMENT_COLLECT = 'payment:collect',
  RECEIPT_REPRINT = 'receipt:reprint',

  // Cashier Shifts
  SHIFT_OPEN = 'shift:open',
  SHIFT_CLOSE = 'shift:close',
  SHIFT_VIEW_ALL = 'shift:view_all',

  // Products & Inventory
  PRODUCT_VIEW = 'product:view',
  PRODUCT_CREATE = 'product:create',
  PRODUCT_UPDATE = 'product:update',
  PRODUCT_DELETE = 'product:delete',
  STOCK_VIEW = 'stock:view',
  STOCK_ADJUST = 'stock:adjust',
  STOCK_TRANSFER = 'stock:transfer',

  // Customers & Credit
  CUSTOMER_VIEW = 'customer:view',
  CUSTOMER_CREATE = 'customer:create',
  CUSTOMER_UPDATE = 'customer:update',
  CUSTOMER_CREDIT_MANAGE = 'customer:credit_manage',

  // Suppliers & Purchases
  SUPPLIER_VIEW = 'supplier:view',
  SUPPLIER_CREATE = 'supplier:create',
  PO_CREATE = 'po:create',
  PO_APPROVE = 'po:approve',
  GRN_CREATE = 'grn:create',

  // Reports
  REPORT_SALES = 'report:sales',
  REPORT_FINANCIAL = 'report:financial',
  REPORT_INVENTORY = 'report:inventory',
  REPORT_TAX_GST = 'report:tax_gst',
  REPORT_AUDIT_LOGS = 'report:audit_logs',

  // Industry Specific
  RESTAURANT_TABLES = 'restaurant:tables',
  RESTAURANT_KOT = 'restaurant:kot',
  RESTAURANT_KITCHEN = 'restaurant:kitchen',
  SERVICE_JOB_CREATE = 'service:job_create',
  SERVICE_JOB_ASSIGN = 'service:job_assign',
  SERVICE_JOB_UPDATE = 'service:job_update',
  PHARMACY_EXPIRED_MANAGE = 'pharmacy:expired_manage',
  WHOLESALE_DISPATCH = 'wholesale:dispatch'
}

// -------------------------------------------------------------
// CENTRALIZED DOMAIN -> PERMISSION ENTITLEMENT MAPPING
// -------------------------------------------------------------

export const COMMON_PERMISSIONS: Permission[] = [
  // Org & Team
  Permission.ORG_VIEW,
  Permission.ORG_UPDATE,
  Permission.BRANCH_VIEW,
  Permission.BRANCH_CREATE,
  Permission.BRANCH_UPDATE,
  Permission.USER_VIEW,
  Permission.USER_CREATE,
  Permission.USER_UPDATE,
  Permission.ROLE_VIEW,
  Permission.ROLE_CREATE,
  Permission.ROLE_UPDATE,
  // POS & Billing
  Permission.POS_ACCESS,
  Permission.POS_CREATE_BILL,
  Permission.POS_HOLD_RECALL,
  Permission.POS_APPLY_DISCOUNT,
  Permission.POS_OVERRIDE_PRICE,
  Permission.POS_CREDIT_OVERRIDE,
  Permission.QUOTATION_VIEW,
  Permission.QUOTATION_CREATE,
  Permission.QUOTATION_CONVERT,
  Permission.INVOICE_VIEW,
  Permission.INVOICE_CREATE,
  Permission.INVOICE_CANCEL,
  Permission.PAYMENT_COLLECT,
  Permission.RECEIPT_REPRINT,
  // Shifts
  Permission.SHIFT_OPEN,
  Permission.SHIFT_CLOSE,
  Permission.SHIFT_VIEW_ALL,
  // Products & Inventory
  Permission.PRODUCT_VIEW,
  Permission.PRODUCT_CREATE,
  Permission.PRODUCT_UPDATE,
  Permission.PRODUCT_DELETE,
  Permission.STOCK_VIEW,
  Permission.STOCK_ADJUST,
  Permission.STOCK_TRANSFER,
  // Customers & Suppliers
  Permission.CUSTOMER_VIEW,
  Permission.CUSTOMER_CREATE,
  Permission.CUSTOMER_UPDATE,
  Permission.CUSTOMER_CREDIT_MANAGE,
  Permission.SUPPLIER_VIEW,
  Permission.SUPPLIER_CREATE,
  Permission.PO_CREATE,
  Permission.PO_APPROVE,
  Permission.GRN_CREATE,
  // Reports
  Permission.REPORT_SALES,
  Permission.REPORT_FINANCIAL,
  Permission.REPORT_INVENTORY,
  Permission.REPORT_TAX_GST,
  Permission.REPORT_AUDIT_LOGS
];

export const DOMAIN_SPECIFIC_PERMISSIONS: Record<BusinessType, Permission[]> = {
  [BusinessType.RESTAURANT]: [
    Permission.RESTAURANT_TABLES,
    Permission.RESTAURANT_KOT,
    Permission.RESTAURANT_KITCHEN
  ],
  [BusinessType.SERVICE]: [
    Permission.SERVICE_JOB_CREATE,
    Permission.SERVICE_JOB_ASSIGN,
    Permission.SERVICE_JOB_UPDATE
  ],
  [BusinessType.PHARMACY]: [
    Permission.PHARMACY_EXPIRED_MANAGE
  ],
  [BusinessType.WHOLESALE]: [
    Permission.WHOLESALE_DISPATCH
  ],
  [BusinessType.SUPERMARKET]: [],
  [BusinessType.RETAIL]: []
};

/**
 * Returns all permissions valid for a specific business domain.
 */
export function getDomainAllowedPermissions(businessType: BusinessType | string): Permission[] {
  const domain = (businessType as BusinessType) || BusinessType.RETAIL;
  const specific = DOMAIN_SPECIFIC_PERMISSIONS[domain] || [];
  return [...COMMON_PERMISSIONS, ...specific];
}

/**
 * Validates whether a given list of permissions is legally allowed for a business domain.
 */
export function validateDomainPermissions(
  businessType: BusinessType | string,
  permissions: (Permission | string)[]
): { valid: boolean; invalidPermissions: string[] } {
  const allowed = new Set<string>(getDomainAllowedPermissions(businessType));
  const invalidPermissions: string[] = [];

  for (const perm of permissions) {
    if (!allowed.has(perm)) {
      invalidPermissions.push(perm);
    }
  }

  return {
    valid: invalidPermissions.length === 0,
    invalidPermissions
  };
}

// -------------------------------------------------------------
// DOMAIN-AWARE ROLE TEMPLATES
// -------------------------------------------------------------

export interface DomainRoleTemplate {
  roleType: RoleType;
  name: string;
  description: string;
  defaultPermissions: Permission[];
}

export function getDomainRoleTemplates(businessType: BusinessType | string): DomainRoleTemplate[] {
  const domain = (businessType as BusinessType) || BusinessType.RETAIL;

  const baseTemplates: DomainRoleTemplate[] = [
    {
      roleType: RoleType.OWNER,
      name: 'Owner',
      description: 'Full business administration, financial control, and company configuration.',
      defaultPermissions: getDomainAllowedPermissions(domain)
    },
    {
      roleType: RoleType.MANAGER,
      name: 'Store / Operations Manager',
      description: 'Supervises daily store operations, floor staff, billing, inventory, and reports.',
      defaultPermissions: [
        Permission.ORG_VIEW,
        Permission.BRANCH_VIEW,
        Permission.USER_VIEW,
        Permission.ROLE_VIEW,
        Permission.POS_ACCESS,
        Permission.POS_CREATE_BILL,
        Permission.POS_HOLD_RECALL,
        Permission.POS_APPLY_DISCOUNT,
        Permission.POS_OVERRIDE_PRICE,
        Permission.POS_CREDIT_OVERRIDE,
        Permission.QUOTATION_VIEW,
        Permission.QUOTATION_CREATE,
        Permission.QUOTATION_CONVERT,
        Permission.INVOICE_VIEW,
        Permission.INVOICE_CREATE,
        Permission.INVOICE_CANCEL,
        Permission.PAYMENT_COLLECT,
        Permission.RECEIPT_REPRINT,
        Permission.SHIFT_OPEN,
        Permission.SHIFT_CLOSE,
        Permission.SHIFT_VIEW_ALL,
        Permission.PRODUCT_VIEW,
        Permission.PRODUCT_CREATE,
        Permission.PRODUCT_UPDATE,
        Permission.STOCK_VIEW,
        Permission.STOCK_ADJUST,
        Permission.STOCK_TRANSFER,
        Permission.CUSTOMER_VIEW,
        Permission.CUSTOMER_CREATE,
        Permission.CUSTOMER_UPDATE,
        Permission.CUSTOMER_CREDIT_MANAGE,
        Permission.SUPPLIER_VIEW,
        Permission.SUPPLIER_CREATE,
        Permission.PO_CREATE,
        Permission.PO_APPROVE,
        Permission.GRN_CREATE,
        Permission.REPORT_SALES,
        Permission.REPORT_INVENTORY,
        Permission.REPORT_TAX_GST,
        ...(DOMAIN_SPECIFIC_PERMISSIONS[domain] || [])
      ]
    },
    {
      roleType: RoleType.CASHIER,
      name: 'Cashier',
      description: 'Processes fast counter sales, collects customer payments, and manages shifts.',
      defaultPermissions: [
        Permission.POS_ACCESS,
        Permission.POS_CREATE_BILL,
        Permission.POS_HOLD_RECALL,
        Permission.INVOICE_VIEW,
        Permission.INVOICE_CREATE,
        Permission.PAYMENT_COLLECT,
        Permission.RECEIPT_REPRINT,
        Permission.SHIFT_OPEN,
        Permission.SHIFT_CLOSE,
        Permission.PRODUCT_VIEW,
        Permission.CUSTOMER_VIEW,
        Permission.CUSTOMER_CREATE,
        ...(domain === BusinessType.RESTAURANT
          ? [Permission.RESTAURANT_TABLES, Permission.RESTAURANT_KOT]
          : [])
      ]
    },
    {
      roleType: RoleType.ACCOUNTANT,
      name: 'Accountant',
      description: 'Manages sales invoices, payment collections, receipts, receivables, and tax reports.',
      defaultPermissions: [
        Permission.INVOICE_VIEW,
        Permission.QUOTATION_VIEW,
        Permission.CUSTOMER_VIEW,
        Permission.SUPPLIER_VIEW,
        Permission.REPORT_SALES,
        Permission.REPORT_FINANCIAL,
        Permission.REPORT_TAX_GST,
        Permission.RECEIPT_REPRINT
      ]
    },
    {
      roleType: RoleType.INVENTORY_STAFF,
      name: 'Inventory Staff',
      description: 'Manages stock adjustments, warehouse transfers, vendor purchase orders, and GRNs.',
      defaultPermissions: [
        Permission.PRODUCT_VIEW,
        Permission.PRODUCT_CREATE,
        Permission.PRODUCT_UPDATE,
        Permission.STOCK_VIEW,
        Permission.STOCK_ADJUST,
        Permission.STOCK_TRANSFER,
        Permission.SUPPLIER_VIEW,
        Permission.PO_CREATE,
        Permission.GRN_CREATE,
        Permission.REPORT_INVENTORY,
        ...(domain === BusinessType.PHARMACY ? [Permission.PHARMACY_EXPIRED_MANAGE] : [])
      ]
    }
  ];

  // Industry-specific additional role templates
  if (domain === BusinessType.RESTAURANT) {
    baseTemplates.push(
      {
        roleType: RoleType.WAITER,
        name: 'Waiter',
        description: 'Handles table floor occupancy, dine-in orders, KOT dispatch, and served notifications.',
        defaultPermissions: [
          Permission.RESTAURANT_TABLES,
          Permission.RESTAURANT_KOT,
          Permission.POS_ACCESS,
          Permission.PRODUCT_VIEW,
          Permission.CUSTOMER_VIEW,
          Permission.CUSTOMER_CREATE
        ]
      },
      {
        roleType: RoleType.KITCHEN,
        name: 'Kitchen / Chef',
        description: 'Receives live KOT tickets, manages prep status, and alerts front-of-house when ready.',
        defaultPermissions: [
          Permission.RESTAURANT_KITCHEN,
          Permission.RESTAURANT_KOT,
          Permission.PRODUCT_VIEW
        ]
      }
    );
  } else if (domain === BusinessType.SERVICE) {
    baseTemplates.push({
      roleType: RoleType.TECHNICIAN,
      name: 'Service Technician',
      description: 'Inspects repair items, logs diagnostic notes, manages spare parts, and updates job cards.',
      defaultPermissions: [
        Permission.SERVICE_JOB_UPDATE,
        Permission.CUSTOMER_VIEW,
        Permission.PRODUCT_VIEW
      ]
    });
  }

  return baseTemplates;
}

export const DEFAULT_ROLE_PERMISSIONS: Record<RoleType, Permission[]> = {
  [RoleType.OWNER]: Object.values(Permission),
  [RoleType.MANAGER]: [
    Permission.ORG_VIEW,
    Permission.BRANCH_VIEW,
    Permission.USER_VIEW,
    Permission.ROLE_VIEW,
    Permission.POS_ACCESS,
    Permission.POS_CREATE_BILL,
    Permission.POS_HOLD_RECALL,
    Permission.POS_APPLY_DISCOUNT,
    Permission.POS_OVERRIDE_PRICE,
    Permission.POS_CREDIT_OVERRIDE,
    Permission.QUOTATION_VIEW,
    Permission.QUOTATION_CREATE,
    Permission.QUOTATION_CONVERT,
    Permission.INVOICE_VIEW,
    Permission.INVOICE_CREATE,
    Permission.INVOICE_CANCEL,
    Permission.PAYMENT_COLLECT,
    Permission.RECEIPT_REPRINT,
    Permission.SHIFT_OPEN,
    Permission.SHIFT_CLOSE,
    Permission.SHIFT_VIEW_ALL,
    Permission.PRODUCT_VIEW,
    Permission.PRODUCT_CREATE,
    Permission.PRODUCT_UPDATE,
    Permission.STOCK_VIEW,
    Permission.STOCK_ADJUST,
    Permission.STOCK_TRANSFER,
    Permission.CUSTOMER_VIEW,
    Permission.CUSTOMER_CREATE,
    Permission.CUSTOMER_UPDATE,
    Permission.CUSTOMER_CREDIT_MANAGE,
    Permission.SUPPLIER_VIEW,
    Permission.SUPPLIER_CREATE,
    Permission.PO_CREATE,
    Permission.PO_APPROVE,
    Permission.GRN_CREATE,
    Permission.REPORT_SALES,
    Permission.REPORT_INVENTORY,
    Permission.REPORT_TAX_GST,
    Permission.RESTAURANT_TABLES,
    Permission.RESTAURANT_KOT,
    Permission.RESTAURANT_KITCHEN,
    Permission.SERVICE_JOB_CREATE,
    Permission.SERVICE_JOB_ASSIGN,
    Permission.SERVICE_JOB_UPDATE,
    Permission.PHARMACY_EXPIRED_MANAGE,
    Permission.WHOLESALE_DISPATCH
  ],
  [RoleType.CASHIER]: [
    Permission.POS_ACCESS,
    Permission.POS_CREATE_BILL,
    Permission.POS_HOLD_RECALL,
    Permission.INVOICE_VIEW,
    Permission.INVOICE_CREATE,
    Permission.PAYMENT_COLLECT,
    Permission.RECEIPT_REPRINT,
    Permission.SHIFT_OPEN,
    Permission.SHIFT_CLOSE,
    Permission.PRODUCT_VIEW,
    Permission.CUSTOMER_VIEW,
    Permission.CUSTOMER_CREATE,
    Permission.RESTAURANT_TABLES,
    Permission.RESTAURANT_KOT
  ],
  [RoleType.ACCOUNTANT]: [
    Permission.INVOICE_VIEW,
    Permission.QUOTATION_VIEW,
    Permission.CUSTOMER_VIEW,
    Permission.SUPPLIER_VIEW,
    Permission.REPORT_SALES,
    Permission.REPORT_FINANCIAL,
    Permission.REPORT_TAX_GST,
    Permission.RECEIPT_REPRINT
  ],
  [RoleType.INVENTORY_STAFF]: [
    Permission.PRODUCT_VIEW,
    Permission.PRODUCT_CREATE,
    Permission.PRODUCT_UPDATE,
    Permission.STOCK_VIEW,
    Permission.STOCK_ADJUST,
    Permission.STOCK_TRANSFER,
    Permission.SUPPLIER_VIEW,
    Permission.PO_CREATE,
    Permission.GRN_CREATE,
    Permission.REPORT_INVENTORY,
    Permission.PHARMACY_EXPIRED_MANAGE
  ],
  [RoleType.WAITER]: [
    Permission.RESTAURANT_TABLES,
    Permission.RESTAURANT_KOT,
    Permission.POS_ACCESS,
    Permission.PRODUCT_VIEW,
    Permission.CUSTOMER_VIEW,
    Permission.CUSTOMER_CREATE
  ],
  [RoleType.KITCHEN]: [
    Permission.RESTAURANT_KITCHEN,
    Permission.RESTAURANT_KOT,
    Permission.PRODUCT_VIEW
  ],
  [RoleType.TECHNICIAN]: [
    Permission.CUSTOMER_VIEW,
    Permission.PRODUCT_VIEW,
    Permission.SERVICE_JOB_UPDATE
  ],
  [RoleType.SUPER_ADMIN]: Object.values(Permission),
  [RoleType.CUSTOM]: [
    Permission.POS_ACCESS,
    Permission.POS_CREATE_BILL,
    Permission.PRODUCT_VIEW
  ]
};

