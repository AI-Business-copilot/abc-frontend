import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CircleAlert,
  Clock3,
  Eye,
  History,
  LockKeyhole,
  Plus,
  ReceiptText,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import { cashShiftsApi } from "@/api/cash-shifts";
import { AppLayout } from "@/components/layout/app-layout";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import type { CashShift, CashShiftReviewQueue, CashShiftSummary, CashTransaction, CashTransactionPage } from "@/types/cash-shifts";

const incomingCategories = [
  { value: "OTHER_IN", label: "Thu tiền khác" },
];
const outgoingCategories = [
  { value: "CASH_EXPENSE", label: "Chi phí cửa hàng" },
  { value: "CUSTOMER_REFUND", label: "Hoàn tiền khách" },
  { value: "OTHER_OUT", label: "Chi tiền khác" },
];
const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 2,
});
const dateTime = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
});

function money(value: string | number | null | undefined) {
  return currency.format(Number(value ?? 0));
}

function formatCashInput(value: string) {
  const [rawInteger, rawFraction] = value.split(",");
  const integer = rawInteger.replace(/\D/g, "");
  const groupedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const fraction = rawFraction?.replace(/\D/g, "").slice(0, 2);
  return `${groupedInteger}${fraction === undefined ? "" : `,${fraction}`}`;
}

function formatStoredCashInput(value: string | number) {
  const [integer, fraction] = String(value).split(".");
  return formatCashInput(`${integer}${fraction && fraction !== "00" ? `,${fraction}` : ""}`);
}

function cashInputValue(value: string) {
  return Number(value.replace(/\./g, "").replace(",", "."));
}

function timestamp(value: string | null | undefined) {
  return value ? dateTime.format(new Date(value)) : "—";
}

function categoryLabel(value: string) {
  if (value === "SAFE_DROP") return "Rút tiền khỏi két";
  if (value === "POS_SALE" || value === "SALE_CASH") return "Thu bán hàng tiền mặt";
  if (value === "SUPPLIER_PAYMENT") return "Thanh toán nhà cung cấp";
  return [...incomingCategories, ...outgoingCategories].find((item) => item.value === value)?.label ?? value;
}

function reviewStatusLabel(status: string) {
  if (status === "PENDING_REVIEW") return "Chờ duyệt";
  if (status === "NEEDS_EXPLANATION") return "Cần giải trình";
  if (status === "APPROVED") return "Đã chấp nhận";
  return status;
}

function statusClass(status: string) {
  if (status === "APPROVED") return "bg-emerald-50 text-emerald-700";
  if (status === "NEEDS_EXPLANATION") return "bg-amber-50 text-amber-800";
  return "bg-emerald-50 text-emerald-800 border border-emerald-200";
}

