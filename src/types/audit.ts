/**
 * Stock Audit Type Definitions
 * Used for F07 - Stock Audit feature
 */

export type AuditStatus = 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'DONE';
export type AuditScopeType = 'FULL_STORE' | 'CATEGORY' | 'SHELF';
export type AuditType = 'NEW_LOTS' | 'RE_AUDIT' | 'CATEGORY_AUDIT';
export type AuditItemStatus = 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'APPROVED';

export interface StockAudit {
  id: string;
  auditCode: string;
  scopeType: AuditScopeType;
  auditType?: AuditType;
  status: AuditStatus;
  isLockedForAudit: boolean;
  countStartAt: string | Date;
  completedAt?: string | Date | null;
  approvedBy?: string | null;
  createdBy?: UserRef | null;
  itemCount: number;
  businessId?: string;
  note?: string;
}

/** What the employee counts on an item: a lot already in the system, or a lot that does not exist yet. */
export type LotMode = 'EXISTING' | 'NEW';

export interface StockAuditItem {
  id: string;
  auditId: string;
  variantId: string;
  sku: string;
  productName: string;
  imageUrl?: string | null;
  attributeText: string;
  /** Set when the lot already exists. Empty for a new lot that is created when the audit is applied. */
  lotId?: string | null;
  /** Autofilled from the existing lot, or typed by the employee for a new lot. */
  lotNumber?: string | null;
  expirationDate?: string | Date | null;
  newLotManufacturingDate?: string | Date | null;
  /** Task type set by the owner. The employee cannot switch between the two. */
  lotMode: LotMode;
  /** True when the owner assigned this item as a new lot. */
  isNewLot?: boolean;
  snapshotQty: number;
  countedQty: number;
  diffQty: number;
  discrepancyReason?: string | null;
  itemStatus: AuditItemStatus;
  assignedTo?: UserRef | null;
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
}

/** A variant, as returned by GET /inventory/variants?search= */
export interface VariantOption {
  id: string;
  sku: string;
  productName: string;
  attributeText: string;
  onHand: number;
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
/** One row created by the owner: an employee, a variant and an optional lot. */
export interface AuditItemAssignment {
  assignedToUserId: string;
  variantId: string;
  lotId?: string | null;
}

export interface CreateAuditRequest {
  auditCode: string;
  auditType: AuditType;
  note?: string;
  /** Optional. Items are normally added from the audit detail page after the audit is created. */
  items?: AuditItemAssignment[];
}

export interface CreateAuditItemRequest {
  variantId: string;
  lotId?: string | null;
  countedQty: number;
}

export interface UpdateAuditItemRequest {
  countedQty?: number;
  discrepancyReason?: string | null;
  /** Existing lot: number is autofilled by the server. */
  lotId?: string | null;
  /** Lot that does not exist yet: typed by the employee. */
  newLotNumber?: string | null;
  /**
   * Lot dates typed by the employee. For a new lot they are the lot's dates. For an existing lot they are a
   * correction of a wrong date, applied to the lot when the owner applies the audit.
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
