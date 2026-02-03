export interface User {
  id: string;
  email: string;
  name: string;
  company: string | null;
  role: 'admin' | 'user';
}

export interface AuthResponse {
  token: string;
  user: User;
}

export type CategoryType = 'labor' | 'material' | 'consumable' | 'transport' | 'ndt';

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: CategoryType;
  created_at: string;
}

export interface CostItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  unit: string;
  unit_price: number;
  ndt_method: 'RT' | 'UT' | 'MT' | 'PT' | 'VT' | null;
  ndt_level: 'Level I' | 'Level II' | 'Level III' | null;
  created_at: string;
  category_name?: string;
  category_type?: CategoryType;
}

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected';

export interface Quote {
  id: string;
  user_id: string;
  quote_number: string;
  customer_name: string;
  customer_email: string | null;
  customer_address: string | null;
  project_name: string;
  project_description: string | null;
  reference: string | null;
  valid_until: string | null;
  status: QuoteStatus;
  markup_percent: number;
  notes: string | null;
  terms: string | null;
  created_at: string;
  updated_at: string;
  total_cost?: number;
  line_count?: number;
}

export interface QuoteLine {
  id: string;
  quote_id: string;
  cost_item_id: string | null;
  category_type: CategoryType;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  line_markup: number;
  line_total: number;
  sort_order: number;
  created_at: string;
  item_name?: string;
}

export interface QuoteSummary {
  categoryTotals: Record<CategoryType, number>;
  totalCost: number;
  markupPercent: number;
  markup: number;
  totalExVat: number;
  vatPercent: number;
  vat: number;
  totalIncVat: number;
}

export interface CompanySettings {
  id: string;
  user_id: string;
  company_name: string | null;
  org_number: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  default_terms: string | null;
  default_validity_days: number;
  vat_percent: number;
  created_at: string;
}

export const CATEGORY_LABELS: Record<CategoryType, string> = {
  labor: 'Arbeid',
  material: 'Materialer',
  consumable: 'Forbruksmateriell',
  transport: 'Transport/Rigg',
  ndt: 'NDT-tjenester'
};

export const NDT_METHODS = ['RT', 'UT', 'MT', 'PT', 'VT'] as const;
export const NDT_LEVELS = ['Level I', 'Level II', 'Level III'] as const;

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Utkast',
  sent: 'Sendt',
  accepted: 'Akseptert',
  rejected: 'Avslått'
};
