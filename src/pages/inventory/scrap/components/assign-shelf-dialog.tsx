import { useEffect, useMemo, useState } from "react";

import { shelfApi } from "@/api/shelves";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import type { ExpiringLot } from "@/types/scrap";
import { shelfLocationText, type Shelf, type ShelfCell } from "@/types/shelf";
import { Modal } from "./scrap-ui";

const selectClass =
  "mb-3 w-full rounded-xl border border-slate-200 p-2 text-sm outline-none focus:border-[#0f4c3a] focus:ring-4 focus:ring-emerald-100";

/**
 * Put a lot on a shelf: "Ke A2 - Tang 3 - O 04".
 *
 * The staff walk the positions that already exist, in the order they read them out loud: the
 * level, then the shelf on that level, then the slot. Every step only offers what the shop
 * really has, so the lot lands on a position the staff set up before.
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
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /** The level, as the staff reads it: "3". */
  const [level, setLevel] = useState(lot.shelfCell ? String(lot.shelfCell.level) : "");
  /** The shelf on that level. */
  const [shelfId, setShelfId] = useState(lot.shelfCell?.shelf.id ?? "");
  /** The slot on that shelf. */
  const [slot, setSlot] = useState(lot.shelfCell ? String(lot.shelfCell.slot) : "");

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

  /**
   * Every position of the shop, flattened. A deleted position holds no goods, so it is left
   * out; the one the lot already sits on stays, so the staff do not lose it.
   */
  const positions = useMemo(() => {
    const rows: Array<{ cell: ShelfCell; shelf: Shelf }> = [];
    for (const shelf of shelves) {
      for (const cell of shelf.cells) {
        if (cell.isActive) rows.push({ cell, shelf });
      }
    }
    return rows;
  }, [shelves]);

  /** The levels the shop already has, lowest first. */
  const levels = useMemo(
    () => [...new Set(positions.map((row) => row.cell.level))].sort((a, b) => a - b),
    [positions],
  );

  /** The shelves that really have a position on the chosen level. */
  const shelvesOnLevel = useMemo(() => {
    const levelNumber = Number(level);
    if (!level) return shelves;
    return shelves.filter((shelf) =>
      shelf.cells.some((cell) => cell.isActive && cell.level === levelNumber),
    );
  }, [shelves, level]);

  /** The slots that really exist on the chosen shelf and level. */
  const slotsOnShelf = useMemo(() => {
    const levelNumber = Number(level);
    const shelf = shelves.find((row) => row.id === shelfId);
    if (!shelf || !level) return [];
    return shelf.cells
      .filter((cell) => cell.isActive && cell.level === levelNumber)
      .sort((a, b) => a.slot - b.slot);
  }, [shelves, shelfId, level]);

  const selected = shelves.find((shelf) => shelf.id === shelfId);

  const submit = async () => {
    if (!level) {
      setError("Hãy chọn tầng.");
      return;
    }
    if (!shelfId) {
      setError("Hãy chọn kệ.");
      return;
    }
    if (!slot) {
      setError("Hãy chọn ô.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await shelfApi.assignLotItem(lot.lotId, lot.id, {
        shelfId,
        level: Number(level),
        slot: Number(slot),
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không gán được ô kệ.");
      setSubmitting(false);
    }
  };

  /** Choosing a level resets what sits on it: the shelf and the slot depend on the level. */
  const changeLevel = (next: string) => {
    setLevel(next);
    setSlot("");
    setShelfId("");
    setError(null);
  };

  /** Choosing a shelf resets the slot, because the slots belong to one shelf. */
  const changeShelf = (next: string) => {
    setShelfId(next);
    setSlot("");
    setError(null);
  };

  return (
    <Modal busy={submitting} onClose={onClose} title="Gán ô kệ cho lô hàng">
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
      ) : levels.length === 0 ? (
        <Alert className="mb-3">
          Cửa hàng chưa có ô kệ nào. Hãy tạo kệ, tầng và ô ở trang{" "}
          <strong>Quản lý kệ, tầng & ô</strong> trước.
        </Alert>
      ) : (
        <>
          <Label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="shelf-level-select">
            Tầng
          </Label>
          <select
            className={selectClass}
            id="shelf-level-select"
            onChange={(event) => changeLevel(event.target.value)}
            value={level}
          >
            <option value="">-- Chọn tầng --</option>
            {levels.map((row) => (
              <option key={row} value={String(row)}>
                Tầng {row}
              </option>
            ))}
          </select>

          <Label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="shelf-select">
            Kệ
          </Label>
          <select
            className={selectClass}
            id="shelf-select"
            onChange={(event) => changeShelf(event.target.value)}
            value={shelfId}
          >
            <option value="">-- Chọn kệ --</option>
            {shelvesOnLevel.map((shelf) => (
              <option key={shelf.id} value={shelf.id}>
                {shelf.code}
                {shelf.name ? ` - ${shelf.name}` : ""}
                {shelf.cells.length > 0 ? ` (${shelf.cells.length} ô)` : ""}
              </option>
            ))}
          </select>

          {level && shelfId && (
            <>
              <Label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="shelf-slot-select">
                Ô
              </Label>
              <select
                className={selectClass}
                id="shelf-slot-select"
                onChange={(event) => {
                  setSlot(event.target.value);
                  setError(null);
                }}
                value={slot}
              >
                <option value="">-- Chọn ô --</option>
                {slotsOnShelf.map((cell) => (
                  <option key={cell.id} value={String(cell.slot)}>
                    Ô {cell.slot}
                    {cell.itemCount > 0 ? ` (${cell.itemCount} lô)` : ""}
                  </option>
                ))}
              </select>
            </>
          )}

          {selected && level && slot ? (
            <p className="mt-3 text-sm text-slate-500">
              Ô kệ: {shelfLocationText({
                id: "",
                level: Number(level),
                slot: Number(slot),
                shelf: { id: selected.id, code: selected.code, name: selected.name },
              })}
            </p>
          ) : null}
        </>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <Button disabled={submitting} onClick={onClose} type="button" variant="outline">
          Hủy
        </Button>
        <Button disabled={submitting || loading} onClick={() => void submit()} type="button">
          {submitting && <Spinner className="h-4 w-4" />}Gán ô kệ
        </Button>
      </div>
    </Modal>
  );
}