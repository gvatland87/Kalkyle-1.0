// API URL - bruk miljøvariabel i produksjon, lokal proxy i utvikling
const API_BASE = import.meta.env.VITE_API_URL || '/api';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const url = API_BASE.includes('://')
      ? `${API_BASE}${endpoint}`  // Full URL (produksjon)
      : `${API_BASE}${endpoint}`; // Relativ URL (utvikling med proxy)

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Ukjent feil' }));
      throw new Error(error.error || `HTTP error ${response.status}`);
    }

    // Håndter PDF-respons
    if (response.headers.get('Content-Type')?.includes('application/pdf')) {
      return response.blob() as unknown as T;
    }

    return response.json();
  }

  // Auth
  async register(email: string, password: string, name: string, company?: string) {
    return this.request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, company }),
    });
  }

  async login(email: string, password: string) {
    return this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getMe() {
    return this.request<{ user: any }>('/auth/me');
  }

  async updateMe(data: { name?: string; company?: string; currentPassword?: string; newPassword?: string }) {
    return this.request<{ user: any }>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Categories
  async getCategories() {
    return this.request<{ categories: any[] }>('/categories');
  }

  async getCategoriesGrouped() {
    return this.request<{ categories: Record<string, any[]> }>('/categories/grouped');
  }

  async createCategory(name: string, type: string) {
    return this.request<{ category: any }>('/categories', {
      method: 'POST',
      body: JSON.stringify({ name, type }),
    });
  }

  async updateCategory(id: string, data: { name?: string; type?: string }) {
    return this.request<{ category: any }>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(id: string) {
    return this.request<{ message: string }>(`/categories/${id}`, {
      method: 'DELETE',
    });
  }

  // Cost Items
  async getCostItems(categoryId?: string, type?: string) {
    const params = new URLSearchParams();
    if (categoryId) params.append('categoryId', categoryId);
    if (type) params.append('type', type);
    const query = params.toString() ? `?${params}` : '';
    return this.request<{ items: any[] }>(`/cost-items${query}`);
  }

  async getCostItemsGrouped() {
    return this.request<{ items: Record<string, Record<string, any[]>> }>('/cost-items/grouped');
  }

  async getCostItem(id: string) {
    return this.request<{ item: any }>(`/cost-items/${id}`);
  }

  async createCostItem(data: {
    categoryId: string;
    name: string;
    description?: string;
    unit: string;
    unitPrice: number;
    ndtMethod?: string;
    ndtLevel?: string;
  }) {
    return this.request<{ item: any }>('/cost-items', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCostItem(id: string, data: Partial<{
    name: string;
    description: string;
    unit: string;
    unitPrice: number;
    ndtMethod: string;
    ndtLevel: string;
  }>) {
    return this.request<{ item: any }>(`/cost-items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCostItem(id: string) {
    return this.request<{ message: string }>(`/cost-items/${id}`, {
      method: 'DELETE',
    });
  }

  // Quotes
  async getQuotes(status?: string) {
    const query = status ? `?status=${status}` : '';
    return this.request<{ quotes: any[] }>(`/quotes${query}`);
  }

  async getQuote(id: string) {
    return this.request<{ quote: any; lines: any[] }>(`/quotes/${id}`);
  }

  async createQuote(data: {
    customerName: string;
    customerEmail?: string;
    customerAddress?: string;
    projectName: string;
    projectDescription?: string;
    reference?: string;
    validUntil?: string;
    markupPercent?: number;
    notes?: string;
    terms?: string;
  }) {
    return this.request<{ quote: any }>('/quotes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateQuote(id: string, data: Partial<{
    customerName: string;
    customerEmail: string;
    customerAddress: string;
    projectName: string;
    projectDescription: string;
    reference: string;
    validUntil: string;
    status: string;
    markupPercent: number;
    notes: string;
    terms: string;
  }>) {
    return this.request<{ quote: any }>(`/quotes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteQuote(id: string) {
    return this.request<{ message: string }>(`/quotes/${id}`, {
      method: 'DELETE',
    });
  }

  async getQuoteSummary(id: string) {
    return this.request<any>(`/quotes/${id}/summary`);
  }

  // Quote Lines
  async addQuoteLine(quoteId: string, data: {
    costItemId?: string;
    categoryType: string;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    lineMarkup?: number;
  }) {
    return this.request<{ line: any }>(`/quotes/${quoteId}/lines`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateQuoteLine(quoteId: string, lineId: string, data: Partial<{
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    lineMarkup: number;
    sortOrder: number;
  }>) {
    return this.request<{ line: any }>(`/quotes/${quoteId}/lines/${lineId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteQuoteLine(quoteId: string, lineId: string) {
    return this.request<{ message: string }>(`/quotes/${quoteId}/lines/${lineId}`, {
      method: 'DELETE',
    });
  }

  // Settings
  async getSettings() {
    return this.request<{ settings: any }>('/settings');
  }

  async updateSettings(data: Partial<{
    companyName: string;
    orgNumber: string;
    address: string;
    postalCode: string;
    city: string;
    phone: string;
    email: string;
    website: string;
    logoUrl: string;
    defaultTerms: string;
    defaultValidityDays: number;
    vatPercent: number;
  }>) {
    return this.request<{ settings: any }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // PDF
  async downloadQuotePdf(id: string, detailed: boolean = false) {
    const query = detailed ? '?detailed=true' : '';
    return this.request<Blob>(`/pdf/${id}${query}`);
  }
}

export const api = new ApiService();
