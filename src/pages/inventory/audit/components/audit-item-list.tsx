
import { Button } from '../../../../components/ui/button';
import type { StockAuditItem, AuditItemStatus } from '../../../../types/audit';

interface AuditItemListProps {
  items: StockAuditItem[];
  loading?: boolean;
  onItemClick?: (item: StockAuditItem) => void;
  canEdit?: boolean;
  /** Decides per item whether the action button is shown. Defaults to `canEdit` for every item. */
  canEditItem?: (item: StockAuditItem) => boolean;
  /** Label of the per-item action button. */
  actionLabel?: string;
  /** When set, the whole card is clickable and a "View details" button is shown on every item. */
  onViewDetails?: (item: StockAuditItem) => void;
}

const statusColorConfig: Record<AuditItemStatus, string> = {
  IN_PROGRESS: 'bg-blue-50 text-blue-700',
  PENDING_APPROVAL: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-green-50 text-green-700',
};

const statusLabelConfig: Record<AuditItemStatus, string> = {
  IN_PROGRESS: 'In Progress',
  PENDING_APPROVAL: 'Pending',
  APPROVED: 'Approved',
};

export function AuditItemStatusBadge({ status }: { status: AuditItemStatus }) {
  return (
    <span
      className={`inline-block px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${statusColorConfig[status]}`}
    >
      {statusLabelConfig[status]}
    </span>
  );
}

export function AuditItemList({
  items,
  loading = false,
  onItemClick,
  canEdit,
  canEditItem,
  actionLabel = 'Edit',
  onViewDetails,
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
        <p className="text-gray-600">No items found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const hasDiscrepancy = item.diffQty !== 0;
        const wasRejected = item.itemStatus === 'IN_PROGRESS' && Boolean(item.rejectionReason);

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
            className={`rounded-lg border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow ${
              onViewDetails ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900 truncate">{item.productName}</h3>
                  <AuditItemStatusBadge status={item.itemStatus} />
                  {wasRejected && (
                    <span className="inline-block px-2 py-1 rounded text-xs font-medium whitespace-nowrap bg-red-50 text-red-700">
                      Sent back
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
                        Lot: {item.lotNumber}
                        {item.expirationDate
                          ? ` (exp ${new Date(item.expirationDate).toLocaleDateString()})`
                          : ''}
                        {item.isNewLot ? ' • new lot' : ''}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="mx-2">•</span>
                      <span className="text-amber-700">
                        Lot: not entered yet
                      </span>
                    </>
                  )}
                </div>

                {(item.assignedTo || item.createdBy) && (
                  <div className="text-xs text-gray-500 mb-2">
                    {item.assignedTo && <span>Assigned to: {item.assignedTo.name}</span>}
                    {item.assignedTo && item.createdBy && <span className="mx-2">•</span>}
                    {item.createdBy && <span>Created by: {item.createdBy.name}</span>}
                  </div>
                )}

                {item.discrepancyReason && (
                  <div className="bg-amber-50 border-l-2 border-amber-400 px-3 py-2 rounded text-xs text-amber-800 mt-2">
                    <p className="font-medium mb-1">Reason:</p>
                    <p>{item.discrepancyReason}</p>
                  </div>
                )}

                {wasRejected && (
                  <div className="bg-red-50 border-l-2 border-red-400 px-3 py-2 rounded text-xs text-red-800 mt-2">
                    <p className="font-medium mb-1">
                      Sent back{item.rejectedBy ? ` by ${item.rejectedBy.name}` : ''}:
                    </p>
                    <p>{item.rejectionReason}</p>
                  </div>
                )}
              </div>

              <div className="flex-shrink-0 text-right min-w-max">
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-500">System</p>
                    <p className="text-lg font-semibold text-gray-900">{item.snapshotQty}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Counted</p>
                    <p className="text-lg font-semibold text-gray-900">{item.countedQty}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Diff</p>
                    <p
                      className={`text-lg font-semibold ${hasDiscrepancy ? 'text-red-600' : 'text-green-600'
                        }`}
                    >
                      {item.diffQty >= 0 ? '+' : ''}
                      {item.diffQty}
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
                      View details
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
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
