import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Alert } from '../../../components/ui/alert';
import { Spinner } from '../../../components/ui/spinner';
import { ItemCounter } from './components/item-counter';
import { DiscrepancyForm } from './components/discrepancy-form';
import { LotSection, type LotSelection } from './components/lot-section';
import { CatalogHeader } from '../../products/catalog-header';
import { auditApi } from '../../../api/audit';
import { useAudit } from './hooks/use-audit';
import type { AuditType, StockAuditItem } from '../../../types/audit';

/** Counts one audit item. Opened from the "Count" button on an item in the audit detail page. */
export function AuditCountPage() {
  const { auditId } = useParams<{ auditId: string }>();
  const [searchParams] = useSearchParams();
  const itemId = searchParams.get('itemId');
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');

  const [item, setItem] = useState<StockAuditItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [countedQty, setCountedQty] = useState(0);
  const [systemQty, setSystemQty] = useState(0);
  const [lotSelection, setLotSelection] = useState<LotSelection | undefined>(undefined);
  const [discrepancyReason, setDiscrepancyReason] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // The audit type decides what the employee may do with the lot: a re-audit keeps the owner's lot fixed.
  const { audit } = useAudit(auditId);
  const auditType: AuditType =
    audit?.auditType ?? (item?.lotMode === 'EXISTING' ? 'RE_AUDIT' : 'NEW_LOTS');

  const backToAudit = (message?: string) =>
    navigate(`/inventory/audit/${auditId}`, message ? { state: { message } } : undefined);

  useEffect(() => {
    if (!auditId || !itemId) {
      setLoading(false);
      setLoadError('Chưa chọn dòng kiểm kê. Hãy mở một dòng trong đợt kiểm kê và bấm Đếm.');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const loaded = await auditApi.getAuditItem(auditId, itemId);
        if (cancelled) return;
        setItem(loaded);
        setCountedQty(loaded.countedQty);
        setSystemQty(loaded.snapshotQty);
        setLotSelection(undefined);
        setDiscrepancyReason(loaded.discrepancyReason || null);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Không tải được dòng kiểm kê');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [auditId, itemId]);

  const handleLotChange = (selection: LotSelection, qty: number) => {
    setLotSelection(selection);
    setSystemQty(qty);
  };

  /** Save the count and lot choice. Returns false (and shows an error) when validation fails. */
  const saveCurrent = async (): Promise<boolean> => {
    if (!item || !auditId) return false;

    if (!discrepancyReason || !discrepancyReason.trim()) {
      setSubmitError('Vui lòng nhập lý do chênh lệch.');
      return false;
    }

    const updated = await auditApi.updateCount(auditId, item.id, {
      countedQty,
      discrepancyReason,
      ...lotSelection,
    });
    setItem(updated);
    return true;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSubmitError(null);
      if (!(await saveCurrent())) return;
      backToAudit(`${item?.sku} đã được lưu`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Không lưu được dòng kiểm kê');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!item || !auditId) return;
    try {
      setSaving(true);
      setSubmitError(null);
      // Save first so the chosen lot and count are what gets submitted
      if (!(await saveCurrent())) return;
      await auditApi.submitAuditItem(auditId, item.id);
      backToAudit(`${item.sku} đã được gửi duyệt`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Không gửi duyệt được dòng kiểm kê');
    } finally {
      setSaving(false);
    }
  };

  const editable = item?.itemStatus === 'IN_PROGRESS';

  return (
    <div className="min-h-screen bg-[#f5f6fa] text-[#101828]">
      <CatalogHeader active="products" mode="inventory" keyword={keyword} onKeywordChange={setKeyword} />
      <main className="mx-auto max-w-[1580px] space-y-6 px-5 py-5">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => backToAudit()}>
          ← Quay lại kiểm kê
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Đếm hàng</h1>
          <p className="text-gray-600 mt-1">Ghi nhận số lượng thực đếm cho dòng kiểm kê này</p>
        </div>
      </div>

      {loadError && (
        <Alert className="bg-red-50 border-red-200 text-red-700">{loadError}</Alert>
      )}

      {submitError && (
        <Alert className="bg-red-50 border-red-200 text-red-700">{submitError}</Alert>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      )}

      {item && !loading && (
        <Card className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{item.productName}</h2>
            <p className="text-gray-600">SKU: {item.sku}</p>
            {item.attributeText && <p className="text-gray-600">{item.attributeText}</p>}
          </div>

          {editable && item.rejectionReason && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-900">
                Bị trả lại để đếm lại{item.rejectedBy ? ` bởi ${item.rejectedBy.name}` : ''}
              </p>
              <p className="text-sm text-red-800 mt-1 whitespace-pre-wrap">{item.rejectionReason}</p>
            </div>
          )}

          {!editable && (
            <Alert className="mb-4 bg-amber-50 border-amber-200 text-amber-800">
              Dòng kiểm kê không còn ở trạng thái đang thực hiện nên không thể sửa.
            </Alert>
          )}

          <div className="space-y-6 bg-gray-50 p-6 rounded-lg">
            <LotSection
              item={item}
              auditType={auditType}
              disabled={saving || !editable}
              onChange={handleLotChange}
            />

            <ItemCounter
              snapshotQty={systemQty}
              initialCountedQty={countedQty}
              onCountChange={setCountedQty}
              disabled={saving || !editable}
            />

            <DiscrepancyForm
              diffQty={countedQty - systemQty}
              initialReason={discrepancyReason}
              onReasonChange={setDiscrepancyReason}
              disabled={saving || !editable}
            />
          </div>

          {editable && (
            <div className="flex gap-3 mt-6">
              <Button onClick={() => backToAudit()} variant="outline" disabled={saving}>
                Hủy
              </Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? 'Đang lưu...' : 'Lưu'}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Gửi duyệt
              </Button>
            </div>
          )}
        </Card>
      )}

      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
        <p className="font-semibold mb-2">Hướng dẫn kiểm kê:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Đếm số lượng thực tế trên kệ</li>
          <li>Mọi dòng kiểm kê đều phải nhập lý do</li>
          <li>Có thể lưu và quay lại trước khi gửi duyệt</li>
          <li>Sau khi gửi, chủ cửa hàng sẽ xem và phê duyệt</li>
        </ul>
      </div>
      </main>
    </div>
  );
}
