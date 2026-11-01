// Types for the F08 lot tracking and scrap management endpoints.
// Dates arrive as ISO strings and Prisma Decimal values arrive as strings.

export type LotStatus = "HEALTHY" | "WARNING" | "UNUSABLE" | "QUARANTINED" | "SCRAPPED";
export type ScrapStatus = "PENDING" | "COMPLETED" | "REJECTED" | "CANCELLED";
export type ScrapSource = "DAMAGED_STOCK" | "SELLABLE_STOCK";

export const REJECTION_REASON_CODES = [
  "WRONG_QUANTITY",
  "PHOTO_UNCLEAR",
  "NOT_REMOVED_FROM_SHELF",
  "OTHER",
] as const;
export type RejectionReasonCode = (typeof REJECTION_REASON_CODES)[number];

export const MAX_SCRAP_IMAGES = 10;
export const MAX_SCRAP_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_SCRAP_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface LotVariant {
  id: string;
  sku: string;
  template: { name: string };
}

export interface ExpiringLot {
  id: string;
  variantId: string;
  lotNumber: string;
  expirationDate: string;
  dbStatus: string;
  calculatedStatus: string;
  effectiveStatus: LotStatus;
  daysUntilExpiry: number;
  quarantineQty: number | null;
  quarantinedAt: string | null;
  variant: LotVariant;
  inventoryBalances: { quantityOnHand: number; damagedQuantity: number }[];
}

export interface ExpiringLotsSummary {
  healthy: number;
  warning: number;
  unusable: number;
  quarantined: number;
  scrapped: number;
  total: number;
}

export interface ExpiringLotsResponse {
  lots: ExpiringLot[];
  total: number;
  summary: ExpiringLotsSummary;
}

export interface ScrapUser {
  id: string;
  fullName: string;
  email: string;
}

export interface ScrapOrder {
  id: string;
  scrapCode: string;
  businessId: string;
  variantId: string;
  lotId: string | null;
  scrapQty: number;
  unitCost: string;
  scrapSource: ScrapSource;
  scrapReason: string;
  status: ScrapStatus;
  totalLossValue: string | null;
  createdBy: string;
  createdAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReasonCode: RejectionReasonCode | null;
  rejectionNote: string | null;
  variant: { id: string; sku: string; costPrice: string; template: { name: string } };
  lot: {
    id: string;
    lotNumber: string;
    expirationDate: string;
    status: LotStatus;
    quarantineQty: number | null;
  } | null;
  createdByUser: ScrapUser | null;
  approvedByUser: ScrapUser | null;
  rejectedByUser: ScrapUser | null;
}

export interface ScrapOrderListItem extends ScrapOrder {
  _count: { images: number };
}

export interface ScrapOrdersResponse {
  orders: ScrapOrderListItem[];
  total: number;
}

export interface ScrapImage {
  id: string;
  scrapOrderId: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: string;
  updatedAt: string;
  /** Signed link that expires after 5 minutes. Null when storage could not sign it. */
  url: string | null;
}

export interface ScrapOrderDetail extends ScrapOrder {
  images: ScrapImage[];
}

export interface ScrapStatistics {
  pendingCount: number;
  completedCount: number;
  rejectedCount: number;
  totalLossValue: number;
  bySource: { DAMAGED_STOCK: number; SELLABLE_STOCK: number };
}

export interface ApproveScrapResult {
  scrapOrder: ScrapOrder;
  inventoryReduced: number;
  lossAmount: number;
  lotScrapped: boolean;
  ledgerCreated: boolean;
}
