import { useState } from "react";

import { scrapApi } from "@/api/scrap";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { ExpiringLot } from "@/types/scrap";
import { Modal } from "./scrap-ui";

export function lotStock(lot: ExpiringLot) {
  return lot.inventoryBalances.reduce((sum, b) => sum + b.quantityOnHand + b.damagedQuantity, 0);
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
      await scrapApi.quarantineLot(lot.id, { quantity: qty, note: note.trim() || undefined });
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
        className="min-h-20 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
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

/** Staff open a scrap order for a quarantined lot. The server defaults the quantity and stock source. */
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setSubmitting(true);
    setError(null);
    try {
      const order = await scrapApi.createScrapOrder({
        lotId: lot.id,
        scrapQty: qty,
        scrapReason: reason.trim(),
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
        id="scrap-reason"
        maxLength={255}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Ví dụ: hết hạn sử dụng, bao bì hư hỏng"
        value={reason}
      />
      <p className="mt-2 text-xs text-slate-500">Bạn sẽ thêm ảnh bằng chứng ở bước tiếp theo.</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button disabled={submitting} onClick={onClose} type="button" variant="outline">Hủy</Button>
        <Button disabled={submitting} onClick={() => void submit()} type="button">
          {submitting && <Spinner className="h-4 w-4" />}Tạo phiếu
        </Button>
      </div>
    </Modal>
  );
}
