// Types for the F08 lot tracking and scrap management endpoints.
// Dates arrive as ISO strings and Prisma Decimal values arrive as strings.

import type { ShelfCellLocation } from "@/types/shelf";

export type LotStatus = "HEALTHY" | "WARNING" | "UNUSABLE" | "QUARANTINED" | "SCRAPPED";
export type ScrapStatus = "PENDING" | "COMPLETED" | "REJECTED" | "CANCELLED";
export type ScrapSource = "DAMAGED_STOCK" | "SELLABLE_STOCK";

/** Vietnamese labels for the scrap order statuses, so the raw code never reaches the user. */
export const scrapStatusLabel: Record<ScrapStatus, string> = {
  PENDING: "Chờ duyệt",
  COMPLETED: "Đã duyệt",
  REJECTED: "Bị từ chối",
  CANCELLED: "Đã hủy bỏ",
};

/** Safe label for a status coming from the API, which may be unknown to this build. */
export function scrapStatusText(status: string | null | undefined): string {
  if (!status) return "—";
  return scrapStatusLabel[status as ScrapStatus] ?? status;
}

/** Vietnamese labels for the lot statuses, so the raw code never reaches the user. */
export const lotStatusLabel: Record<LotStatus, string> = {
  HEALTHY: "Bình thường",
  WARNING: "Sắp hết hạn",
  UNUSABLE: "Không dùng được",
  QUARANTINED: "Đang cách ly",
  SCRAPPED: "Đã hủy",
};

/**
 * Safe label for a lot status that may be unknown to this build, or missing when the order is
 * for a product that has no lot item.
 */
export function lotStatusText(status: string | null | undefined): string {
  if (!status || status === "UNRECORDED") return "Chưa ghi nhận";
  return lotStatusLabel[status as LotStatus] ?? status;
}

/**
 * True when the newest scrap order of a lot still blocks a new one. Only a PENDING order does:
 * a rejected or cancelled order is settled, so the lot stays quarantined and any staff member
 * can file a fresh order. The server sends `scrapOrderBlocksNew`; fall back to the status when
 * the field is missing.
 */
export function scrapOrderBlocksNew(
  lot: Pick<ExpiringLot, "scrapOrder" | "scrapOrderBlocksNew">,
): boolean {
  if (typeof lot.scrapOrderBlocksNew === "boolean") return lot.scrapOrderBlocksNew;
  return lot.scrapOrder?.status === "PENDING";
}

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
  template: { id: string; name: string; imageUrl: string | null };
}

/**
 * The quarantine state of a product that has no lot item. The quantity pulled off the shelf is
 * recorded on the variant, the same way the lot flow records it on the lot item, so the goods
 * can then be scrapped.
 */
export interface VariantQuarantine {
  id: string;
  variantId: string;
  sku: string;
  productName: string;
  /** Units pulled off the shelf. The scrap order cannot exceed it. */
  quarantineQty: number;
  quarantinedAt: string;
  quarantinedBy: string;
  quarantineNote: string | null;
}

export interface ExpiringLot {
  /** Lot item id: one SKU inside a lot. Scrap orders and quarantine act on this. */
  id: string;
  /** Batch (product_lots) id. The lot number is shared by every SKU in the batch. */
  lotId: string;
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
  /** Where the lot physically sits, or null when it has no location yet. */
  shelfCell?: ShelfCellLocation | null;
  /** Whole units still sellable in this lot item. */
  onHand: number;
  /** Units already marked damaged. */
  damaged: number;
  /**
   * The scrap order already raised for this lot item, in any status. It is the audit trail and
   * the link the staff need, so it always points at the newest order.
   */
  scrapOrder: { id: string; scrapCode: string; status: ScrapStatus } | null;
  /**
   * True when the newest scrap order still blocks a new one. Only a PENDING order does: a
   * rejected or cancelled order is settled, so any staff member can file a fresh order.
   */
  scrapOrderBlocksNew?: boolean;
}

