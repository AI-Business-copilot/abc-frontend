import { supabase } from "@/lib/supabase";

const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export type ProductSku = {
  id: string;
  sku: string;
  barcode: string | null;
  basePrice: number;
  costPrice: number;
  stockQty: number;
};

export type ProductItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  unitOfMeasure: string;
  hasLotTracking: boolean;
  isActive: boolean;
  categoryId: string | null;
  categoryName: string | null;
  categoryPath: string | null;
  variantCount: number;
  stockQty: number;
  stockValue: number;
  retailValue: number;
  avgCost: number;
  avgPrice: number;
  skus: ProductSku[];
};

export type CategoryOption = {
  id: string;
  name: string;
  parentId: string | null;
  parentName: string | null;
  count: number;
};

export type ProductListResponse = {
  stats: {
    totalTemplates: number;
    totalVariants: number;
    totalCategories: number;
    level1Count: number;
    level2Count: number;
    activePercent: number;
    totalStockValue: number;
    grossMarginPercent: number;
    missingCategoryCount: number;
    topCategories: { id: string; name: string; count: number }[];
  };
  categories: CategoryOption[];
  items: ProductItem[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

export type ProductListQuery = {
  q?: string;
  categoryId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

async function getJson<T>(path: string): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(payload.message || `Yêu cầu thất bại (${response.status}).`);
  }

  return (await response.json()) as T;
}

export const productsListApi = {
  list: async (params: ProductListQuery) => {
    // businessId do backend lay tu phien dang nhap, khong gui tu client.
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        search.set(key, String(value));
      }
    });
    const data = await getJson<ProductListResponse>(`/products/list?${search.toString()}`);
    return { data };
  },
};