function MovementForm({
  shift,
  saving,
  onRecord,
}: {
  shift: CashShift;
  saving: boolean;
  onRecord: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [type, setType] = useState<"IN" | "OUT">("IN");
  const categories = type === "IN" ? incomingCategories : outgoingCategories;

  return (
    <form className="space-y-4" onSubmit={onRecord}>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button className="w-full" onClick={() => setType("IN")} type="button" variant={type === "IN" ? "default" : "outline"}>
          <ArrowDownLeft size={16} /> Tiền vào
        </Button>
        <Button className="w-full" onClick={() => setType("OUT")} type="button" variant={type === "OUT" ? "default" : "outline"}>
          <ArrowUpRight size={16} /> Tiền ra
        </Button>
      </div>
      <input name="transactionType" type="hidden" value={type} />
      <div className="space-y-2">
        <Label htmlFor="cash-category">Danh mục</Label>
        <select className="flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-sm outline-none focus:border-[#0f4c3a] focus:ring-4 focus:ring-emerald-100" id="cash-category" name="category">
          {categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="cash-transaction-amount">Số tiền (VNĐ)</Label>
        <Input autoComplete="off" id="cash-transaction-amount" inputMode="decimal" maxLength={16} name="amount" onChange={(event) => { event.target.value = formatCashInput(event.target.value); }} placeholder="Ví dụ: 150.000" required type="text" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cash-transaction-notes">Ghi chú</Label>
        <Input id="cash-transaction-notes" maxLength={1000} name="notes" placeholder="Nội dung giao dịch (không bắt buộc)" />
      </div>
      <Button className="w-full" disabled={saving} type="submit"><Plus size={16} /> Ghi nhận giao dịch</Button>
      <p className="text-xs leading-relaxed text-slate-500">Giao dịch được ghi vào ca hiện tại và không thể sửa sau khi ca đã đóng.</p>
      <input name="shiftId" type="hidden" value={shift.id} />
    </form>
  );
}

export function CashShiftsPage() {
  const { profile } = useAuth();
  const { can } = usePermissions();
  const canRead = can("cash.shift.read");
  const canManage = can("cash.shift.manage");
  const canReconcile = can("cash.shift.reconcile");
  const canReview = can("cash.shift.review") && can("cash.shift.reconcile");
  const canWithdraw = can("cash.shift.withdraw");
  const [summary, setSummary] = useState<CashShiftSummary | null>(null);
  const [reviewQueue, setReviewQueue] = useState<CashShiftReviewQueue | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historySearchInput, setHistorySearchInput] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState("ALL");
  const [historySort, setHistorySort] = useState("newest");
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionSearchInput, setTransactionSearchInput] = useState("");
  const [transactionSearch, setTransactionSearch] = useState("");
  const [transactionType, setTransactionType] = useState("ALL");
  const [transactionSort, setTransactionSort] = useState("newest");
  const [transactionData, setTransactionData] = useState<CashTransactionPage | null>(null);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [transactionRefresh, setTransactionRefresh] = useState(0);
  const [selectedTransaction, setSelectedTransaction] = useState<CashTransaction | null>(null);
  const [openingCash, setOpeningCash] = useState("");
  const [openingExplanation, setOpeningExplanation] = useState("");
  const [openingPreview, setOpeningPreview] = useState<{ amount: string; hasPreviousShift: boolean; isMatched: boolean } | null>(null);
  const [actualCash, setActualCash] = useState("");
  const [closeExplanation, setCloseExplanation] = useState("");
  const [closePreview, setClosePreview] = useState<{ amount: string; isMatched: boolean; isDataComplete: boolean } | null>(null);
  const [resubmission, setResubmission] = useState<Record<string, { explanation: string; actualCash: string }>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [withdrawal, setWithdrawal] = useState({ amount: "", purpose: "", destination: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setHistorySearch(historySearchInput.trim());
      setHistoryPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [historySearchInput]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTransactionSearch(transactionSearchInput.trim());
      setTransactionPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [transactionSearchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextSummary, nextReviews] = await Promise.all([
        cashShiftsApi.getSummary({
          page: historyPage,
          pageSize: 10,
          search: historySearch,
          status: historyStatus,
          sort: historySort,
        }),
        canReview ? cashShiftsApi.getReviewQueue() : Promise.resolve(null),
      ]);
      setSummary(nextSummary);
      setReviewQueue(nextReviews);
      setTransactionRefresh((value) => value + 1);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải dữ liệu ca trực.");
    } finally {
      setLoading(false);
    }
  }, [canReview, historyPage, historySearch, historySort, historyStatus]);

  const currentShift = summary?.currentShift ?? null;
  const transactions = transactionData?.items ?? [];

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!currentShift) {
      setTransactionData(null);
      return;
    }
    let active = true;
    setTransactionLoading(true);
    cashShiftsApi.getTransactions(currentShift.id, {
      page: transactionPage,
      pageSize: 10,
      search: transactionSearch,
      type: transactionType,
      sort: transactionSort,
    }).then((result) => {
      if (active) setTransactionData(result);
    }).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : "Không thể tải giao dịch trong ca.");
    }).finally(() => {
      if (active) setTransactionLoading(false);
    });
    return () => { active = false; };
  }, [currentShift?.id, transactionPage, transactionRefresh, transactionSearch, transactionSort, transactionType]);

  const isResponsible = currentShift?.userId === profile?.user.id;
  const ownExplanationRequests = (summary?.shifts ?? []).flatMap((shift) =>
    shift.userId === profile?.user.id
      ? (shift.closeReviews ?? [])
        .filter((review) => review.status === "NEEDS_EXPLANATION")
        .map((review) => ({ shift, review }))
      : [],
  );
  const ownHandoffRequests = (summary?.shifts ?? []).flatMap((shift) =>
    shift.userId === profile?.user.id &&
    shift.incomingHandoff?.status === "NEEDS_EXPLANATION"
      ? [{ shift, handoff: shift.incomingHandoff }]
      : [],
  );

  async function submitOpenShift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!openingPreview || openingPreview.amount !== openingCash) {
      setError("Hãy kiểm tra đối chiếu tiền đầu ca trước khi mở ca.");
      return;
    }
    if (openingPreview.hasPreviousShift && !openingPreview.isMatched && !openingExplanation.trim()) {
      setError("Cần giải trình chênh lệch bàn giao trước khi mở ca.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await cashShiftsApi.openShift({
        openingCash: cashInputValue(openingCash),
        handoffExplanation: openingExplanation.trim() || undefined,
      });
      setSuccess(
        result.handoff
          ? result.handoffMatched
            ? "Đã mở ca. Tiền đầu ca khớp với số bàn giao từ ca trước."
            : "Đã mở ca để đảm bảo vận hành. Chênh lệch bàn giao đã được gửi chủ cửa hàng xem xét."
          : "Đã mở ca và ghi nhận số tiền đầu ca.",
      );
      setOpeningCash("");
      setOpeningExplanation("");
      setOpeningPreview(null);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Không thể mở ca.");
    } finally {
      setSaving(false);
    }
  }

  async function previewOpeningCash() {
    if (!openingCash || !Number.isFinite(cashInputValue(openingCash)) || cashInputValue(openingCash) < 0) {
      setError("Hãy nhập số tiền đầu ca hợp lệ.");
      return;
    }
    setSaving(true);
    setError(null);
    setOpeningPreview(null);
    try {
      const result = await cashShiftsApi.previewHandoff({ openingCash: cashInputValue(openingCash) });
      setOpeningPreview({
        amount: openingCash,
        hasPreviousShift: result.hasPreviousShift,
        isMatched: result.isMatched,
      });
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Không thể đối chiếu tiền bàn giao.");
    } finally {
      setSaving(false);
    }
  }

  async function submitTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentShift) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const transactionType = form.get("transactionType");
    if (transactionType !== "IN" && transactionType !== "OUT") {
      setError("Loại giao dịch không hợp lệ.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await cashShiftsApi.recordTransaction(currentShift.id, {
        transactionType,
        category: String(form.get("category")),
        amount: cashInputValue(String(form.get("amount") ?? "")),
        notes: String(form.get("notes") ?? "").trim() || undefined,
      });
      formElement.reset();
      setSuccess("Đã ghi nhận giao dịch tiền mặt.");
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Không thể ghi nhận giao dịch.");
    } finally {
      setSaving(false);
    }
  }

  async function previewCloseCount() {
    if (!currentShift || !isResponsible || actualCash === "") {
      setError("Hãy nhập số tiền đã kiểm đếm.");
      return;
    }
    setSaving(true);
    setError(null);
    setClosePreview(null);
    try {
      const result = await cashShiftsApi.previewClose(currentShift.id, { actualCash: cashInputValue(actualCash) });
      setClosePreview({ amount: actualCash, isMatched: result.isMatched, isDataComplete: result.isDataComplete });
      if (result.isMatched) setCloseExplanation("");
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Không thể kiểm tra kết quả kiểm đếm.");
    } finally {
      setSaving(false);
    }
  }

  async function submitCloseShift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentShift) return;
    if (!closePreview || closePreview.amount !== actualCash) {
      setError("Hãy kiểm tra số tiền kiểm đếm trước khi gửi yêu cầu kết thúc ca.");
      return;
    }
    if (!closePreview.isMatched && !closeExplanation.trim()) {
      setError("Cần giải trình chênh lệch trước khi gửi yêu cầu kết thúc ca.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await cashShiftsApi.closeShift(currentShift.id, {
        actualCash: cashInputValue(actualCash),
        explanation: closeExplanation.trim() || undefined,
      });
      setSuccess(!result.review.isDataComplete
        ? "Đã gửi yêu cầu và kết thúc ca để có thể chuyển ca. Dữ liệu bán hàng/hoàn tiền chưa đầy đủ nên chủ cửa hàng cần đối soát thêm."
        : result.review.isMatched
          ? "Số tiền kiểm đếm khớp. Ca đã kết thúc và yêu cầu đang chờ chủ cửa hàng xác nhận."
          : "Đã gửi yêu cầu kết thúc ca cùng phần giải trình. Ca đã kết thúc để có thể chuyển ca.");
      setActualCash("");
      setCloseExplanation("");
      setClosePreview(null);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Không thể gửi yêu cầu kết thúc ca.");
    } finally {
      setSaving(false);
    }
  }

  async function resubmitCloseReview(shiftId: string, reviewId: string) {
    const input = resubmission[reviewId];
    if (!input?.explanation.trim()) {
      setError("Vui lòng nhập phần giải trình bổ sung.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await cashShiftsApi.resubmitCloseExplanation(shiftId, {
        explanation: input.explanation.trim(),
        actualCash: input.actualCash ? cashInputValue(input.actualCash) : undefined,
      });
      setSuccess("Đã gửi giải trình bổ sung tới chủ cửa hàng.");
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Không thể gửi giải trình.");
    } finally {
      setSaving(false);
    }
  }

  async function resubmitHandoff(handoffId: string, reviewId: string) {
    const explanation = resubmission[reviewId]?.explanation.trim();
    if (!explanation) {
      setError("Vui lòng nhập phần giải trình bàn giao bổ sung.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await cashShiftsApi.resubmitHandoffExplanation(handoffId, explanation);
      setSuccess("Đã gửi giải trình bàn giao bổ sung tới chủ cửa hàng.");
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Không thể gửi giải trình bàn giao.");
    } finally {
      setSaving(false);
    }
  }

  async function submitWithdrawal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentShift) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await cashShiftsApi.withdraw(currentShift.id, {
        amount: cashInputValue(withdrawal.amount),
        purpose: withdrawal.purpose.trim(),
        destination: withdrawal.destination.trim(),
      });
      setWithdrawal({ amount: "", purpose: "", destination: "" });
      setSuccess("Đã ghi nhận rút tiền khỏi két. Khoản này được tính là tiền ra, không phải chi phí.");
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Không thể ghi nhận rút tiền.");
    } finally {
      setSaving(false);
    }
  }

  async function decideCloseReview(reviewId: string, decision: "APPROVE" | "REQUEST_EXPLANATION") {
    const reviewerNote = reviewNotes[reviewId]?.trim();
    if (decision === "REQUEST_EXPLANATION" && !reviewerNote) {
      setError("Nhập lý do cần giải trình trước khi gửi lại nhân viên.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await cashShiftsApi.decideCloseReview(reviewId, { decision, reviewerNote: reviewerNote || undefined });
      setSuccess(decision === "APPROVE" ? "Đã chấp nhận yêu cầu kết thúc ca." : "Đã yêu cầu nhân viên giải trình lại.");
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Không thể cập nhật yêu cầu.");
    } finally {
      setSaving(false);
    }
  }

  async function decideHandoffReview(reviewId: string, decision: "APPROVE" | "REQUEST_EXPLANATION") {
    const reviewerNote = reviewNotes[reviewId]?.trim();
    if (decision === "REQUEST_EXPLANATION" && !reviewerNote) {
      setError("Nhập lý do cần giải trình bàn giao trước khi gửi lại nhân viên.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await cashShiftsApi.decideHandoffReview(reviewId, { decision, reviewerNote: reviewerNote || undefined });
      setSuccess(decision === "APPROVE" ? "Đã chấp nhận bàn giao két." : "Đã yêu cầu nhân viên giải trình bàn giao.");
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Không thể cập nhật bàn giao.");
    } finally {
      setSaving(false);
    }
  }

  if (!canRead) {
    return <AppLayout><div className="mx-auto max-w-3xl p-6"><Alert variant="destructive">Tài khoản của bạn không có quyền xem thông tin quản lý ca tiền mặt.</Alert></div></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <span className="eyebrow"><Wallet size={14} /> QUẦY THU NGÂN</span>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-slate-900">Quản lý ca & tiền mặt</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">Ghi nhận tiền đầu ca, theo dõi các khoản thu chi, kiểm đếm két và xác nhận bàn giao.</p>
          </div>
          {currentShift
            ? <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Đang mở ca</span>
            : <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600"><LockKeyhole size={14} /> Chưa mở ca</span>}
        </header>

        {error && <Alert className="whitespace-pre-line" variant="destructive">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}
        <Alert className="flex gap-3 border-amber-200 bg-amber-50 text-amber-950">
          <CircleAlert className="mt-0.5 shrink-0 text-amber-600" size={18} />
          <span><strong>Đối soát tiền mặt:</strong> Thanh toán CASH từ đơn bán và hoàn tiền CASH được tự động ghi vào dòng tiền ca; các khoản thu chi khác cần được nhân viên ghi nhận tại đây. Ca có đơn bán/hoàn tiền thiếu dữ liệu sẽ được đánh dấu chưa thể đối soát đầy đủ.</span>
        </Alert>

        {loading ? (
          <Card><CardContent className="py-12 text-center text-sm text-slate-500">Đang tải thông tin ca trực…</CardContent></Card>
        ) : currentShift ? (
          <>
            <Card>
              <CardContent className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><ShieldCheck size={17} className="text-[#0f4c3a]" /> Nhân viên chịu trách nhiệm</div>
                  <p className="mt-1 text-sm text-slate-600">{currentShift.user.fullName}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><Clock3 size={13} /> Mở lúc {timestamp(currentShift.openedAt)}</p>
                </div>
                {currentShift.incomingHandoff && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                    <p className="font-semibold text-slate-800">Bàn giao từ ca trước</p>
                    <p className="mt-1 text-slate-600">{currentShift.incomingHandoff.isMatched ? "Tiền đầu ca khớp với ca trước." : "Bàn giao có chênh lệch."}</p>
                    {canReconcile && <p className="mt-1 font-semibold text-slate-700">Chênh lệch bàn giao {money(currentShift.incomingHandoff.differenceCash)}</p>}
                    <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(currentShift.incomingHandoff.status)}`}>{reviewStatusLabel(currentShift.incomingHandoff.status)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {canReconcile && (
              <Card>
                <CardContent className="flex items-center justify-between gap-4 p-5">
                  {currentShift.cashDataComplete
                    ? <><div><p className="text-sm font-semibold text-slate-700">Số tiền két theo hệ thống</p><p className="mt-1 text-xs text-slate-500">Chỉ hiển thị với người có quyền đối soát.</p></div><strong className="text-xl text-[#0f4c3a]">{money(currentShift.systemExpectedCash)}</strong></>
                    : <Alert className="w-full" variant="destructive">Chưa thể xác nhận số lý thuyết: có {currentShift.untrackedCashEventCount ?? "một số"} mục dữ liệu nguồn chưa đầy đủ.</Alert>}
                </CardContent>
              </Card>
            )}

            <div className="grid items-start gap-5 xl:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><ReceiptText size={18} className="text-[#0f4c3a]" /> Ghi nhận dòng tiền</CardTitle><p className="text-sm text-slate-500">Ghi các khoản thu, chi và hoàn tiền mặt phát sinh.</p></CardHeader>
                <CardContent>{canManage ? <MovementForm onRecord={submitTransaction} saving={saving} shift={currentShift} /> : <Alert variant="destructive">Bạn không có quyền ghi nhận giao dịch.</Alert>}</CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><LockKeyhole size={18} className="text-[#0f4c3a]" /> Kiểm đếm & kết thúc ca</CardTitle><p className="text-sm text-slate-500">Nhân viên kiểm đếm mù; ca sẽ kết thúc ngay sau khi gửi yêu cầu để có thể chuyển ca.</p></CardHeader>
                <CardContent>
                  {!canManage ? <Alert variant="destructive">Bạn không có quyền đóng ca.</Alert>
                    : !isResponsible ? <Alert>Ca này do <strong>{currentShift.user.fullName}</strong> chịu trách nhiệm. Chỉ tài khoản này mới có thể gửi yêu cầu đóng ca.</Alert>
                      : (
                        <form className="space-y-4" onSubmit={submitCloseShift}>
                          <div className="space-y-2">
                            <Label htmlFor="cash-actual">Tiền thực tế trong két (VNĐ)</Label>
                            <Input id="cash-actual" inputMode="decimal" maxLength={16} onChange={(event) => { setActualCash(formatCashInput(event.target.value)); setClosePreview(null); }} placeholder="Ví dụ: 1.000.000" required type="text" value={actualCash} />
                          </div>
                          <Button disabled={saving || !actualCash} onClick={() => void previewCloseCount()} type="button" variant="outline"><Banknote size={16} /> Kiểm tra kết quả kiểm đếm</Button>
                          {closePreview?.amount === actualCash && (
                            <Alert variant={closePreview.isMatched ? "success" : "destructive"}>
                              {!closePreview.isDataComplete ? "Dữ liệu bán hàng/hoàn tiền chưa đầy đủ; hãy ghi rõ trong phần giải trình để chủ cửa hàng đối soát." : closePreview.isMatched ? "Số tiền kiểm đếm khớp với hệ thống." : "Số tiền kiểm đếm có chênh lệch. Vui lòng giải trình trước khi gửi yêu cầu."}
                            </Alert>
                          )}
                          {closePreview?.amount === actualCash && !closePreview.isMatched && (
                            <div className="space-y-2">
                              <Label htmlFor="cash-close-explanation">Lý do chênh lệch <span className="text-rose-600">*</span></Label>
                              <textarea className="min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#0f4c3a] focus:ring-4 focus:ring-emerald-100" id="cash-close-explanation" maxLength={1000} onChange={(event) => setCloseExplanation(event.target.value)} placeholder="Nhập lý do hoặc tình huống dẫn đến chênh lệch" required value={closeExplanation} />
                            </div>
                          )}
                          <Button className="w-full" disabled={saving || !closePreview || closePreview.amount !== actualCash || (!closePreview.isMatched && !closeExplanation.trim())} type="submit"><LockKeyhole size={16} /> Gửi yêu cầu & kết thúc ca</Button>
                        </form>
                      )}
                </CardContent>
              </Card>
            </div>

            {canWithdraw && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Wallet size={18} className="text-[#0f4c3a]" /> Rút tiền khỏi két</CardTitle><p className="text-sm text-slate-500">Chuyển tiền dư sang két an toàn hoặc ngân hàng; đây là dòng tiền ra, không phải chi phí kinh doanh.</p></CardHeader>
                <CardContent>
                  <form className="grid gap-4 md:grid-cols-2" onSubmit={submitWithdrawal}>
                    <div className="space-y-2"><Label htmlFor="withdrawal-amount">Số tiền rút (VNĐ)</Label><Input id="withdrawal-amount" inputMode="decimal" maxLength={16} onChange={(event) => setWithdrawal((old) => ({ ...old, amount: formatCashInput(event.target.value) }))} required type="text" value={withdrawal.amount} /></div>
                    <div className="space-y-2"><Label htmlFor="withdrawal-destination">Nơi nhận tiền</Label><Input id="withdrawal-destination" maxLength={255} onChange={(event) => setWithdrawal((old) => ({ ...old, destination: event.target.value }))} placeholder="Két an toàn, ngân hàng..." required value={withdrawal.destination} /></div>
                    <div className="space-y-2 md:col-span-2"><Label htmlFor="withdrawal-purpose">Mục đích rút</Label><Input id="withdrawal-purpose" maxLength={1000} onChange={(event) => setWithdrawal((old) => ({ ...old, purpose: event.target.value }))} placeholder="Lý do và thông tin đối chiếu/biên nhận" required value={withdrawal.purpose} /></div>
                    <div className="md:col-span-2"><Button disabled={saving} type="submit"><ArrowUpRight size={16} /> Xác nhận rút tiền</Button></div>
                  </form>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><History size={18} className="text-[#0f4c3a]" /> Giao dịch trong ca</CardTitle><p className="text-sm text-slate-500">{transactionData?.pagination.total ?? 0} giao dịch phù hợp</p></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input aria-label="Tìm giao dịch" onChange={(event) => setTransactionSearchInput(event.target.value)} placeholder="Tìm ghi chú, người nhận..." value={transactionSearchInput} />
                  <select aria-label="Lọc chiều giao dịch" className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm" onChange={(event) => { setTransactionType(event.target.value); setTransactionPage(1); }} value={transactionType}>
                    <option value="ALL">Tất cả dòng tiền</option><option value="IN">Tiền vào</option><option value="OUT">Tiền ra</option>
                  </select>
                  <select aria-label="Sắp xếp giao dịch" className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm" onChange={(event) => { setTransactionSort(event.target.value); setTransactionPage(1); }} value={transactionSort}>
                    <option value="newest">Mới nhất trước</option><option value="oldest">Cũ nhất trước</option><option value="amount_high">Số tiền cao nhất</option><option value="amount_low">Số tiền thấp nhất</option>
                  </select>
                </div>
                {transactionLoading ? <div className="py-8 text-center text-sm text-slate-500">Đang tải giao dịch...</div>
                  : transactions.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">{transactionSearch || transactionType !== "ALL" ? "Không có giao dịch phù hợp với bộ lọc." : "Chưa có giao dịch tiền mặt trong ca này."}</div>
                  : <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3 font-semibold">Thời gian</th><th className="px-3 py-3 font-semibold">Danh mục</th><th className="px-3 py-3 font-semibold">Người ghi</th><th className="px-3 py-3 text-right font-semibold">Số tiền</th><th className="px-3 py-3 font-semibold">Ghi chú / nơi nhận</th></tr></thead>
                    <tbody>{transactions.map((transaction) => <tr className="border-b border-slate-100 last:border-0" key={transaction.id}>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600">{timestamp(transaction.createdAt)}</td>
                      <td className="px-3 py-3"><span className={`inline-flex items-center gap-1.5 font-semibold ${transaction.transactionType === "IN" ? "text-emerald-700" : "text-rose-700"}`}>{transaction.transactionType === "IN" ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}{categoryLabel(transaction.category)}</span></td>
                      <td className="px-3 py-3 text-slate-600">{transaction.createdByUser.fullName}</td>
                      <td className={`whitespace-nowrap px-3 py-3 text-right font-bold ${transaction.transactionType === "IN" ? "text-emerald-700" : "text-rose-700"}`}>{transaction.transactionType === "IN" ? "+" : "−"}{money(transaction.amount)}</td>
                      <td className="max-w-64 px-3 py-3 text-slate-500"><p className="max-w-52 truncate">{transaction.notes || transaction.recipientOrPayer || "—"}</p><Button className="mt-1 h-auto px-0 py-0 text-xs" onClick={() => setSelectedTransaction(transaction)} type="button" variant="link"><Eye size={13} /> Xem chi tiết</Button></td>
                    </tr>)}</tbody>
                  </table></div>}
                {transactionData?.pagination && <Pagination {...transactionData.pagination} onPageChange={setTransactionPage} />}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Wallet size={19} className="text-[#0f4c3a]" /> Bắt đầu ca trực</CardTitle><p className="text-sm text-slate-500">Tự kiểm đếm két trước khi nhập số tiền đầu ca. Nếu ca trước đang chờ duyệt, bạn vẫn có thể chuyển ca.</p></CardHeader>
            <CardContent>
              {canManage ? (
                <form className="max-w-xl space-y-4" onSubmit={submitOpenShift}>
                  <div className="space-y-2"><Label htmlFor="cash-opening">Tiền đầu ca trong két (VNĐ)</Label><Input id="cash-opening" inputMode="decimal" maxLength={16} onChange={(event) => { setOpeningCash(formatCashInput(event.target.value)); setOpeningPreview(null); }} placeholder="Ví dụ: 1.000.000" required type="text" value={openingCash} /></div>
                  <p className="text-sm text-slate-500">Ca sẽ do <strong className="text-slate-700">{profile?.user.fullName}</strong> chịu trách nhiệm.</p>
                  <Button disabled={saving || !openingCash} onClick={() => void previewOpeningCash()} type="button" variant="outline"><Banknote size={16} /> Kiểm tra tiền bàn giao</Button>
                  {openingPreview?.amount === openingCash && (
                    <Alert variant={!openingPreview.hasPreviousShift || openingPreview.isMatched ? "success" : "destructive"}>
                      {!openingPreview.hasPreviousShift ? "Chưa có ca trước để đối chiếu." : openingPreview.isMatched ? "Tiền đầu ca khớp với tiền bàn giao." : "Tiền đầu ca có chênh lệch. Vui lòng giải trình; bạn vẫn có thể mở ca để tiếp tục vận hành."}
                    </Alert>
                  )}
                  {openingPreview?.amount === openingCash && openingPreview.hasPreviousShift && !openingPreview.isMatched && (
                    <div className="space-y-2"><Label htmlFor="handoff-explanation">Lý do chênh lệch bàn giao <span className="text-rose-600">*</span></Label><textarea className="min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#0f4c3a] focus:ring-4 focus:ring-emerald-100" id="handoff-explanation" maxLength={1000} onChange={(event) => setOpeningExplanation(event.target.value)} placeholder="Giải trình chênh lệch giữa số tiền nhận và số tiền đã bàn giao" required value={openingExplanation} /></div>
                  )}
                  <Button disabled={saving || !openingPreview || openingPreview.amount !== openingCash || (openingPreview.hasPreviousShift && !openingPreview.isMatched && !openingExplanation.trim())} type="submit"><Plus size={16} /> Mở ca & ghi nhận tiền đầu ca</Button>
                </form>
              ) : <Alert variant="destructive">Bạn không có quyền mở ca.</Alert>}
            </CardContent>
          </Card>
        )}

        {ownExplanationRequests.map(({ shift, review }) => (
          <Card key={review.id}>
            <CardHeader><CardTitle>Giải trình bổ sung · ca {timestamp(shift.openedAt)}</CardTitle><p className="text-sm text-amber-800">{review.reviewerNote || "Chủ cửa hàng yêu cầu giải trình lại."}</p></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2"><Label htmlFor={`resubmit-amount-${review.id}`}>Tiền thực tế đã kiểm đếm (có thể cập nhật)</Label><Input id={`resubmit-amount-${review.id}`} inputMode="decimal" maxLength={16} onChange={(event) => setResubmission((old) => ({ ...old, [review.id]: { explanation: old[review.id]?.explanation ?? "", actualCash: formatCashInput(event.target.value) } }))} type="text" value={resubmission[review.id]?.actualCash ?? formatStoredCashInput(review.actualCash)} /></div>
              <div className="space-y-2"><Label htmlFor={`resubmit-reason-${review.id}`}>Giải trình bổ sung</Label><textarea className="min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#0f4c3a] focus:ring-4 focus:ring-emerald-100" id={`resubmit-reason-${review.id}`} maxLength={1000} onChange={(event) => setResubmission((old) => ({ ...old, [review.id]: { actualCash: old[review.id]?.actualCash ?? review.actualCash, explanation: event.target.value } }))} placeholder="Bổ sung thông tin theo yêu cầu của chủ cửa hàng" value={resubmission[review.id]?.explanation ?? ""} /></div>
              <Button disabled={saving} onClick={() => void resubmitCloseReview(shift.id, review.id)} type="button">Gửi giải trình bổ sung</Button>
            </CardContent>
          </Card>
        ))}

        {ownHandoffRequests.map(({ shift, handoff }) => (
          <Card key={handoff.id}>
            <CardHeader><CardTitle>Giải trình bổ sung bàn giao · ca {timestamp(shift.openedAt)}</CardTitle><p className="text-sm text-amber-800">{handoff.reviewerNote || "Chủ cửa hàng yêu cầu giải trình lại."}</p></CardHeader>
            <CardContent className="space-y-3">
              <textarea className="min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#0f4c3a] focus:ring-4 focus:ring-emerald-100" maxLength={1000} onChange={(event) => setResubmission((old) => ({ ...old, [handoff.id]: { explanation: event.target.value, actualCash: "" } }))} placeholder="Giải trình bổ sung" value={resubmission[handoff.id]?.explanation ?? ""} />
              <Button disabled={saving} onClick={() => void resubmitHandoff(handoff.id, handoff.id)} type="button">Gửi giải trình bàn giao</Button>
            </CardContent>
          </Card>
        ))}

        {canReview && reviewQueue && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck size={18} className="text-[#0f4c3a]" /> Yêu cầu chờ chủ cửa hàng xem xét</CardTitle><p className="text-sm text-slate-500">Các yêu cầu chờ duyệt không ngăn nhân viên mở ca tiếp theo.</p></CardHeader>
            <CardContent className="space-y-4">
              {!reviewQueue.closeReviews.length && !reviewQueue.handoffs.length ? <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">Không có yêu cầu nào chờ duyệt.</div> : (
                <>
                  {reviewQueue.closeReviews.map((review) => (
                    <div className="space-y-3 rounded-xl border border-slate-200 p-4" key={review.id}>
                      <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold text-slate-900">Kiểm kê cuối ca · {review.submittedByUser?.fullName}</p><p className="text-xs text-slate-500">Gửi lúc {timestamp(review.submittedAt)} · lần {review.revision}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(review.status)}`}>{review.shift?.reconciliationStatus === "INCOMPLETE_DATA" ? "Dữ liệu chưa đầy đủ" : review.isMatched ? "Số đếm khớp" : "Có chênh lệch"}</span></div>
                      <div className="grid gap-3 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-3"><div>Hệ thống dự kiến<strong className="mt-1 block">{money(review.expectedCash)}</strong></div><div>Nhân viên đếm<strong className="mt-1 block">{money(review.actualCash)}</strong></div><div>Chênh lệch<strong className="mt-1 block">{money(review.differenceCash)}</strong></div></div>
                      {review.shift?.reconciliationStatus === "INCOMPLETE_DATA" && <Alert variant="destructive">Dữ liệu giao dịch của ca chưa đầy đủ; số liệu dưới đây chỉ phản ánh các dòng tiền đã ghi nhận, cần xác minh thêm trước khi kết luận.</Alert>}
                      <p className="text-sm text-slate-600"><strong>Giải trình:</strong> {review.explanation || "Không có chênh lệch."}</p>
                      <textarea className="min-h-20 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#0f4c3a] focus:ring-4 focus:ring-emerald-100" maxLength={1000} onChange={(event) => setReviewNotes((old) => ({ ...old, [review.id]: event.target.value }))} placeholder="Ghi chú duyệt hoặc nêu rõ lý do cần giải trình lại" value={reviewNotes[review.id] ?? ""} />
                      <div className="flex flex-wrap gap-2"><Button disabled={saving} onClick={() => void decideCloseReview(review.id, "APPROVE")} type="button">Chấp nhận yêu cầu</Button><Button disabled={saving || !reviewNotes[review.id]?.trim()} onClick={() => void decideCloseReview(review.id, "REQUEST_EXPLANATION")} type="button" variant="outline">Yêu cầu giải trình lại</Button></div>
                    </div>
                  ))}
                  {reviewQueue.handoffs.map((review) => (
                    <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/40 p-4" key={review.id}>
                      <div><p className="font-semibold text-slate-900">Chênh lệch bàn giao · {review.submittedByUser.fullName}</p><p className="text-xs text-slate-500">Gửi lúc {timestamp(review.submittedAt)} · lần {review.revision}</p></div>
                      <div className="grid gap-3 rounded-lg bg-white p-3 text-sm sm:grid-cols-3"><div>Ca trước bàn giao<strong className="mt-1 block">{money(review.handoff.handedOverCash)}</strong></div><div>Ca mới nhận<strong className="mt-1 block">{money(review.handoff.receivedCash)}</strong></div><div>Chênh lệch<strong className="mt-1 block">{money(review.handoff.differenceCash)}</strong></div></div>
                      <p className="text-sm text-slate-600"><strong>Giải trình:</strong> {review.explanation}</p>
                      <textarea className="min-h-20 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#0f4c3a] focus:ring-4 focus:ring-emerald-100" maxLength={1000} onChange={(event) => setReviewNotes((old) => ({ ...old, [review.id]: event.target.value }))} placeholder="Ghi chú duyệt hoặc nêu rõ lý do cần giải trình lại" value={reviewNotes[review.id] ?? ""} />
                      <div className="flex flex-wrap gap-2"><Button disabled={saving} onClick={() => void decideHandoffReview(review.id, "APPROVE")} type="button">Chấp nhận bàn giao</Button><Button disabled={saving || !reviewNotes[review.id]?.trim()} onClick={() => void decideHandoffReview(review.id, "REQUEST_EXPLANATION")} type="button" variant="outline">Yêu cầu giải trình lại</Button></div>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><History size={18} className="text-[#0f4c3a]" /> Lịch sử ca gần đây</CardTitle><p className="text-sm text-slate-500">Trạng thái kiểm kê có thể chờ duyệt sau khi két đã được bàn giao cho ca mới.</p></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Input aria-label="Tìm nhân viên chịu trách nhiệm" onChange={(event) => setHistorySearchInput(event.target.value)} placeholder="Tìm nhân viên chịu trách nhiệm..." value={historySearchInput} />
              <select aria-label="Lọc trạng thái ca" className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm" onChange={(event) => { setHistoryStatus(event.target.value); setHistoryPage(1); }} value={historyStatus}>
                <option value="ALL">Tất cả ca</option><option value="OPEN">Đang mở</option><option value="CLOSED">Đã đóng</option>
              </select>
              <select aria-label="Sắp xếp ca" className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm" onChange={(event) => { setHistorySort(event.target.value); setHistoryPage(1); }} value={historySort}>
                <option value="newest">Ca mới nhất</option><option value="oldest">Ca cũ nhất</option>
              </select>
            </div>
            {!summary?.shifts.length ? <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">Chưa có ca nào được ghi nhận.</div>
              : <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3 font-semibold">Người chịu trách nhiệm</th><th className="px-3 py-3 font-semibold">Bắt đầu</th><th className="px-3 py-3 font-semibold">Kết thúc</th><th className="px-3 py-3 text-right font-semibold">Đầu ca</th>{canReconcile && <><th className="px-3 py-3 text-right font-semibold">Dự kiến*</th><th className="px-3 py-3 text-right font-semibold">Thực tế</th><th className="px-3 py-3 text-right font-semibold">Chênh lệch*</th></>}<th className="px-3 py-3 font-semibold">Trạng thái ca / duyệt</th></tr></thead>
                <tbody>{summary.shifts.map((shift) => {
                  const latestReview = shift.closeReviews?.[0];
                  return <tr className="border-b border-slate-100 last:border-0" key={shift.id}>
                    <td className="px-3 py-3 font-medium text-slate-800">{shift.user.fullName}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-600">{timestamp(shift.openedAt)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-600">{timestamp(shift.closedAt)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-slate-700">{money(shift.openingCash)}</td>
                    {canReconcile && <><td className="whitespace-nowrap px-3 py-3 text-right text-slate-700">{shift.expectedCash == null ? "—" : money(shift.expectedCash)}</td><td className="whitespace-nowrap px-3 py-3 text-right text-slate-700">{shift.actualCash == null ? "—" : money(shift.actualCash)}</td><td className={`whitespace-nowrap px-3 py-3 text-right font-semibold ${Number(shift.differenceCash) < 0 ? "text-rose-700" : Number(shift.differenceCash) > 0 ? "text-emerald-700" : "text-slate-700"}`}>{shift.differenceCash == null ? "—" : money(shift.differenceCash)}</td></>}
                    <td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${shift.status === "OPEN" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{shift.status === "OPEN" ? "Đang mở" : "Đã đóng"}</span>{canReconcile && shift.status === "CLOSED" && shift.reconciliationStatus === "INCOMPLETE_DATA" && <span className="ml-1 inline-block rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">Dữ liệu thiếu</span>}{latestReview && <span className={`ml-1 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(latestReview.status)}`}>{reviewStatusLabel(latestReview.status)}</span>}</td>
                  </tr>;
                })}</tbody>
              </table></div>}
            {canReconcile && <p className="mt-3 text-xs text-slate-500">* Ca có trạng thái dữ liệu chưa đầy đủ không thể dùng số dự kiến để kết luận chênh lệch.</p>}
            {summary?.pagination && <Pagination {...summary.pagination} onPageChange={setHistoryPage} />}
          </CardContent>
        </Card>
      </div>
      <Modal onClose={() => setSelectedTransaction(null)} open={selectedTransaction !== null} title="Chi tiết giao dịch">
        {selectedTransaction && (
          <dl className="grid gap-x-5 gap-y-4 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">Thời gian</dt><dd className="mt-1 font-medium">{timestamp(selectedTransaction.createdAt)}</dd></div>
            <div><dt className="text-slate-500">Loại giao dịch</dt><dd className={`mt-1 font-semibold ${selectedTransaction.transactionType === "IN" ? "text-emerald-700" : "text-rose-700"}`}>{selectedTransaction.transactionType === "IN" ? "Tiền vào" : "Tiền ra"} · {categoryLabel(selectedTransaction.category)}</dd></div>
            <div><dt className="text-slate-500">Số tiền</dt><dd className="mt-1 font-bold">{money(selectedTransaction.amount)}</dd></div>
            <div><dt className="text-slate-500">Người ghi nhận</dt><dd className="mt-1 font-medium">{selectedTransaction.createdByUser.fullName}</dd></div>
            <div className="sm:col-span-2"><dt className="text-slate-500">Người nhận / nộp tiền</dt><dd className="mt-1 font-medium">{selectedTransaction.recipientOrPayer || "—"}</dd></div>
            <div className="sm:col-span-2"><dt className="text-slate-500">Ghi chú</dt><dd className="mt-1 whitespace-pre-wrap break-words font-medium">{selectedTransaction.notes || "Không có ghi chú."}</dd></div>
            {selectedTransaction.refDocType && <div className="sm:col-span-2"><dt className="text-slate-500">Chứng từ tham chiếu</dt><dd className="mt-1 break-all font-medium">{selectedTransaction.refDocType}{selectedTransaction.refDocId ? ` · ${selectedTransaction.refDocId}` : ""}</dd></div>}
          </dl>
        )}
      </Modal>
    </AppLayout>
  );
}
