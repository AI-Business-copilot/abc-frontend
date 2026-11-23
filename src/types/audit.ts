/**
 * Stock Audit Type Definitions
 * Used for F07 - Stock Audit feature
 */

/**
 * The lifecycle of an audit.
 *   DRAFT         - the owner is still preparing it; nothing is locked and it can be deleted
 *   IN_PROGRESS   - the counting is running; the SKUs are locked and it can only be cancelled
 *   PENDING_APPROVAL - waiting for the owner
 *   DONE          - applied to the stock
 *   CANCELLED     - the owner stopped it; the SKUs are free again
 */
export type AuditStatus = 'DRAFT' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'DONE' | 'CANCELLED';
export type AuditScopeType = 'FULL_STORE' | 'CATEGORY' | 'SHELF';
export type AuditItemStatus = 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'APPROVED';

/**
 * How the two counters of a row compare.
 *   SINGLE      - only one employee is assigned, so there is nothing to compare
 *   NOT_STARTED - two employees are assigned but nobody has sent a count yet
 *   PENDING     - two employees are assigned but at least one has not submitted yet
 *   AGREED      - both submitted and their numbers match
 *   CONFLICT    - both submitted and their numbers differ; the owner decides
 */
export type CountAgreement = 'SINGLE' | 'NOT_STARTED' | 'PENDING' | 'AGREED' | 'CONFLICT';

/** The limits the server enforces on the evidence photos of one count. */
export const MAX_AUDIT_IMAGES = 10;
export const MAX_AUDIT_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_AUDIT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** An evidence photo of the broken goods one counter found during their count. */
export interface AuditItemCountImage {
  id: string;
  countId: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: string | Date;
  /**
   * Short-lived signed link (5 minutes). Absent when storage could not sign it; the client
   * refreshes the links through GET /inventory/audits/:id/items/:itemId/counts/:countId/images.
   */
  url?: string | null;
}

/** One employee's own count of a row. */
export interface AuditItemCount {
  id: string;
  counterUserId: string;
  counter?: UserRef | null;
  countedQty: number;
  countedDamagedQty: number;
  discrepancyReason?: string | null;
  newLotExpirationDate?: string | Date | null;
  newLotManufacturingDate?: string | Date | null;
  submittedAt?: string | Date | null;
  /** The photos this counter took of the broken goods. */
  images?: AuditItemCountImage[];
}

/** One counter's own reason and broken goods, so the owner sees both without the row's fields. */
export interface AuditCounterDetail {
  counterUserId: string;
  counter?: UserRef | null;
  discrepancyReason?: string | null;
  countedDamagedQty: number;
}

/**
 * What the owner decided about a row, and what had been counted at that moment.
 *   APPROVED - the owner accepted the row
 *   REJECTED - the owner sent it back with a reason
 *   RECOUNT  - the two counters disagreed, so the owner sent it back for another count
 */
export type AuditHistoryAction = 'APPROVED' | 'REJECTED' | 'RECOUNT';

/** One counter's number at the moment of a history record. */
export interface AuditItemHistoryCount {
  id: string;
  counterUserId: string;
  counter?: UserRef | null;
  countedQty: number;
  countedDamagedQty: number;
  discrepancyReason?: string | null;
  submittedAt?: string | Date | null;
}

/**
 * One record of a row. The numbers are a copy of that moment, so the record does not change
 * when the live row does.
 */
export interface AuditItemHistory {
  id: string;
  /** The nth time this row was recorded. */
  revision: number;
  action: AuditHistoryAction;
  /** Why the owner sent the row back, when they did. */
  reason?: string | null;
  createdAt: string | Date;
  snapshotQty: number;
  countedQty: number;
  countedDamagedQty: number;
  discrepancyReason?: string | null;
  actor?: UserRef | null;
  /** What each counter had found at that moment. */
  counts?: AuditItemHistoryCount[];
  /** The evidence photos filed under this record. */
  images?: AuditItemCountImage[];
}

export interface StockAudit {
  id: string;
  auditCode: string;
  scopeType: AuditScopeType;
  status: AuditStatus;
  isLockedForAudit: boolean;
  /** Null while the audit is still a draft: the counting has not started. */
  countStartAt?: string | Date | null;
  completedAt?: string | Date | null;
  approvedBy?: string | null;
  createdBy?: UserRef | null;
  itemCount: number;
  businessId?: string;
  note?: string;
}

