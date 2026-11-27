import React, { useEffect, useState } from 'react';
import { Button } from '../../../../components/ui/button';
import { Label } from '../../../../components/ui/label';
import { Card } from '../../../../components/ui/card';
import { Spinner } from '../../../../components/ui/spinner';
import { shelfApi } from '../../../../api/shelves';
import { categoriesApi } from '../../../../api/categories';
import type { Shelf } from '../../../../types/shelf';
import type { AuditScopeType, CreateAuditRequest } from '../../../../types/audit';

/** The limit the server enforces on the audit note. */
const MAX_NOTE_LENGTH = 1000;

/**
 * Every category, with the children indented under their parent.
 *
 * The audit covers a parent category together with its children, so the parent is what the owner
 * picks; the children are listed under it to show what it covers.
 */
function flattenCategories(
  items: { id: string; name: string; parentId: string | null; children?: any[] }[],
): { id: string; name: string; parentId: string | null }[] {
  const rows: { id: string; name: string; parentId: string | null }[] = [];
  for (const item of items) {
    rows.push({ id: item.id, name: item.name, parentId: item.parentId });
    for (const child of item.children ?? []) {
      rows.push({ id: child.id, name: `— ${child.name}`, parentId: child.parentId });
    }
  }
  return rows;
}

const SCOPE_OPTIONS: { value: AuditScopeType; label: string; hint: string }[] = [  {
    value: 'FULL_STORE',
    label: 'Toàn cửa hàng',
    hint: 'Chủ tự thêm từng dòng kiểm kê.',
  },
  {
    value: 'CATEGORY',
    label: 'Theo danh mục',
    hint: 'Tự sinh dòng cho mọi lô hàng của danh mục (kèm danh mục con).',
  },
  {
    value: 'SHELF',
    label: 'Theo kệ',
    hint: 'Tự sinh dòng cho mọi lô hàng đang nằm trong ô kệ đã chọn.',
  },
];

interface AuditFormProps {
  onSubmit: (data: CreateAuditRequest) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  submitLabel?: string;
}

/**
 * Audit header: the note and the scope.
 *
 * The scope decides which rows the audit gets. A scoped audit gets its rows from the stock
 * itself, so the owner does not type them one by one; the counters are assigned afterwards on
 * the audit detail page.
 */
export function AuditForm({
  onSubmit,
  loading = false,
  error = null,
  submitLabel = 'Tạo đợt kiểm kê',
}: AuditFormProps) {
  const [note, setNote] = useState('');
  const [scopeType, setScopeType] = useState<AuditScopeType>('FULL_STORE');
  const [categoryId, setCategoryId] = useState('');
  const [shelfCellId, setShelfCellId] = useState('');
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; parentId: string | null }[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);

  // The two pickers are only needed for their scope, so they load when that scope is chosen.
  useEffect(() => {
    if (scopeType === 'SHELF') {
      shelfApi
        .list()
        .then((rows) => setShelves(rows.filter((shelf) => shelf.isActive)))
        .catch(() => setShelves([]));
    }
  }, [scopeType]);

  useEffect(() => {
    if (scopeType === 'CATEGORY') {
      categoriesApi
        .list()
        .then((data) => setCategories(flattenCategories(data.items)))
        .catch(() => setCategories([]));
    }
  }, [scopeType]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLocalError(null);

    if (scopeType === 'CATEGORY' && !categoryId) {
      setLocalError('Hãy chọn danh mục cần kiểm kê.');
      return;
    }
    if (scopeType === 'SHELF' && !shelfCellId) {
      setLocalError('Hãy chọn ô kệ cần kiểm kê.');
      return;
    }

    try {
      await onSubmit({
        note: note.trim() || undefined,
        scopeType,
        ...(scopeType === 'CATEGORY' ? { categoryId } : {}),
        ...(scopeType === 'SHELF' ? { shelfCellId } : {}),
      });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Không tạo được đợt kiểm kê');
    }
  };

  const scopeHint = SCOPE_OPTIONS.find((option) => option.value === scopeType)?.hint;

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {(error || localError) && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200">
            {error || localError}
          </div>
        )}

        <div>
          <Label htmlFor="scope-type" className="font-semibold">
            Phạm vi kiểm kê
          </Label>
          <select
            id="scope-type"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#0f4c3a] focus:outline-none focus:ring-1 focus:ring-[#0f4c3a] disabled:bg-gray-100"
            disabled={loading}
            onChange={(event) => setScopeType(event.target.value as AuditScopeType)}
            value={scopeType}
          >
            {SCOPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {scopeHint && <p className="mt-1 text-xs text-gray-500">{scopeHint}</p>}
        </div>

        {scopeType === 'CATEGORY' && (
          <div>
            <Label htmlFor="scope-category" className="font-semibold">
              Danh mục
            </Label>
            <select
              id="scope-category"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#0f4c3a] focus:outline-none focus:ring-1 focus:ring-[#0f4c3a] disabled:bg-gray-100"
              disabled={loading}
              onChange={(event) => setCategoryId(event.target.value)}
              value={categoryId}
            >
              <option value="">-- Chọn danh mục --</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {scopeType === 'SHELF' && (
          <div>
            <Label htmlFor="scope-shelf-cell" className="font-semibold">
              Ô kệ
            </Label>
            <select
              id="scope-shelf-cell"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#0f4c3a] focus:outline-none focus:ring-1 focus:ring-[#0f4c3a] disabled:bg-gray-100"
              disabled={loading}
              onChange={(event) => setShelfCellId(event.target.value)}
              value={shelfCellId}
            >
              <option value="">-- Chọn ô kệ --</option>
              {shelves.flatMap((shelf) =>
                shelf.cells
                  // A deleted position holds no goods, so it cannot be audited.
                  .filter((cell) => cell.isActive)
                  .map((cell) => (
                    <option key={cell.id} value={cell.id}>
                      Kệ {shelf.code} - Tầng {cell.level} - Ô {cell.slot}
                    </option>
                  )),
              )}
            </select>
            {shelves.length > 0 && shelves.every((shelf) => shelf.cells.length === 0) && (
              <p className="mt-1 text-xs text-gray-500">
                Chưa có ô kệ nào. Ô kệ được tạo tự động khi bạn gán hàng vào kệ.
              </p>
            )}
          </div>
        )}

        <div>
          <Label htmlFor="note" className="font-semibold">
            Ghi chú (không bắt buộc)
          </Label>
          <textarea
            id="note"
            placeholder="Ví dụ: kiểm kê định kỳ hàng tháng"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={loading}
            maxLength={MAX_NOTE_LENGTH}
            rows={3}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#0f4c3a] focus:outline-none focus:ring-1 focus:ring-[#0f4c3a] disabled:bg-gray-100 resize-none"
          />
          <p className="mt-1 text-right text-xs text-gray-500">
            {note.length} / {MAX_NOTE_LENGTH}
          </p>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2"
        >
          {loading && <Spinner className="h-4 w-4" />}
          {submitLabel}
        </Button>
      </form>
    </Card>
  );
}
