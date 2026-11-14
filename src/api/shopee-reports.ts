import { apiRequest } from "@/services/api.service";

export type ShopeeReconciliation = {
  summaryField: string;
  incomeField: string;
  summaryAmount: number;
  incomeAmount: number;
  difference: number;
  matches: boolean;
};

export type ShopeeUnmappedField = { sourceSheet: string; header: string; occurrences: number };

export type ShopeePreview = {
  platform: "SHOPEE";
  mappingVersion: number;
  alreadyImported: boolean;
  importedAt: string | null;
  reportFrom: string | null;
  reportTo: string | null;
  sourceRowCount: number;
  uniqueRowCount: number;
  counts: Record<"ORDER" | "SKU" | "ADJUSTMENT" | "SERVICE_FEE" | "SHIPPING_DISCREPANCY", number>;
  financeTotals: Record<string, number>;
  summaryFinancialData: Record<string, number>;
  reconciliations: ShopeeReconciliation[];
  unmappedFields: ShopeeUnmappedField[];
  notes: string[];
};

export type ShopeeImportBatch = {
  id: string;
  reportFrom: string | null;
  reportTo: string | null;
  sourceRowCount: number;
  importedRowCount: number;
  currentMappingVersion?: number;
  summary: {
    mappingVersion?: number;
    counts?: Record<string, number>;
    uniqueRowCount?: number;
    financeTotals?: Record<string, number>;
    summaryFinancialData?: Record<string, number>;
    reconciliations?: ShopeeReconciliation[];
    unmappedFields?: ShopeeUnmappedField[];
  } | null;
  createdAt: string;
};

export type ShopeeFinancialRecords = {
  range: { from: string; to: string; dayCount: number };
  financialRecords: Array<{
    id: string;
    recordType: string;
    externalOrderId: string | null;
    externalProductId: string | null;
    productName: string | null;
    transactionDate: string | null;
    settlementDate: string | null;
    financialData: Record<string, number | string> | null;
    unmappedFinancialData: Record<string, number> | null;
    sourceSheet: string;
    sourceRow: number;
    batch: {
      id: string;
      reportFrom: string | null;
      reportTo: string | null;
      mappingVersion: number | null;
    };
  }>;
  recordLimit: number;
  recordsTruncated: boolean;
  currentMappingVersion: number;
  quarantinedFinancialRecords: number;
  batches: Array<Pick<ShopeeImportBatch, "id" | "reportFrom" | "reportTo" | "importedRowCount" | "createdAt">>;
  quantityDataAvailable: boolean;
  notes: string[];
};

const request = <T>(path: string, init?: RequestInit) => apiRequest<T>(`/online-reports/shopee${path}`, init);

function workbookForm(file: File) {
  const form = new FormData();
  form.append("file", file);
  return form;
}

export const shopeeReportsApi = {
  preview: (file: File) => request<ShopeePreview>("/preview", { method: "POST", body: workbookForm(file) }),
  import: (file: File) => request<ShopeeImportBatch & { skippedDuplicateRows: number }>("/import", { method: "POST", body: workbookForm(file) }),
  listImports: () => request<ShopeeImportBatch[]>("/imports"),
  records: (from: string, to: string) => request<ShopeeFinancialRecords>(`/records?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
};