/** One batch (product_lots row) with only the variant items that matched the filter. */
export interface LotBatch {
  id: string;
  lotNumber: string;
  items: ExpiringLot[];
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

export interface ExpiringBatchesResponse {
  lots: LotBatch[];
  total: number;
  summary: ExpiringLotsSummary;
}

/** One SKU of a product, with the lot items it holds. */
export interface ProductSkuLots {
  id: string;
  sku: string;
  lots: ExpiringLot[];
}

/** One product, with its SKUs and their lots. The tree reads product > SKU > lot. */
export interface ProductLotGroup {
  id: string;
  name: string;
  imageUrl: string | null;
  skus: ProductSkuLots[];
}

export interface ExpiringProductsResponse {
  lots: ProductLotGroup[];
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
  /** The lot item the scrap is taken from (product_lot_items.id). */
  lotItemId: string | null;
  scrapQty: number;
  unitCost: string;
  scrapSource: ScrapSource;
  /**
   * The plain-text reason of the loss. The server writes it from the cause code, so it always
   * matches the cause; staff never state it themselves.
   */
  scrapReason: string;
  status: ScrapStatus;
  totalLossValue: string | null;
  createdBy: string;
  createdAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReasonCode: RejectionReasonCode | null;
  rejectionNote: string | null;
  cancelledAt: string | null;
  cancelledNote: string | null;
  /** The cause of the loss, as recorded in the disposal dossier. */
  causeCode: ScrapCauseCode | null;
  /** How the goods are destroyed, as recorded in the disposal dossier. */
  disposalMethod: DisposalMethod | null;
  /** Where the goods are destroyed. Required by the backend when the method is CONTRACTOR. */
  disposalLocation: string | null;
  /**
   * The members of the disposal council, separated by commas. The server writes them when the
   * Owner approves the order: the approver leads the council and the creator writes the minutes.
   */
  witnessNames: string | null;
  variant: { id: string; sku: string; costPrice: string; template: { name: string } };
  lotItem: {
    id: string;
    expirationDate: string;
    status: LotStatus;
    quarantineQty: number | null;
    lot: { id: string; lotNumber: string };
  } | null;
  createdByUser: ScrapUser | null;
  approvedByUser: ScrapUser | null;
  rejectedByUser: ScrapUser | null;
  cancelledByUser: ScrapUser | null;
  business?: { industryType: string } | null;
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
  cancelledCount: number;
  totalLossValue: number;
  bySource: { DAMAGED_STOCK: number; SELLABLE_STOCK: number };
}

/** The cause of the loss as stated in the disposal dossier. */
export const SCRAP_CAUSE_CODES = ["EXPIRED", "DAMAGED_TRANSIT", "QUALITY_FAIL", "OLD_STOCK"] as const;
export type ScrapCauseCode = (typeof SCRAP_CAUSE_CODES)[number];

/** How the goods are destroyed. */
export const DISPOSAL_METHODS = ["INCINERATION", "BURIAL", "CHEMICAL", "CONTRACTOR"] as const;
export type DisposalMethod = (typeof DISPOSAL_METHODS)[number];

export const scrapCauseCodeLabel: Record<ScrapCauseCode, string> = {
  EXPIRED: "Hết hạn sử dụng",
  DAMAGED_TRANSIT: "Hư hỏng trong vận chuyển",
  QUALITY_FAIL: "Không đạt chất lượng",
  OLD_STOCK: "Tồn kho lâu ngày",
};

export const disposalMethodLabel: Record<DisposalMethod, string> = {
  INCINERATION: "Đốt cháy",
  BURIAL: "Chôn lập",
  CHEMICAL: "Hóa chất",
  CONTRACTOR: "Thuê đơn vị tiêu hủy",
};

/** One row of the bảng kê xuất nhập tồn the tax dossier must carry. */
export interface DossierLedgerLine {
  date: string;
  transactionType: string;
  quantity: number;
  unitCost: number;
  totalValue: number;
  note: string;
}

/** The dossier as the backend assembles it. */
export interface DisposalDossierReport {
  scrapCode: string;
  businessName: string;
  businessAddress: string | null;
  step1_council: { leader: string; accountant: string | null; createdDate: string | null };
  step2_inspection: {
    productName: string;
    sku: string;
    lotNumber: string | null;
    expiryDate: string | null;
    quantity: number;
    unitCost: number;
    totalValue: number;
    /** The condition of the goods (the lot status). The cause of the loss is stated in step 3. */
    condition: string;
    createdDate: string | null;
  };
  step3_decision: {
    causeCode: ScrapCauseCode | null;
    disposalMethod: DisposalMethod | null;
    disposalLocation: string | null;
    approvedBy: string | null;
    approvedDate: string | null;
    witnesses: string[];
  };
  step4_execution: { status: string };
  step5_disposal: { actualDate: string | null; confirmedBy: string | null };
  step6_archive_bangke: { bangKeXuatNhapTon: DossierLedgerLine[] };
  tax_fields: {
    totalLossValue: number;
    compensatedAmount: number;
    deductibleLoss: number;
    taxLegislation: string;
  };
}

export interface ApproveScrapResult {
  scrapOrder: ScrapOrder;
  inventoryReduced: number;
  lossAmount: number;
  lotScrapped: boolean;
  ledgerCreated: boolean;
}
