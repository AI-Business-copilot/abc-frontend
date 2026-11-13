import { useEffect, useState } from 'react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Spinner } from '../../../../components/ui/spinner';
import { auditApi, type BusinessMember } from '../../../../api/audit';
import { productWizardApi } from '../../../../api/product-wizard';
import { productsListApi } from '../../../../api/products-list';
import { getPrimaryImage } from '../../../../lib/image-utils';
import { Icon } from '../../../products/ui-icon';
import type {
  AuditProductOption,
  AuditType,
  VariantLot,
  VariantOption,
} from '../../../../types/audit';
import { scrapStatusText } from '../../../../types/scrap';
import { emptyRow, type AuditRowDraft } from '../audit-rows';

const selectClass =
  'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#0f4c3a] focus:outline-none focus:ring-1 focus:ring-[#0f4c3a] disabled:bg-gray-100';

const formatDate = (value: string | Date) => new Date(value).toLocaleDateString('vi-VN');

/** Small square thumbnail of a product, with a placeholder when it has no image. */
function ProductThumb({ imageUrl, name }: { imageUrl: string | null; name: string }) {
  const src = getPrimaryImage(imageUrl);
  if (!src) {
    return (
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-gray-100 text-gray-400">
        <Icon name="inventory_2" className="text-[22px]" />
      </span>
    );
  }
  return (
    <img
      alt={name}
      className="h-10 w-10 shrink-0 rounded-md border border-gray-200 object-cover"
      loading="lazy"
      src={src}
    />
  );
}

interface RowProductSelectProps {
  value: AuditProductOption | null;
  onChange: (product: AuditProductOption | null) => void;
  disabled?: boolean;
}

/** Step 1 of the row picker: the owner picks a product, with its thumbnail for recognition. */
function RowProductSelect({ value, onChange, disabled }: RowProductSelectProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AuditProductOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const { data } = await productsListApi.list({ q: query, status: 'active', pageSize: 60 });
        if (cancelled) return;
        setResults(
          data.items.map((item) => ({
            id: item.id,
            name: item.name,
            imageUrl: item.imageUrl,
            skuCount: item.skus.length,
            hasLotTracking: item.hasLotTracking,
          })),
        );
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
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
        <div className="flex min-w-0 items-center gap-2">
          <ProductThumb imageUrl={value.imageUrl} name={value.name} />
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-900">{value.name}</p>
            <p className="truncate text-xs text-gray-500">{value.skuCount} SKU</p>
          </div>
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
        placeholder="Tìm theo tên hoặc mã sản phẩm"
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
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {loading ? (
            <div className="flex justify-center py-3">
              <Spinner className="h-4 w-4" />
            </div>
          ) : results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-gray-500">Không tìm thấy sản phẩm</p>
          ) : (
            results.map((product) => (
              <button
                key={product.id}
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-emerald-50"
                onClick={() => {
                  onChange(product);
                  setOpen(false);
                }}
              >
                <ProductThumb imageUrl={product.imageUrl} name={product.name} />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-gray-900">{product.name}</span>
                  <span className="block truncate text-xs text-gray-500">{product.skuCount} SKU</span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface RowSkuSelectProps {
  productId: string;
  value: VariantOption | null;
  onChange: (variant: VariantOption | null) => void;
  disabled?: boolean;
}

/** Step 2 of the row picker: the SKUs of the chosen product. */
function RowSkuSelect({ productId, value, onChange, disabled }: RowSkuSelectProps) {
  const [skus, setSkus] = useState<VariantOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setFailed(false);
        const detail = await productWizardApi.getTemplate(productId);
        if (cancelled) return;
        setSkus(
          detail.productVariants
            .filter((variant) => variant.isActive !== false)
            .map((variant) => ({
              id: variant.id,
              sku: variant.sku,
              productName: detail.name,
              // Same " · " join the backend uses for the attribute text.
              attributeText: variant.variantAttributeValues
                .map((entry) => entry.attributeValue.value)
                .join(' · '),
              onHand: (variant.inventoryBalances ?? []).reduce(
                (sum, balance) => sum + Number(balance.quantityOnHand ?? 0),
                0,
              ),
              imageUrl: detail.imageUrl,
              productId: detail.id,
            })),
        );
      } catch {
        if (!cancelled) {
          setSkus([]);
          setFailed(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (loading) {
    return (
      <div className="mt-1 flex justify-center py-2">
        <Spinner className="h-4 w-4" />
      </div>
    );
  }

  if (failed) {
    return <p className="mt-1 text-xs text-red-600">Không tải được danh sách SKU của sản phẩm này.</p>;
  }

  if (skus.length === 0) {
    return <p className="mt-1 text-xs text-gray-600">Sản phẩm này chưa có SKU nào.</p>;
  }

  return (
    <select
      value={value?.id ?? ''}
      disabled={disabled}
      onChange={(e) => onChange(skus.find((sku) => sku.id === e.target.value) ?? null)}
      className={selectClass}
    >
      <option value="" disabled>
        Chọn SKU
      </option>
      {skus.map((sku) => (
        <option key={sku.id} value={sku.id}>
          {sku.sku}
          {sku.attributeText ? ` • ${sku.attributeText}` : ''} • tồn {sku.onHand}
        </option>
      ))}
    </select>
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
            <Label className="text-xs font-medium">
              Sản phẩm <span className="text-red-600">*</span>
            </Label>
            <RowProductSelect
              value={row.product}
              disabled={disabled}
              // A new product means the old SKU and lot no longer belong to this row.
              onChange={(product) => updateRow(row.key, { product, variant: null, lotItemId: '' })}
            />
          </div>

          {row.product && (
            <div>
              <Label className="text-xs font-medium">
                SKU <span className="text-red-600">*</span>
              </Label>
              <RowSkuSelect
                productId={row.product.id}
                value={row.variant}
                disabled={disabled}
                // A new SKU means the old lot no longer belongs to this row.
                onChange={(variant) => updateRow(row.key, { variant, lotItemId: '' })}
              />
            </div>
          )}

          {row.variant && auditType === 'RE_AUDIT' && (
            <div>
              <Label className="text-xs font-medium">
                Lô có sẵn <span className="text-red-600">*</span>
              </Label>
              {row.product && !row.product.hasLotTracking ? (
                <p className="mt-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-1 text-xs text-amber-800">
                  Sản phẩm này không quản lý lô nên không thể kiểm kê lại. Hãy dùng kiểm kê lô mới.
                </p>
              ) : (
                <>
                  <RowLotSelect
                    variantId={row.variant.id}
                    lotItemId={row.lotItemId}
                    disabled={disabled}
                    onChange={(lotItemId) => updateRow(row.key, { lotItemId })}
                  />
                  <p className="mt-1 text-xs text-gray-600">
                    Nhân viên không thể đổi lô này khi đếm. Họ vẫn có thể sửa ngày của lô và nhập số đếm.
                  </p>
                </>
              )}
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
