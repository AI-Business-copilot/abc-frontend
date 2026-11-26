
import { Button } from '../../../../components/ui/button';
import { formatAuditDiff, resolveAuditDiff } from '../audit-diff';
import type { AuditStatus, CountAgreement, StockAuditItem, AuditItemStatus } from '../../../../types/audit';

interface AuditItemListProps {
  items: StockAuditItem[];
  loading?: boolean;
  /** The audit's own status, so a row of a draft does not claim to be counting. */
  auditStatus?: AuditStatus;
  onItemClick?: (item: StockAuditItem) => void;
  canEdit?: boolean;
  /** Decides per item whether the action button is shown. Defaults to `canEdit` for every item. */
  canEditItem?: (item: StockAuditItem) => boolean;
  /** Label of the per-item action button. */
  actionLabel?: string;
  /** When set, the whole card is clickable and a "View details" button is shown on every item. */
  onViewDetails?: (item: StockAuditItem) => void;
  /** When set, a delete button is shown on every item. Used for the rows of a draft. */
  onDeleteItem?: (item: StockAuditItem) => void;
}

const statusColorConfig: Record<AuditItemStatus, string> = {
  IN_PROGRESS: 'bg-emerald-50 text-emerald-800',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-green-50 text-green-700',
};

const statusLabelConfig: Record<AuditItemStatus, string> = {
  IN_PROGRESS: 'Đang đếm',
  PENDING_APPROVAL: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
};

export function AuditItemStatusBadge({
  status,
  auditStatus,
}: {
  status: AuditItemStatus;
  /** The audit's own status, so a row of a draft does not claim to be counting. */
  auditStatus?: AuditStatus;
}) {
  const isDraftRow = auditStatus === 'DRAFT' && status === 'IN_PROGRESS';
  if (isDraftRow) {
    return (
      <span className="inline-block px-2 py-1 rounded text-xs font-medium whitespace-nowrap bg-gray-100 text-gray-600">
        Chưa bắt đầu
      </span>
    );
  }
  return (
    <span
      className={`inline-block px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${statusColorConfig[status]}`}
    >
      {statusLabelConfig[status]}
    </span>
  );
}

const agreementConfig: Record<CountAgreement, { label: string; className: string } | null> = {
  SINGLE: null,
  // Nobody has counted yet, so the row is not waiting for anyone in particular.
  NOT_STARTED: null,
  PENDING: {
    label: 'Chờ người còn lại',
    className: 'bg-blue-50 text-blue-700',
  },
  AGREED: {
    label: 'Hai người khớp',
    className: 'bg-emerald-50 text-emerald-700',
  },
  CONFLICT: {
    label: 'Hai người khác nhau',
    className: 'bg-orange-50 text-orange-700',
  },
};

/** Badge telling the owner how the two counters of a row compare. */
export function CountAgreementBadge({ agreement }: { agreement?: CountAgreement }) {
  const config = agreement ? agreementConfig[agreement] : null;
  if (!config) return null;
  return (
    <span
      className={`inline-block px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${config.className}`}
    >
      {config.label}
    </span>
  );
}

