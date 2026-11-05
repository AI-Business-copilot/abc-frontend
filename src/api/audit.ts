import { supabase } from '../lib/supabase';

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BASE_URL = `${apiBaseUrl}/inventory/audits`;

import type {
  ApproveItemResult,
  AuditItemAssignment,
  CreateAuditRequest,
  StockAudit,
  StockAuditItem,
  UpdateAuditItemRequest,
  VariantLot,
  VariantOption,
} from '../types/audit';

export type {
  ApproveItemResult,
  AuditItemAssignment,
  CreateAuditRequest,
  StockAudit,
  StockAuditItem,
  VariantLot,
  VariantOption,
};

export type UpdateCountRequest = UpdateAuditItemRequest & { countedQty: number };

export interface AuditItemRequest {
  variantId: string;
  lotItemId?: string | null;
  countedQty: number;
}

// Response types
interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface ErrorResponse {
  message: string;
}

// Helper function to handle errors
function handleApiError(error: any): never {
  if (error.response) {
    const data = error.response.data as ErrorResponse;
    throw new Error(data.message || `API Error: ${error.response.status}`);
  }
  throw error;
}

// Get auth token
async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;

  if (!token) {
    throw new Error('Not authenticated');
  }

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// API Client functions
export interface BusinessMember {
  id: string;
  user: {
    id: string;
    email: string;
    fullName: string;
  };
  role: string;
  roleName: string;
  status: string;
  createdAt: string;
}

export const auditApi = {
  /**
   * Get business members (employees)
   */
  async getMembers(): Promise<{ members: BusinessMember[] }> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${apiBaseUrl}/businesses/members`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch members (${response.status})`);
      }

      return response.json();
    } catch (error) {
      handleApiError(error);
    }
  },

  /**
   * Create a new stock audit
   */
  async createAudit(payload: CreateAuditRequest): Promise<StockAudit> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${BASE_URL}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to create audit (${response.status})`);
      }

      return response.json();
    } catch (error) {
      handleApiError(error);
    }
  },

  /**
   * List audits with pagination and filtering
   */
  async listAudits(
    status?: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<PaginatedResponse<StockAudit>> {
    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());

      const response = await fetch(`${BASE_URL}?${params.toString()}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch audits (${response.status})`);
      }

      return response.json();
    } catch (error) {
      handleApiError(error);
    }
  },

  /**
   * Get audit details by ID
   */
  async getAuditDetails(auditId: string): Promise<StockAudit> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${BASE_URL}/${auditId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Audit not found');
        }
        throw new Error(`Failed to fetch audit (${response.status})`);
      }

      return response.json();
    } catch (error) {
      handleApiError(error);
    }
  },

  /**
   * Search active variants (SKU picker for the owner)
   */
  async searchVariants(search: string, limit: number = 20): Promise<{ items: VariantOption[] }> {
    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      params.append('limit', limit.toString());

      const response = await fetch(`${apiBaseUrl}/inventory/variants?${params.toString()}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to search variants (${response.status})`);
      }

      return response.json();
    } catch (error) {
      handleApiError(error);
    }
  },

  /**
   * Get the existing lots of a variant (number and expiry are autofilled from these)
   */
  async getLots(variantId: string): Promise<{ items: VariantLot[] }> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `${apiBaseUrl}/inventory/lots?variantId=${encodeURIComponent(variantId)}`,
        { method: 'GET', headers }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch lots (${response.status})`);
      }

      return response.json();
    } catch (error) {
      handleApiError(error);
    }
  },

  /**
   * Owner: add employee + variant + optional lot rows to an in-progress audit
   */
  async addItems(auditId: string, items: AuditItemAssignment[]): Promise<{ added: number }> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${BASE_URL}/${auditId}/items/assign`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ items }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to add items (${response.status})`);
      }

      return response.json();
    } catch (error) {
      handleApiError(error);
    }
  },

  /**
   * Owner: reassign an item to a different employee
   */
  async reassignItem(
    auditId: string,
    itemId: string,
    assignedToUserId: string
  ): Promise<StockAuditItem> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${BASE_URL}/${auditId}/items/${itemId}/assign`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ assignedToUserId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to reassign item (${response.status})`);
      }

      return response.json();
    } catch (error) {
      handleApiError(error);
    }
  },

  /**
   * Get paginated audit items. Pass mine=true to get only items assigned to the caller.
   */
  async getAuditItems(
    auditId: string,
    page: number = 1,
    pageSize: number = 20,
    mine: boolean = false
  ): Promise<PaginatedResponse<StockAuditItem>> {
    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (mine) params.append('mine', 'true');

      const response = await fetch(`${BASE_URL}/${auditId}/items?${params.toString()}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch audit items (${response.status})`);
      }

      return response.json();
    } catch (error) {
      handleApiError(error);
    }
  },

  /**
   * Get a single audit item
   */
  async getAuditItem(auditId: string, itemId: string): Promise<StockAuditItem> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${BASE_URL}/${auditId}/items/${itemId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Item not found');
        }
        throw new Error(`Failed to fetch item (${response.status})`);
      }

      return response.json();
    } catch (error) {
      handleApiError(error);
    }
  },

  /**
   * Record a new count for an item (create audit item)
   */
  async recordCount(auditId: string, payload: AuditItemRequest): Promise<StockAuditItem> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${BASE_URL}/${auditId}/items`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to record count (${response.status})`);
      }

      return response.json();
    } catch (error) {
      handleApiError(error);
    }
  },

  /**
   * Update count for an audit item (including discrepancy reason)
   */
  async updateCount(
    auditId: string,
    itemId: string,
    payload: UpdateCountRequest
  ): Promise<StockAuditItem> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${BASE_URL}/${auditId}/items/${itemId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to update count (${response.status})`);
      }

      return response.json();
    } catch (error) {
      handleApiError(error);
    }
  },

  /**
   * Submit audit item for approval (transitions to PENDING_APPROVAL)
   */
  async submitAuditItem(auditId: string, itemId: string): Promise<StockAuditItem> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${BASE_URL}/${auditId}/items/${itemId}/submit`, {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to submit item (${response.status})`);
      }

      return response.json();
    } catch (error) {
      handleApiError(error);
    }
  },

  /**
   * Owner: approve a submitted item. The audit is applied automatically when it was the last one.
   */
  async approveAuditItem(auditId: string, itemId: string): Promise<ApproveItemResult> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${BASE_URL}/${auditId}/items/${itemId}/approve`, {
        method: 'PATCH',
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to approve item (${response.status})`);
      }

      return response.json();
    } catch (error) {
      handleApiError(error);
    }
  },

  /**
   * Owner: reject a submitted item with a reason. It goes back to the employee for a recount.
   */
  async rejectAuditItem(auditId: string, itemId: string, reason: string): Promise<StockAuditItem> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${BASE_URL}/${auditId}/items/${itemId}/reject`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to reject item (${response.status})`);
      }

      return response.json();
    } catch (error) {
      handleApiError(error);
    }
  },
};
