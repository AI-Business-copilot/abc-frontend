import { useRef, useState } from "react";

import { scrapApi } from "@/api/scrap";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  ALLOWED_SCRAP_IMAGE_TYPES,
  MAX_SCRAP_IMAGES,
  MAX_SCRAP_IMAGE_BYTES,
  type ExpiringLot,
} from "@/types/scrap";
import { Modal } from "./scrap-ui";

export function lotStock(lot: ExpiringLot) {
  return lot.onHand + lot.damaged;
}

/** Staff pull a quantity of a lot off the shelf. Photos are added later, on the scrap order. */
export function QuarantineDialog({
  lot,
  onClose,
  onDone,
}: {
  lot: ExpiringLot;
  onClose: () => void;
  onDone: () => void;
}) {
  const stock = lotStock(lot);
  const [quantity, setQuantity] = useState(String(stock));
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      setError("Số lượng phải là số nguyên lớn hơn 0.");
      return;
    }
    if (qty > stock) {
      setError(`Lô này chỉ còn ${stock} sản phẩm.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await scrapApi.quarantineLot(lot.lotId, lot.id, { quantity: qty, note: note.trim() || undefined });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cách ly lô hàng.");
      setSubmitting(false);
    }
  };

  return (
    <Modal busy={submitting} onClose={onClose} title="Cách ly lô hàng">
      <p className="mb-4 text-sm text-slate-600">
        {lot.variant.template.name} · {lot.variant.sku} · lô {lot.lotNumber}
      </p>
      {error && <Alert className="mb-3" variant="destructive">{error}</Alert>}
      <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="quarantine-qty">
        Số lượng cách ly (tối đa {stock})
      </label>
      <Input
        id="quarantine-qty"
        inputMode="numeric"
        min={1}
        max={stock}
        onChange={(event) => setQuantity(event.target.value)}
        type="number"
        value={quantity}
      />
      <label className="mb-1 mt-3 block text-sm font-medium text-slate-700" htmlFor="quarantine-note">
        Ghi chú (không bắt buộc)
      </label>
      <textarea
        className="min-h-20 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#0f4c3a] focus:ring-4 focus:ring-emerald-100"
        id="quarantine-note"
        maxLength={500}
        onChange={(event) => setNote(event.target.value)}
        value={note}
      />
      <div className="mt-5 flex justify-end gap-2">
        <Button disabled={submitting} onClick={onClose} type="button" variant="outline">Hủy</Button>
        <Button disabled={submitting} onClick={() => void submit()} type="button">
          {submitting && <Spinner className="h-4 w-4" />}Cách ly
        </Button>
      </div>
    </Modal>
  );
}

/**
 * Staff open a scrap order for a quarantined lot. The evidence photos (1-10) are sent with the create request
 * and cannot be added or removed afterward.
 */
export function CreateScrapDialog({
  lot,
  onClose,
  onCreated,
}: {
  lot: ExpiringLot;
  onClose: () => void;
  onCreated: (orderId: string) => void;
}) {
  const max = lot.quarantineQty ?? lotStock(lot);
  const [quantity, setQuantity] = useState(String(max));
  const [reason, setReason] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    const chosen = list ? Array.from(list) : [];
    if (fileInput.current) fileInput.current.value = "";
    if (chosen.length === 0) return;

    if (files.length + chosen.length > MAX_SCRAP_IMAGES) {
      setError(`Mỗi phiếu có tối đa ${MAX_SCRAP_IMAGES} ảnh. Bạn chỉ có thể thêm ${MAX_SCRAP_IMAGES - files.length} ảnh nữa.`);
      return;
    }
    for (const file of chosen) {
      if (!ALLOWED_SCRAP_IMAGE_TYPES.includes(file.type)) {
        setError(`"${file.name}" không hợp lệ. Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.`);
        return;
      }
      if (file.size > MAX_SCRAP_IMAGE_BYTES) {
        setError(`"${file.name}" lớn hơn 5 MB.`);
        return;
      }
    }
    setError(null);
    setFiles((current) => [...current, ...chosen]);
  };

  const submit = async () => {
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0 || qty > max) {
      setError(`Số lượng phải là số nguyên từ 1 đến ${max}.`);
      return;
    }
    if (!reason.trim()) {
      setError("Vui lòng nhập lý do hủy hàng.");
      return;
    }
    if (files.length === 0) {
      setError("Vui lòng thêm ít nhất một ảnh bằng chứng.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const order = await scrapApi.createScrapOrder({
        lotItemId: lot.id,
        scrapQty: qty,
        scrapReason: reason.trim(),
        images: files,
      });
      onCreated(order.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo phiếu hủy.");
      setSubmitting(false);
    }
  };

  return (
    <Modal busy={submitting} onClose={onClose} title="Tạo phiếu hủy hàng">
      <p className="mb-4 text-sm text-slate-600">
        {lot.variant.template.name} · {lot.variant.sku} · lô {lot.lotNumber}
      </p>
      {error && <Alert className="mb-3" variant="destructive">{error}</Alert>}
      <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="scrap-qty">
        Số lượng hủy (tối đa {max})
      </label>
      <Input
        disabled={submitting}
        id="scrap-qty"
        inputMode="numeric"
        min={1}
        max={max}
        onChange={(event) => setQuantity(event.target.value)}
        type="number"
        value={quantity}
      />
      <label className="mb-1 mt-3 block text-sm font-medium text-slate-700" htmlFor="scrap-reason">
        Lý do hủy
      </label>
      <Input
        disabled={submitting}
        id="scrap-reason"
        maxLength={255}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Ví dụ: hết hạn sử dụng, bao bì hư hỏng"
        value={reason}
      />

      <div className="mt-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-slate-700">Ảnh bằng chứng</span>
          <span className="text-xs text-slate-500">
            {files.length}/{MAX_SCRAP_IMAGES} ảnh · JPEG, PNG, WebP · tối đa 5 MB
          </span>
        </div>
        <input
          accept={ALLOWED_SCRAP_IMAGE_TYPES.join(",")}
          aria-label="Chọn ảnh bằng chứng"
          className="hidden"
          multiple
          onChange={(event) => addFiles(event.target.files)}
          ref={fileInput}
          type="file"
        />
        <Button
          className="mt-2"
          disabled={submitting || files.length >= MAX_SCRAP_IMAGES}
          onClick={() => fileInput.current?.click()}
          size="sm"
          type="button"
          variant="outline"
        >
          Thêm ảnh
        </Button>
        {files.length > 0 && (
          <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-sm">
            {files.map((file, index) => (
              <li
                className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5"
                key={`${file.name}-${file.lastModified}-${index}`}
              >
                <span className="truncate text-slate-700">{file.name}</span>
                <button
                  aria-label={`Bỏ ảnh ${file.name}`}
                  className="shrink-0 text-xs text-rose-600 hover:underline disabled:opacity-50"
                  disabled={submitting}
                  onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                  type="button"
                >
                  Bỏ
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button disabled={submitting} onClick={onClose} type="button" variant="outline">Hủy</Button>
        <Button disabled={submitting} onClick={() => void submit()} type="button">
          {submitting && <Spinner className="h-4 w-4" />}Tạo phiếu
        </Button>
      </div>
    </Modal>
  );
}
