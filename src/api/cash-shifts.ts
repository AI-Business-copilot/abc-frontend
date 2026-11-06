import { apiRequest } from "@/services/api.service";
import type {
  CashShiftSummary,
  CashShiftReviewQueue,
  CloseCashShiftResult,
  CashTransactionPage,
  OpenCashShiftResult,
} from "@/types/cash-shifts";

const base = "/cash-shifts";

export const cashShiftsApi = {
  getSummary(query: { page: number; pageSize: number; search: string; status: string; sort: string }) {
    const params = new URLSearchParams({
      page: String(query.page),
      pageSize: String(query.pageSize),
      search: query.search,
      status: query.status,
      sort: query.sort,
    });
    return apiRequest<CashShiftSummary>(`${base}?${params.toString()}`);
  },

  getTransactions(
    shiftId: string,
    query: { page: number; pageSize: number; search: string; type: string; sort: string },
  ) {
    const params = new URLSearchParams({
      page: String(query.page),
      pageSize: String(query.pageSize),
      search: query.search,
      type: query.type,
      sort: query.sort,
    });
    return apiRequest<CashTransactionPage>(`${base}/${shiftId}/transactions?${params.toString()}`);
  },

  previewHandoff(body: { openingCash: number }) {
    return apiRequest<{
      hasPreviousShift: boolean;
      isMatched: boolean;
      requiresExplanation: boolean;
      handedOverCash?: string;
      receivedCash?: string;
      differenceCash?: string;
    }>(`${base}/handoffs/preview`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  openShift(body: { openingCash: number; handoffExplanation?: string }) {
    return apiRequest<OpenCashShiftResult>(base, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  recordTransaction(
    shiftId: string,
    body: {
      transactionType: "IN" | "OUT";
      category: string;
      amount: number;
      notes?: string;
    },
  ) {
    return apiRequest(`${base}/${shiftId}/transactions`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  previewClose(shiftId: string, body: { actualCash: number }) {
    return apiRequest<{ isMatched: boolean; requiresExplanation: boolean; isDataComplete: boolean }>(
      `${base}/${shiftId}/close/preview`,
      { method: "POST", body: JSON.stringify(body) },
    );
  },

  closeShift(shiftId: string, body: { actualCash: number; explanation?: string }) {
    return apiRequest<CloseCashShiftResult>(`${base}/${shiftId}/close`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  resubmitCloseExplanation(shiftId: string, body: { explanation: string; actualCash?: number }) {
    return apiRequest(`${base}/${shiftId}/close/explanation`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  resubmitHandoffExplanation(handoffId: string, explanation: string) {
    return apiRequest(`${base}/handoffs/${handoffId}/explanation`, {
      method: "POST",
      body: JSON.stringify({ explanation }),
    });
  },

  withdraw(shiftId: string, body: { amount: number; purpose: string; destination: string }) {
    return apiRequest(`${base}/${shiftId}/withdrawals`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  getReviewQueue() {
    return apiRequest<CashShiftReviewQueue>(`${base}/reviews`);
  },

  decideCloseReview(reviewId: string, body: { decision: "APPROVE" | "REQUEST_EXPLANATION"; reviewerNote?: string }) {
    return apiRequest(`${base}/reviews/${reviewId}/decision`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  decideHandoffReview(reviewId: string, body: { decision: "APPROVE" | "REQUEST_EXPLANATION"; reviewerNote?: string }) {
    return apiRequest(`${base}/handoff-reviews/${reviewId}/decision`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};