export function AuditItemList({
  items,
  loading = false,
  onItemClick,
  canEdit,
  canEditItem,
  actionLabel = 'Sửa',
  onViewDetails,
  onDeleteItem,
}: AuditItemListProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 rounded-md bg-gray-200 animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-md bg-gray-50 p-8 text-center">
        <p className="text-gray-600">Không có dòng kiểm kê nào</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        // A row nobody has counted yet has no number to compare with the snapshot, so it shows a
        // dash instead of a difference that was never measured.
        const diff = resolveAuditDiff(item);
        const hasDiscrepancy = diff !== null && diff !== 0;
        const wasRejected = item.itemStatus === 'IN_PROGRESS' && Boolean(item.rejectionReason);
        // The broken goods are counted separately from the usable quantity; the total is derived.
        const brokenQty = item.countedDamagedQty ?? 0;
        const totalQty = item.countedQty + brokenQty;
        // The row's own broken figure belongs to the first counter, so with two counters the label
        // says which one it belongs to.
        const hasTwoCounters = Boolean(item.secondCounterUserId);

        return (
          <div
            key={item.id}
            role={onViewDetails ? 'button' : undefined}
            tabIndex={onViewDetails ? 0 : undefined}
            onClick={onViewDetails ? () => onViewDetails(item) : undefined}
            onKeyDown={
              onViewDetails
                ? (e) => {
                  if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onViewDetails(item);
                  }
                }
                : undefined
            }
            className={`rounded-lg border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow ${onViewDetails ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0f4c3a]' : ''
              }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900 truncate">{item.productName}</h3>
                  <AuditItemStatusBadge status={item.itemStatus} />
                  <CountAgreementBadge agreement={item.countAgreement} />
                  {wasRejected && (
                    <span className="inline-block px-2 py-1 rounded text-xs font-medium whitespace-nowrap bg-red-50 text-red-700">
                      Bị trả lại
                    </span>
                  )}
                </div>

                <div className="text-xs text-gray-600 mb-2">
                  <span className="font-mono">SKU: {item.sku}</span>
                  {item.attributeText && (
                    <>
                      <span className="mx-2">•</span>
                      <span>{item.attributeText}</span>
                    </>
                  )}
                  {item.lotNumber ? (
                    <>
                      <span className="mx-2">•</span>
                      <span>
                        Lô: {item.lotNumber}
                        {item.expirationDate
                          ? ` (HSD ${new Date(item.expirationDate).toLocaleDateString('vi-VN')})`
                          : ''}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="mx-2">•</span>
                      <span className="text-amber-700">
                        Lô: chưa nhập
                      </span>
                    </>
                  )}
                </div>

                {(item.assignedTo || item.createdBy || item.secondCounter) && (
                  <div className="text-xs text-gray-500 mb-2">
                    {item.assignedTo && <span>Giao cho: {item.assignedTo.name}</span>}
                    {item.secondCounter && (
                      <span>
                        {item.assignedTo && ' • '}
                        Kiểm kê thứ hai: {item.secondCounter.name}
                      </span>
                    )}
                    {item.assignedTo && item.createdBy && <span className="mx-2">•</span>}
                    {item.createdBy && <span>Người tạo: {item.createdBy.name}</span>}
                  </div>
                )}

                {/* The owner compares the two numbers here. A staff member never sees this block,
                    because the backend only sends them their own count. */}
                {item.countAgreement === 'CONFLICT' && item.counts && item.counts.length === 2 && (
                  <div className="mt-2 rounded border border-orange-300 bg-orange-50 px-3 py-2 text-xs text-orange-900">
                    <p className="font-medium mb-1">Hai người kiểm kê có số khác nhau:</p>
                    <ul className="space-y-1">
                      {item.counts.map((count) => (
                        <li key={count.id} className="flex justify-between gap-4">
                          <span>{count.counter?.name ?? 'Nhân viên'}</span>
                          <span className="font-semibold">
                            {count.countedQty + (count.countedDamagedQty ?? 0)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1">Cần kiểm kê lại để chủ cửa hàng quyết định.</p>
                  </div>
                )}

                {/* The row's own reason belongs to the first counter, so every counter's reason is
                    listed here. A staff member only ever sees their own. */}
                {(item.counterDetails ?? [])
                  .filter((detail) => detail.discrepancyReason)
                  .map((detail) => (
                    <div
                      key={detail.counterUserId}
                      className="bg-amber-50 border-l-2 border-amber-400 px-3 py-2 rounded text-xs text-amber-800 mt-2"
                    >
                      <p className="font-medium mb-1">
                        Lý do {detail.counter?.name ?? 'nhân viên'}
                        {detail.countedDamagedQty > 0 && (
                          <span className="font-normal"> · Hàng hỏng: {detail.countedDamagedQty}</span>
                        )}
                      </p>
                      <p className="whitespace-pre-wrap break-words">{detail.discrepancyReason}</p>
                    </div>
                  ))}

                {wasRejected && (
                  <div className="bg-red-50 border-l-2 border-red-400 px-3 py-2 rounded text-xs text-red-800 mt-2">
                    <p className="font-medium mb-1">
                      Bị trả lại{item.rejectedBy ? ` bởi ${item.rejectedBy.name}` : ''}:
                    </p>
                    <p className="whitespace-pre-wrap break-words">{item.rejectionReason}</p>
                  </div>
                )}
              </div>

              <div className="flex-shrink-0 text-right min-w-max">
                <div className="grid gap-4 mb-3 grid-cols-5">
                  <div>
                    <p className="text-xs text-gray-500">Số Lượng hàng trong hệ thống</p>
                    <p className="text-lg font-semibold text-gray-900">{item.snapshotQty}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Số Lượng Hàng Đếm Được</p>
                    <p className="text-lg font-semibold text-gray-900">{item.countedQty}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">
                      Số Lượng Hàng Hỏng
                      {hasTwoCounters && ' (người 1)'}
                    </p>
                    <p className="text-lg font-semibold text-gray-900">{brokenQty}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Tổng số lượng bàn giao</p>
                    <p className="text-lg font-semibold text-gray-900">{totalQty}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Chênh lệch</p>
                    <p
                      className={`text-lg font-semibold ${diff === null ? 'text-gray-400' : hasDiscrepancy ? 'text-red-600' : 'text-green-600'
                        }`}
                    >
                      {formatAuditDiff(diff)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {onViewDetails && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetails(item);
                      }}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      Xem chi tiết
                    </Button>
                  )}
                  {onItemClick && (canEditItem ? canEditItem(item) : canEdit) && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        onItemClick(item);
                      }}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      {actionLabel}
                    </Button>
                  )}
                  {onDeleteItem && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteItem(item);
                      }}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      Xoá dòng
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
