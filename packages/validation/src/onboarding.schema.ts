import { z } from 'zod';
import { BusinessType, TaxMode } from '@aescion/shared-types';

export const OnboardingSchema = z.object({
  // 01 Owner Registration
  owner: z.object({
    firstName: z.string().min(2, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    mobileNumber: z.string().min(10, 'Valid mobile number required'),
    email: z.string().email('Valid email required'),
    username: z.string().min(3, 'Username required'),
    password: z.string().min(6, 'Password must be at least 6 characters')
  }),

  // 02 Business Type
  businessType: z.nativeEnum(BusinessType),

  // 03 Business Details
  business: z.object({
    name: z.string().min(2, 'Business name is required'),
    legalName: z.string().optional(),
    phone: z.string().min(10, 'Phone is required'),
    email: z.string().email().optional().or(z.literal('')),
    address: z.string().optional(),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    pinCode: z.string().min(4, 'PIN code is required'),
    country: z.string().default('India'),
    currency: z.string().default('INR'),
    timezone: z.string().default('Asia/Kolkata'),
    gstStatus: z.boolean().default(false),
    gstin: z.string().optional()
  }),

  // 04 Branches
  branches: z.array(
    z.object({
      name: z.string().min(2, 'Branch name is required'),
      code: z.string().min(2, 'Branch code is required'),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      phone: z.string().optional(),
      isMain: z.boolean().default(false)
    })
  ).min(1, 'At least one branch is required'),

  // 05 Users / Team
  teamSetupMode: z.enum(['JUST_ME', 'MY_TEAM']).default('JUST_ME'),
  teamMembers: z.array(
    z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email(),
      username: z.string().min(3),
      password: z.string().min(6),
      roleType: z.string(),
      branchCode: z.string().optional()
    })
  ).optional(),

  // 06 GST / Tax Configuration
  taxSettings: z.object({
    taxMode: z.nativeEnum(TaxMode).default(TaxMode.EXCLUSIVE),
    defaultRates: z.array(z.number()).default([0, 5, 12, 18, 28]),
    enableCess: z.boolean().default(false),
    defaultCessRate: z.number().default(0)
  }),

  // 07 Billing Setup
  billingSettings: z.object({
    invoicePrefix: z.string().default('INV'),
    quotationPrefix: z.string().default('QTN'),
    receiptPrefix: z.string().default('RCP'),
    enableRoundOff: z.boolean().default(true),
    defaultReceiptFormat: z.enum(['58MM', '80MM', 'A4']).default('80MM'),
    defaultTerms: z.string().optional()
  }),

  // 08 Industry Setup Configuration
  industrySettings: z.record(z.any()).default({})
});

export type OnboardingInput = z.infer<typeof OnboardingSchema>;