export interface StockAuditItem {
  id: string;
  auditId: string;
  variantId: string;
  sku: string;
  productName: string;
  imageUrl?: string | null;
  attributeText: string;
  /** Set when the lot already exists. */
  lotId?: string | null;
  /**
   * The lot item (one SKU inside a lot). This is the id the count and update endpoints accept;
   * `lotId` is only the batch header and cannot be sent back.
   */
  lotItemId?: string | null;
  /** Autofilled from the existing lot. */
  lotNumber?: string | null;
  expirationDate?: string | Date | null;
  newLotManufacturingDate?: string | Date | null;
  snapshotQty: number;
  /** The usable quantity the employee counted. */
  countedQty: number;
  /** The broken goods the employee counted. The total is derived: countedQty + countedDamagedQty. */
  countedDamagedQty: number;
  diffQty: number;
  discrepancyReason?: string | null;
  itemStatus: AuditItemStatus;
  assignedTo?: UserRef | null;
  /** The second employee assigned to the row. Every row is counted by two people. */
  secondCounter?: UserRef | null;
  secondCounterUserId: string | null;
  /** SINGLE / PENDING / AGREED / CONFLICT. */
  countAgreement?: CountAgreement;
  /**
   * The counters of the row. The owner receives every counter so they can compare the numbers;
   * a staff member only ever receives their own.
   */
  counts?: AuditItemCount[];
  /**
   * The reason and broken goods of every counter. The row's own fields belong to the employee the
   * row was assigned to, so this list carries the reason of every counter.
   */
  counterDetails?: AuditCounterDetail[];
  createdBy?: UserRef | null;
  submittedBy?: UserRef | null;
  submittedAt?: string | Date | null;
  approvedBy?: UserRef | null;
  approvedAt?: string | Date | null;
  /** Why the owner sent the item back for a recount. Cleared when the employee submits again. */
  rejectionReason?: string | null;
  rejectedBy?: UserRef | null;
  rejectedAt?: string | Date | null;
  /** Manufacturing date shown for the item (the employee's value if they corrected it). */
  manufacturingDate?: string | Date | null;
  /** What the system currently has on the existing lot. Differs from `expirationDate` after a correction. */
  lotExpirationDate?: string | Date | null;
  lotManufacturingDate?: string | Date | null;
  /** True when the employee changed an existing lot's dates. The lot is updated when the audit is applied. */
  datesCorrected?: boolean;
}

/** Result of approving a single item. `auditAutoApplied` is true when it was the last item to approve. */
export interface ApproveItemResult {
  id: string;
  itemStatus: AuditItemStatus;
  approvedAt?: string | Date | null;
  auditAutoApplied: boolean;
}

/** A lot of a variant, as returned by GET /inventory/lots?variantId= */
export interface VariantLot {
  id: string;
  lotNumber: string;
  manufacturingDate?: string | Date | null;
  expirationDate: string | Date;
  onHand: number;
  /**
   * The lot has a scrap order that is still open (waiting for the Owner, or rejected),
   * so it cannot enter an audit. An approved or closed order does not block it.
   */
  hasOpenScrapOrder?: boolean;
  scrapOrder?: { id: string; scrapCode: string; status: string } | null;
  /** The lot was already scrapped, so it has no stock left to count. */
  isScrapped?: boolean;
}

/** A product (template) the owner picks first in the row editor. */
export interface AuditProductOption {
  id: string;
  name: string;
  imageUrl: string | null;
  /** How many active SKUs the product has. */
  skuCount: number;
  /** False when the product does not track lots, so a re-audit cannot pick a lot for it. */
  hasLotTracking: boolean;
}

/** A variant, as returned by GET /inventory/variants?search= */
export interface VariantOption {
  id: string;
  sku: string;
  productName: string;
  attributeText: string;
  onHand: number;
  /** Product image, so the owner can recognise the product while picking a SKU. */
  imageUrl?: string | null;
  /** The product this SKU belongs to. */
  productId?: string;
}

export interface UserRef {
  id: string;
  name: string;
  email?: string;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedList<T> {
  items: T[];
  pagination: PaginationInfo;
}

// Request/Response types
/** One row created by the owner: an employee, a variant and a lot item. */
export interface AuditItemAssignment {
  assignedToUserId: string;
  /**
   * The second employee for the same row. Required: every row is counted by two people, they
   * count independently and neither sees the other's number; the owner resolves it when they
   * disagree.
   */
  secondCounterUserId: string;
  variantId: string;
  /** Lot item (product_lot_items.id). Every row counts a lot that is already in the system. */
  lotItemId: string;
}

export interface CreateAuditRequest {
  /** Generated by the server (AUDIT_<year>_<sequence>) unless an explicit code is sent. */
  auditCode?: string;
  note?: string;
  /** Optional. Items are normally added from the audit detail page after the audit is created. */
  items?: AuditItemAssignment[];
}

export interface CreateAuditItemRequest {
  variantId: string;
  lotItemId?: string | null;
  countedQty: number;
}

export interface UpdateAuditItemRequest {
  /** The usable quantity the employee counted. */
  countedQty?: number;
  /** The broken goods the employee counted. The total is derived, so it is never sent. */
  countedDamagedQty?: number;
  discrepancyReason?: string | null;
  /**
   * Existing lot item: number is autofilled by the server. The row keeps the lot the owner assigned,
   * so this cannot point at a different lot.
   */
  lotItemId?: string | null;
  /**
   * Lot dates typed by the employee. They are a correction of a wrong date, applied to the lot when
   * the owner applies the audit.
   */
  newLotExpirationDate?: string | null;
  newLotManufacturingDate?: string | null;
}

// UI Helper types
export interface AuditFilter {
  status?: AuditStatus;
  page?: number;
  pageSize?: number;
}

export interface AuditStats {
  totalAudits: number;
  inProgress: number;
  pendingApproval: number;
  done: number;
}

export interface AuditItemWithActions extends StockAuditItem {
  canEdit: boolean;
  canSubmit: boolean;
  canApprove: boolean;
  discrepancyRequired: boolean;
}
