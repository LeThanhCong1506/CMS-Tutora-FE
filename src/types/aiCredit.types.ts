export interface AiCreditPackage {
  packageId: number;
  code: string;
  name: string;
  creditAmount: number;
  price: number;
  currency: string;
  isPurchasable: boolean;
  isActive: boolean;
  sortOrder: number;
  description: string | null;
  iconUrl: string | null;
}

export interface CreateAiCreditPackageBody {
  code: string;          
  name: string;          
  creditAmount: number;  
  price: number;         
  currency?: string;     
  isPurchasable: boolean;
  isActive: boolean;
  sortOrder: number;
  description?: string | null;
  iconUrl?: string | null;
}

export interface UpdateAiCreditPackageBody {
  name: string;
  creditAmount: number;
  price: number;
  currency?: string;
  isPurchasable: boolean;
  isActive: boolean;
  sortOrder: number;
  description?: string | null;
  iconUrl?: string | null;
}

export interface BookingBonusConfig {
  /** Number of AI credits granted per booking. Must be ≥0. */
  amount: number;
}

export type AiCreditErrorCode =
  | 'AI_CREDIT_PACKAGE_CODE_EXISTS'
  | 'AI_CREDIT_PACKAGE_NOT_FOUND'
  | 'AI_CREDIT_INVALID_AMOUNT';

export interface PackageFormValues {
  code: string;
  name: string;
  creditAmount: string;
  price: string;
  currency: string;
  isPurchasable: boolean;
  isActive: boolean;
  sortOrder: string;
  description: string;
  iconUrl: string;
}

export const PACKAGE_FORM_DEFAULT: PackageFormValues = {
  code: '',
  name: '',
  creditAmount: '0',
  price: '0',
  currency: 'VND',
  isPurchasable: true,
  isActive: true,
  sortOrder: '0',
  description: '',
  iconUrl: '',
};
