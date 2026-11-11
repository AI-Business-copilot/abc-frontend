import { useEffect, useState } from 'react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Spinner } from '../../../../components/ui/spinner';
import { auditApi, type BusinessMember } from '../../../../api/audit';
import type { AuditType, VariantLot, VariantOption } from '../../../../types/audit';
import { scrapStatusText } from '../../../../types/scrap';
import { emptyRow, type AuditRowDraft } from '../audit-rows';

const selectClass =
  'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0f4c3a] focus:outline-none focus:ring-1 focus:ring-[#0f4c3a] disabled:bg-gray-100';

const formatDate = (value: string | Date) => new Date(value).toLocaleDateString('vi-VN');

interface VariantSearchProps {
  value: VariantOption | null;
  onChange: (variant: VariantOption | null) => void;
  disabled?: boolean;
}

/** Search-as-you-type SKU picker backed by GET /inventory/variants?search=. */
function VariantSearch({ value, onChange, disabled }: VariantSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<VariantOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const data = await auditApi.searchVariants(query, 10);
        if (!cancelled) setResults(data.items);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open]);

  if (value) {
    return (
      <div className="mt-1 flex items-center justify-between gap-2 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm">
        <div className="min-w-0">
          <p className="truncate font-medium text-gray-900">{value.productName}</p>
          <p className="truncate font-mono text-xs text-gray-500">
            {value.sku}
            {value.attributeText ? ` • ${value.attributeText}` : ''}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => {
            onChange(null);
            setQuery('');
          }}
        >
          Đổi
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        type="text"
        placeholder="Tìm theo SKU hoặc tên sản phẩm"
        value={query}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        className="mt-1"
      />
      {open && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {searching ? (
            <div className="flex justify-center py-3">
              <Spinner className="h-4 w-4" />
            </div>
          ) : results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-gray-500">Không tìm thấy SKU</p>
          ) : (
            results.map((variant) => (
              <button
                key={variant.id}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-emerald-50"
                onClick={() => {
                  onChange(variant);
                  setOpen(false);
                }}
              >
                <span className="block truncate font-medium text-gray-900">{variant.productName}</span>
                <span className="block truncate font-mono text-xs text-gray-500">
                  {variant.sku}
                  {variant.attributeText ? ` • ${variant.attributeText}` : ''}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface RowLotSelectProps {
  variantId: string;
  lotItemId: string;
  onChange: (lotItemId: string) => void;
  disabled?: boolean;
}

/** Required lot picker for a re-audit. A chosen lot shows its number and expiry read-only. */
function RowLotSelect({ variantId, lotItemId, onChange, disabled }: RowLotSelectProps) {
  const [lots, setLots] = useState<VariantLot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await auditApi.getLots(variantId);
        if (!cancelled) setLots(data.items);
      } catch {
        if (!cancelled) setLots([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [variantId]);

  const selected = lots.find((lot) => lot.id === lotItemId);

  return (
    <div>
      <select
        value={lotItemId}
        disabled={disabled || loading}
        onChange={(e) => onChange(e.target.value)}
        className={selectClass}
      >
        <option value="" disabled>
          Chọn lô
        </option>
        {lots.map((lot) => {
          const blocked = lot.hasOpenScrapOrder || lot.isScrapped;
          return (
            <option key={lot.id} value={lot.id} disabled={blocked}>
              {lot.lotNumber} • HSD {formatDate(lot.expirationDate)} • tồn {lot.onHand}
              {lot.isScrapped
                ? ' — đã bị hủy hàng'
                : lot.hasOpenScrapOrder
                  ? ` — đang có phiếu hủy ${lot.scrapOrder?.scrapCode ?? ''} (${scrapStatusText(lot.scrapOrder?.status)})`
                  : ''}
            </option>
          );
        })}
      </select>
      {selected?.isScrapped && (
        <p className="mt-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-1 text-xs text-amber-800">
          Lô {selected.lotNumber} đã bị hủy hàng nên không thể kiểm kê.
        </p>
      )}
      {selected?.hasOpenScrapOrder && (
        <p className="mt-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-1 text-xs text-amber-800">
          Lô {selected.lotNumber} đang có phiếu hủy {selected.scrapOrder?.scrapCode ?? ''} (
          {scrapStatusText(selected.scrapOrder?.status)}). Lô đang có phiếu hủy chưa xong xuất thì không
          thể đưa vào đợt kiểm kê.
        </p>
      )}
      {selected && !selected.isScrapped && !selected.hasOpenScrapOrder && (
        <p className="mt-1 text-xs text-gray-600">
          Số lô <span className="font-mono">{selected.lotNumber}</span> và hạn sử dụng{' '}
          {formatDate(selected.expirationDate)} được điền tự động.
        </p>
      )}
    </div>
  );
}

interface AuditRowEditorProps {
  rows: AuditRowDraft[];
  onChange: (rows: AuditRowDraft[]) => void;
  members: BusinessMember[];
  auditType: AuditType;
  disabled?: boolean;
}

export function AuditRowEditor({ rows, onChange, members, auditType, disabled }: AuditRowEditorProps) {
  const updateRow = (key: string, patch: Partial<AuditRowDraft>) => {
    onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const removeRow = (key: string) => {
    onChange(rows.filter((row) => row.key !== key));
  };

  // A new row starts with the same employee as the previous one, which speeds up data entry.
  const addRow = () => {
    onChange([...rows, emptyRow(rows[rows.length - 1]?.assignedToUserId ?? '')]);
  };

  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={row.key} className="space-y-3 rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Dòng {index + 1}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => removeRow(row.key)}
            >
              Xóa
            </Button>
          </div>

          <div>
            <Label className="text-xs font-medium">Nhân viên</Label>
            <select
              value={row.assignedToUserId}
              disabled={disabled}
              onChange={(e) => updateRow(row.key, { assignedToUserId: e.target.value })}
              className={selectClass}
            >
              <option value="">Chọn nhân viên</option>
              {members.map((member) => (
                <option key={member.user.id} value={member.user.id}>
                  {member.user.fullName} ({member.user.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs font-medium">SKU</Label>
            <VariantSearch
              value={row.variant}
              disabled={disabled}
              onChange={(variant) => updateRow(row.key, { variant, lotItemId: '' })}
            />
          </div>

          {row.variant && auditType === 'RE_AUDIT' && (
            <div>
              <Label className="text-xs font-medium">
                Lô có sẵn <span className="text-red-600">*</span>
              </Label>
              <RowLotSelect
                variantId={row.variant.id}
                lotItemId={row.lotItemId}
                disabled={disabled}
                onChange={(lotItemId) => updateRow(row.key, { lotItemId })}
              />
              <p className="mt-1 text-xs text-gray-600">
                Nhân viên không thể đổi lô này khi đếm. Họ vẫn có thể sửa ngày của lô và nhập số đếm.
              </p>
            </div>
          )}

          {row.variant && auditType === 'NEW_LOTS' && (
            <p className="text-xs text-gray-600">
              Lô mới: nhân viên nhập số lô và hạn sử dụng khi đếm.
            </p>
          )}
        </div>
      ))}

      <Button type="button" variant="outline" disabled={disabled} onClick={addRow}>
        + Thêm dòng
      </Button>
    </div>
  );
}
