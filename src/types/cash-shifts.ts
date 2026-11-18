export type CashTransactionType = "IN" | "OUT";

export interface CashTransaction {
  id: string;
  transactionType: CashTransactionType;
  category: string;
  amount: string;
  notes: string | null;
  recipientOrPayer?: string | null;
  refDocType?: string | null;
  refDocId?: string | null;
  createdAt: string | null;
  createdByUser: { id: string; fullName: string };
}

export interface CashShiftPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CashTransactionPage {
  items: CashTransaction[];
  pagination: CashShiftPagination;
}

export interface CashShiftHandoff {
  id: string;
  handedOverCash?: string;
  receivedCash?: string;
  differenceCash?: string;
  isMatched?: boolean;
  status: "PENDING_REVIEW" | "NEEDS_EXPLANATION" | "APPROVED";
  explanation?: string | null;
  reviewerNote?: string | null;
  previousShift?: {
    id: string;
    closedAt: string | null;
    user: { fullName: string };
  };
}

export interface CashShiftRecord {
  id: string;
  userId: string;
  openedAt: string | null;
  closedAt: string | null;
  openingCash: string;
  expectedCash?: string | null;
  actualCash: string | null;
  differenceCash?: string | null;
  reconciliationStatus: "INCOMPLETE_DATA" | "RECONCILED";
  shiftNotes: string | null;
  status: "OPEN" | "CLOSED";
  closeReviews?: CashShiftCloseReview[];
}

export interface CashShift extends CashShiftRecord {
  user: { id: string; fullName: string };
  cashTransactions?: CashTransaction[];
  incomingHandoff?: CashShiftHandoff | null;
  systemExpectedCash?: string;
  cashDataComplete?: boolean;
  untrackedCashEventCount?: number;
}

export interface CashShiftCloseReview {
  id: string;
  revision: number;
  expectedCash?: string;
  actualCash: string;
  differenceCash?: string;
  isMatched: boolean;
  explanation: string | null;
  status: "PENDING_REVIEW" | "NEEDS_EXPLANATION" | "APPROVED";
  submittedAt: string;
  submittedByUser?: { id: string; fullName: string };
  reviewerNote?: string | null;
  isDataComplete?: boolean;
  shift?: {
    id: string;
    openedAt: string | null;
    closedAt: string | null;
    userId: string;
    reconciliationStatus: "INCOMPLETE_DATA" | "RECONCILED";
  };
}

export interface CashShiftHandoffReview {
  id: string;
  revision: number;
  explanation: string;
  status: "PENDING_REVIEW" | "NEEDS_EXPLANATION" | "APPROVED";
  submittedAt: string;
  submittedByUser: { id: string; fullName: string };
  handoff: {
    id: string;
    handedOverCash: string;
    receivedCash: string;
    differenceCash: string;
    previousShiftId: string;
    nextShiftId: string;
    previousShift: { user: { fullName: string } };
    nextShift: { user: { fullName: string } };
  };
}

export interface CashShiftSummary {
  currentShift: CashShift | null;
  shifts: CashShift[];
  pagination: CashShiftPagination;
}

export interface OpenCashShiftResult {
  shift: CashShiftRecord;
  handoff: CashShiftHandoff | null;
  handoffMatched: boolean;
}

export interface CloseCashShiftResult {
  shift: CashShiftRecord;
  review: CashShiftCloseReview;
}

export interface CashShiftReviewQueue {
  closeReviews: CashShiftCloseReview[];
  handoffs: CashShiftHandoffReview[];
}
