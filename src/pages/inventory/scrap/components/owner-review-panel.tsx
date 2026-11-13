import { useState } from "react";

import { scrapApi } from "@/api/scrap";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { REJECTION_REASON_CODES, type RejectionReasonCode, type ScrapOrderDetail } from "@/types/scrap";
import { Modal, formatMoney, rejectionReasonLabel } from "./scrap-ui";

/**
 * Owner-only approve and reject controls. Approve sends the ids of the photos currently on screen;
 * if staff changed the photos in the meantime the server answers 409 and the order is reloaded
 * so the Owner reviews the new set before trying again.
 */
export function OwnerReviewPanel({
  order,
  onFinished,
  onReload,
}: {
  order: ScrapOrderDetail;
  /** Called after a successful approve or reject. */
  onFinished: (message: string) => void;
  /** Reloads the order (used after a 409 so the Owner sees the latest photos). */
  onReload: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reasonCode, setReasonCode] = useState<RejectionReasonCode | "">("");
  const [note, setNote] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelNote, setCancelNote] = useState("");

  const noPhotos = order.images.length === 0;
  const loss = Number(order.unitCost) * order.scrapQty;

  const approve = async () => {
    const message =
      `Duyệt hủy ${order.scrapQty} sản phẩm? Tồn kho sẽ giảm và tổn thất ${formatMoney(loss)} sẽ được ghi nhận. ` +
      `Thao tác này không thể hoàn tác.`;
    if (!window.confirm(message)) return;

    setBusy(true);
    setError(null);
    try {
      await scrapApi.approveScrapOrder(order.id, order.images.map((image) => image.id));
      onFinished("Đã duyệt phiếu hủy. Tồn kho đã được cập nhật.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể duyệt phiếu hủy.");
      // A 409 usually means the photos changed; reload so the next approval uses what is really there.
      await onReload();
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!reasonCode) {
      setError("Vui lòng chọn lý do từ chối.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await scrapApi.rejectScrapOrder(order.id, { reasonCode, note: note.trim() || undefined });
      setRejecting(false);
      onFinished("Đã từ chối phiếu hủy. Lô hàng vẫn đang được cách ly.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể từ chối phiếu hủy.");
      await onReload();
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    setError(null);
    try {
      await scrapApi.cancelScrapOrder(order.id, cancelNote);
      setCancelling(false);
      onFinished("Đã hủy phiếu. Lô hàng vẫn đang được cách ly.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể hủy phiếu hủy.");
      await onReload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
      <h3 className="font-semibold text-slate-900">Duyệt phiếu hủy</h3>
      <p className="text-sm text-slate-600">
        Xem kỹ các ảnh bằng chứng bên dưới trước khi quyết định. Số lượng hủy: <b>{order.scrapQty}</b> · Tổn thất dự kiến: <b>{formatMoney(loss)}</b>.
      </p>
      {error && <Alert variant="destructive">{error}</Alert>}
      {noPhotos && (
        <Alert>Phiếu chưa có ảnh.</Alert>
      )}
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy || noPhotos} onClick={() => void approve()} type="button">
          {busy && <Spinner className="h-4 w-4" />}Duyệt hủy hàng
        </Button>
        <Button
          disabled={busy}
          onClick={() => {
            setError(null);
            setRejecting(true);
          }}
          type="button"
          variant="destructive"
        >
          Từ chối
        </Button>
        <Button
          disabled={busy}
          onClick={() => {
            setError(null);
            setCancelling(true);
          }}
          type="button"
          variant="outline"
        >
          Hủy phiếu
        </Button>
      </div>

      {rejecting && (
        <Modal busy={busy} onClose={() => setRejecting(false)} title="Từ chối phiếu hủy">
          {error && <Alert className="mb-3" variant="destructive">{error}</Alert>}
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="reject-reason">Lý do</label>
          <select
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#0f4c3a] focus:ring-4 focus:ring-emerald-100"
            id="reject-reason"
            onChange={(event) => setReasonCode(event.target.value as RejectionReasonCode | "")}
            value={reasonCode}
          >
            <option value="">— Chọn lý do —</option>
            {REJECTION_REASON_CODES.map((code) => (
              <option key={code} value={code}>{rejectionReasonLabel[code]}</option>
            ))}
          </select>
          <label className="mb-1 mt-3 block text-sm font-medium text-slate-700" htmlFor="reject-note">
            Ghi chú (không bắt buộc, tối đa 500 ký tự)
          </label>
          <textarea
            className="min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#0f4c3a] focus:ring-4 focus:ring-emerald-100"
            id="reject-note"
            maxLength={500}
            onChange={(event) => setNote(event.target.value)}
            value={note}
          />
          <p className="mt-2 text-xs text-slate-500">
            Từ chối là quyết độc. Lô hàng vẫn đang được cách ly và không thể tạo phiếu hủy mới cho lô này.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <Button disabled={busy} onClick={() => setRejecting(false)} type="button" variant="outline">Quay lại</Button>
            <Button disabled={busy} onClick={() => void reject()} type="button" variant="destructive">
              {busy && <Spinner className="h-4 w-4" />}Xác nhận từ chối
            </Button>
          </div>
        </Modal>
      )}

      {cancelling && (
        <Modal busy={busy} onClose={() => setCancelling(false)} title="Hủy phiếu hủy">
          {error && <Alert className="mb-3" variant="destructive">{error}</Alert>}
          <p className="text-sm text-slate-600">
            Phiếu sẽ bị đóng mà không duyệt và không từ chối. Tồn kho không thay đổi và lô hàng vẫn
            được cách ly. Lô này không thể tạo phiếu hủy mới.
          </p>
          <label className="mb-1 mt-3 block text-sm font-medium text-slate-700" htmlFor="cancel-note">
            Ghi chú (không bắt buộc, tối đa 500 ký tự)
          </label>
          <textarea
            className="min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#0f4c3a] focus:ring-4 focus:ring-emerald-100"
            id="cancel-note"
            maxLength={500}
            onChange={(event) => setCancelNote(event.target.value)}
            value={cancelNote}
          />
          <div className="mt-5 flex justify-end gap-2">
            <Button disabled={busy} onClick={() => setCancelling(false)} type="button" variant="outline">Quay lại</Button>
            <Button disabled={busy} onClick={() => void cancel()} type="button" variant="destructive">
              {busy && <Spinner className="h-4 w-4" />}Xác nhận hủy phiếu
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
