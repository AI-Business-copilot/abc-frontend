import { useEffect, useState } from "react";

import { shelfApi } from "@/api/shelves";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import type { ExpiringLot } from "@/types/scrap";
import { shelfLocationText, type Shelf } from "@/types/shelf";
import { Modal } from "./scrap-ui";

/**
 * Put a lot on a shelf: "Ke A2 - Tang 3 - O 04".
 *
 * The staff pick a shelf, a level and a slot. The position itself is created by the server when
 * it does not exist yet, so nobody has to type a cell id.
 */
export function AssignShelfDialog({
  lot,
  onClose,
  onDone,
}: {
  lot: ExpiringLot;
  onClose: () => void;
  onDone: () => void;
}) {
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [loading, setLoading] = useState(true);
  const [shelfId, setShelfId] = useState(lot.shelfCell?.shelf.id ?? "");
  const [level, setLevel] = useState(String(lot.shelfCell?.level ?? ""));
  const [slot, setSlot] = useState(String(lot.shelfCell?.slot ?? ""));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    shelfApi
      .list()
      .then((rows) => {
        if (!alive) return;
        setShelves(rows.filter((shelf) => shelf.isActive));
        setLoading(false);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Không tải được danh sách kệ.");
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const submit = async () => {
    const levelNumber = Number(level);
    const slotNumber = Number(slot);
    if (!shelfId) {
      setError("Hãy chọn kệ.");
      return;
    }
    if (!Number.isInteger(levelNumber) || levelNumber < 1) {
      setError("Tầng phải là số nguyên từ 1 trở lên.");
      return;
    }
    if (!Number.isInteger(slotNumber) || slotNumber < 1) {
      setError("Ô phải là số nguyên từ 1 trở lên.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await shelfApi.assignLotItem(lot.lotId, lot.id, {
        shelfId,
        level: levelNumber,
        slot: slotNumber,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không gán được vị trí.");
      setSubmitting(false);
    }
  };

  const selected = shelves.find((shelf) => shelf.id === shelfId);

  return (
    <Modal busy={submitting} onClose={onClose} title="Gán vị trí lưu kho">
      <p className="mb-4 text-sm text-slate-600">
        {lot.variant.template.name} · {lot.variant.sku} · lô {lot.lotNumber}
      </p>
      {error && (
        <Alert className="mb-3" variant="destructive">
          {error}
        </Alert>
      )}

      {loading ? (
        <p className="mb-3 flex items-center gap-2 text-sm text-slate-500">
          <Spinner className="h-4 w-4" /> Đang tải danh sách kệ…
        </p>
      ) : shelves.length === 0 ? (
        <Alert className="mb-3">
          Cửa hàng chưa có kệ nào. Hãy tạo kệ ở trang <strong>Quản lý kệ</strong> trước.
        </Alert>
      ) : (
        <>
          <Label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="shelf-select">
            Kệ
          </Label>
          <select
            className="mb-3 w-full rounded-xl border border-slate-200 p-2 text-sm outline-none focus:border-[#0f4c3a] focus:ring-4 focus:ring-emerald-100"
            id="shelf-select"
            onChange={(event) => setShelfId(event.target.value)}
            value={shelfId}
          >
            <option value="">-- Chọn kệ --</option>
            {shelves.map((shelf) => (
              <option key={shelf.id} value={shelf.id}>
                {shelf.code}
                {shelf.name ? ` - ${shelf.name}` : ""}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="shelf-level">
                Tầng
              </Label>
              <Input
                id="shelf-level"
                inputMode="numeric"
                min={1}
                onChange={(event) => setLevel(event.target.value)}
                type="number"
                value={level}
              />
            </div>
            <div>
              <Label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="shelf-slot">
                Ô
              </Label>
              <Input
                id="shelf-slot"
                inputMode="numeric"
                min={1}
                onChange={(event) => setSlot(event.target.value)}
                type="number"
                value={slot}
              />
            </div>
          </div>

          {selected && level && slot ? (
            <p className="mt-3 text-sm text-slate-500">
              Vị trí: {shelfLocationText({ id: "", level: Number(level), slot: Number(slot), shelf: { id: selected.id, code: selected.code, name: selected.name } })}
            </p>
          ) : null}
        </>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <Button disabled={submitting} onClick={onClose} type="button" variant="outline">
          Hủy
        </Button>
        <Button disabled={submitting || loading} onClick={() => void submit()} type="button">
          {submitting && <Spinner className="h-4 w-4" />}Gán vị trí
        </Button>
      </div>
    </Modal>
  );
}
