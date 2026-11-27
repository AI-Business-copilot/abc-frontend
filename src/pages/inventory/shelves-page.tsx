import { useCallback, useEffect, useState } from "react";

import { shelfApi } from "@/api/shelves";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { usePermissions } from "@/hooks/use-permissions";
import { CatalogHeader } from "@/pages/products/catalog-header";
import type { Shelf, ShelfCell } from "@/types/shelf";

/**
 * The shelves of the warehouse.
 *
 * A shelf is a short code the staff say out loud ("A2"). The positions on it - a level and a slot
 * - are created on demand when a lot is put there, so this page lists them; the owner can also
 * create a position up front so the shelf has a known shape before any goods arrive.
 */
export function ShelvesPage() {
  const [keyword, setKeyword] = useState("");
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // The shelf whose position is being added or edited, and the position itself.
  const [cellShelfId, setCellShelfId] = useState<string | null>(null);
  const [editingCellId, setEditingCellId] = useState<string | null>(null);
  const [cellLevel, setCellLevel] = useState("");
  const [cellSlot, setCellSlot] = useState("");
  const [cellError, setCellError] = useState<string | null>(null);
  const [cellSaving, setCellSaving] = useState(false);

  const { can } = usePermissions();
  const canManage = can("inventory.shelf.manage");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setShelves(await shelfApi.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được danh sách kệ.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createShelf = async () => {
    if (!code.trim()) {
      setFormError("Mã kệ là bắt buộc.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await shelfApi.create({ code: code.trim(), name: name.trim() || undefined });
      setCode("");
      setName("");
      setMessage("Đã tạo kệ.");
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Không tạo được kệ.");
    } finally {
      setSaving(false);
    }
  };

  const renameShelf = async (shelf: Shelf) => {
    const next = window.prompt("Tên kệ (để trống để xóa tên):", shelf.name ?? "");
    if (next === null) return;
    try {
      await shelfApi.update(shelf.id, { name: next.trim() });
      setMessage("Đã cập nhật kệ.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không cập nhật được kệ.");
    }
  };

  const retireShelf = async (shelf: Shelf) => {
    if (!window.confirm(`Retire kệ ${shelf.code}? Các lô đang ở kệ này vẫn giữ vị trí.`)) return;
    try {
      await shelfApi.remove(shelf.id);
      setMessage("Đã retire kệ.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không retire được kệ.");
    }
  };

  /**
   * Add a position to a shelf, or move an existing one.
   *
   * The server refuses a position that already exists, so the staff never create a duplicate.
   */
  const saveCell = async (shelf: Shelf) => {
    const level = Number(cellLevel);
    const slot = Number(cellSlot);
    if (!Number.isInteger(level) || level < 1) {
      setCellError("Tầng phải là số nguyên từ 1 trở lên.");
      return;
    }
    if (!Number.isInteger(slot) || slot < 1) {
      setCellError("Ô phải là số nguyên từ 1 trở lên.");
      return;
    }
    setCellSaving(true);
    setCellError(null);
    try {
      if (editingCellId) {
        await shelfApi.updateCell(editingCellId, { level, slot });
        setMessage(`Đã sửa ô kệ thành Tầng ${level} - Ô ${slot}.`);
      } else {
        await shelfApi.createCell(shelf.id, { level, slot });
        setMessage(`Đã thêm ô kệ ${shelf.code} - Tầng ${level} - Ô ${slot}.`);
      }
      setCellLevel("");
      setCellSlot("");
      setEditingCellId(null);
      await load();
    } catch (err) {
      setCellError(err instanceof Error ? err.message : "Không lưu được ô kệ.");
    } finally {
      setCellSaving(false);
    }
  };

  /** Open the form on an existing position, so the staff can move it. */
  const startEditCell = async (shelf: Shelf, cell: ShelfCell) => {
    setCellShelfId(shelf.id);
    setEditingCellId(cell.id);
    setCellLevel(String(cell.level));
    setCellSlot(String(cell.slot));
    setCellError(null);
  };

  /** Retire a position. The lots on it keep their location. */
  const retireCell = async (cell: ShelfCell) => {
    if (!window.confirm(`Retire ô kệ Tầng ${cell.level} - Ô ${cell.slot}?`)) return;
    try {
      await shelfApi.removeCell(cell.id);
      setMessage("Đã retire ô kệ.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không retire được ô kệ.");
    }
  };

  const needle = keyword.trim().toLowerCase();
  const visible = needle
    ? shelves.filter(
        (shelf) =>
          shelf.code.toLowerCase().includes(needle) ||
          (shelf.name ?? "").toLowerCase().includes(needle),
      )
    : shelves;

  return (
    <div className="min-h-screen bg-[#f5f6fa] text-[#101828]">
      <CatalogHeader active="shelves" mode="inventory" keyword={keyword} onKeywordChange={setKeyword} />
      <main className="mx-auto max-w-[1580px] space-y-6 px-5 py-5">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản lý kệ & vị trí kho</h1>
          <p className="mt-1 text-gray-600">
            Mỗi lô hàng nằm ở một vị trí gồm mã kệ, tầng và ô (ví dụ: Kệ A2 - Tầng 3 - Ô 04). Ô kệ
            được tạo tự động khi gán hàng.
          </p>
        </div>

        {message && <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800">{message}</Alert>}
        {error && <Alert className="bg-red-50 border-red-200 text-red-700">{error}</Alert>}

        {canManage && (
          <Card className="p-5">
            <h2 className="text-lg font-semibold text-gray-900">Thêm kệ mới</h2>
            {formError && (
              <Alert className="mt-3 bg-red-50 border-red-200 text-red-700">{formError}</Alert>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-[160px_1fr_auto] sm:items-end">
              <div>
                <Label className="mb-1 block" htmlFor="shelf-code">
                  Mã kệ
                </Label>
                <Input
                  id="shelf-code"
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="A2"
                  value={code}
                />
              </div>
              <div>
                <Label className="mb-1 block" htmlFor="shelf-name">
                  Tên kệ (không bắt buộc)
                </Label>
                <Input
                  id="shelf-name"
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Kệ quay bên trái"
                  value={name}
                />
              </div>
              <Button disabled={saving} onClick={() => void createShelf()}>
                {saving && <Spinner className="h-4 w-4" />}Thêm kệ
              </Button>
            </div>
          </Card>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-lg bg-gray-200 animate-pulse" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-gray-600">
              {shelves.length === 0 ? "Cửa hàng chưa có kệ nào." : "Không có kệ nào khớp tìm kiếm."}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {visible.map((shelf) => (
              <Card key={shelf.id} className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-lg bg-slate-900 px-3 py-1 font-mono text-sm font-bold text-white">
                    {shelf.code}
                  </span>
                  <span className="text-sm text-gray-700">{shelf.name || "(chưa đặt tên)"}</span>
                  <span className="text-xs text-gray-500">
                    {shelf.cells.length} ô · {shelf.itemCount} lô hàng
                  </span>
                  {!shelf.isActive && (
                    <span className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-700">
                      Đã retire
                    </span>
                  )}
                  {canManage && shelf.isActive && (
                    <span className="ml-auto flex gap-2">
                      <Button onClick={() => void renameShelf(shelf)} size="sm" variant="outline">
                        Sửa tên
                      </Button>
                      <Button onClick={() => void retireShelf(shelf)} size="sm" variant="outline">
                        Retire
                      </Button>
                    </span>
                  )}
                </div>

                {shelf.cells.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {shelf.cells.map((cell) => (
                      <span
                        key={cell.id}
                        className={`inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs ${
                          cell.isActive
                            ? "border-slate-200 bg-slate-50 text-slate-700"
                            : "border-slate-200 bg-slate-100 text-slate-400 line-through"
                        }`}
                      >
                        Tầng {cell.level} - Ô {cell.slot}
                        <span className="text-slate-400">({cell.itemCount} lô)</span>
                        {canManage && shelf.isActive && (
                          <span className="flex gap-1">
                            <button
                              className="rounded px-1 text-slate-500 hover:bg-white hover:text-slate-900"
                              onClick={() => void startEditCell(shelf, cell)}
                              title="Sửa vị trí"
                              type="button"
                            >
                              ✎
                            </button>
                            <button
                              className="rounded px-1 text-slate-500 hover:bg-white hover:text-red-600"
                              onClick={() => void retireCell(cell)}
                              title="Retire ô kệ"
                              type="button"
                            >
                              ✕
                            </button>
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                )}

                {canManage && shelf.isActive && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    {cellShelfId === shelf.id ? (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-slate-700">
                          {editingCellId ? "Sửa vị trí ô kệ" : "Thêm ô kệ"}
                        </p>
                        <div className="flex flex-wrap items-end gap-2">
                          <div className="w-28">
                            <Label className="mb-1 block text-xs font-medium text-slate-700" htmlFor={`cell-level-${shelf.id}`}>
                              Tầng
                            </Label>
                            <Input
                              id={`cell-level-${shelf.id}`}
                              inputMode="numeric"
                              min={1}
                              onChange={(event) => setCellLevel(event.target.value)}
                              placeholder="3"
                              type="number"
                              value={cellLevel}
                            />
                          </div>
                          <div className="w-28">
                            <Label className="mb-1 block text-xs font-medium text-slate-700" htmlFor={`cell-slot-${shelf.id}`}>
                              Ô
                            </Label>
                            <Input
                              id={`cell-slot-${shelf.id}`}
                              inputMode="numeric"
                              min={1}
                              onChange={(event) => setCellSlot(event.target.value)}
                              placeholder="4"
                              type="number"
                              value={cellSlot}
                            />
                          </div>
                          <Button
                            disabled={cellSaving}
                            onClick={() => void saveCell(shelf)}
                            size="sm"
                            variant="outline"
                          >
                            {cellSaving && <Spinner className="h-4 w-4" />}
                            {editingCellId ? "Lưu" : "Thêm ô kệ"}
                          </Button>
                          <Button
                            onClick={() => {
                              setCellShelfId(null);
                              setEditingCellId(null);
                              setCellError(null);
                            }}
                            size="sm"
                            variant="outline"
                          >
                            Hủy
                          </Button>
                        </div>
                        {cellError && <p className="text-xs text-red-600">{cellError}</p>}
                      </div>
                    ) : (
                      <Button
                        onClick={() => {
                          setCellShelfId(shelf.id);
                          setEditingCellId(null);
                          setCellLevel("");
                          setCellSlot("");
                          setCellError(null);
                        }}
                        size="sm"
                        variant="outline"
                      >
                        Thêm ô kệ
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
