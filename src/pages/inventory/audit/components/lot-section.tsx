import { useEffect, useState } from 'react';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Spinner } from '../../../../components/ui/spinner';
import { auditApi } from '../../../../api/audit';
import type { StockAuditItem, UpdateAuditItemRequest, VariantLot } from '../../../../types/audit';

const NEW_LOT = '__new__';

export type LotSelection = Pick<
  UpdateAuditItemRequest,
  'lotId' | 'newLotNumber' | 'newLotExpirationDate' | 'newLotManufacturingDate'
>;

const toDateInput = (value?: string | Date | null) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

interface LotSectionProps {
  item: StockAuditItem;
  disabled?: boolean;
  /** Called whenever the chosen lot changes. `systemQty` is the quantity on hand for that lot. */
  onChange: (selection: LotSelection, systemQty: number) => void;
}

/**
 * Lot section for the count page. The dropdown always offers "New lot" first (the default) followed by the
 * lots that already exist for the SKU:
 * - New lot: the employee types the number and expiry. The lot is created when the audit is applied.
 * - Existing lot: the number is autofilled; the employee can correct the dates. The lot is updated when
 *   the audit is applied.
 * If the owner already attached an existing lot to the item, that lot is preselected.
 */
export function LotSection({ item, disabled, onChange }: LotSectionProps) {
  const [lots, setLots] = useState<VariantLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [choice, setChoice] = useState<string>(item.lotId ?? NEW_LOT);
  const [newNumber, setNewNumber] = useState(item.lotId ? '' : item.lotNumber ?? '');
  const [newExpiry, setNewExpiry] = useState(item.lotId ? '' : toDateInput(item.expirationDate));
  const [newMfg, setNewMfg] = useState(item.lotId ? '' : toDateInput(item.newLotManufacturingDate));
  // Existing lot: dates the employee can correct. Start from the item (their earlier correction, or the lot's dates).
  const [lotExpiry, setLotExpiry] = useState(item.lotId ? toDateInput(item.expirationDate) : '');
  const [lotMfg, setLotMfg] = useState(item.lotId ? toDateInput(item.manufacturingDate) : '');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await auditApi.getLots(item.variantId);
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
  }, [item.variantId]);

  const selectedLot = lots.find((lot) => lot.id === choice);

  const emitNew = (number: string, expiry: string, mfg: string) => {
    onChange(
      {
        lotId: null,
        newLotNumber: number.trim() || null,
        newLotExpirationDate: expiry || null,
        newLotManufacturingDate: mfg || null,
      },
      0
    );
  };

  const handleChoice = (value: string) => {
    setChoice(value);
    if (value === NEW_LOT) {
      emitNew(newNumber, newExpiry, newMfg);
      return;
    }
    const lot = lots.find((l) => l.id === value);
    if (lot) {
      // A different lot: show that lot's own dates. The server fills in the lot number.
      const expiry = toDateInput(lot.expirationDate);
      const mfg = toDateInput(lot.manufacturingDate);
      setLotExpiry(expiry);
      setLotMfg(mfg);
      onChange({ lotId: lot.id }, lot.onHand);
    }
  };

  /** Existing lot: send the dates along with the lot id. The server stores only what differs from the lot. */
  const emitExisting = (lot: VariantLot, expiry: string, mfg: string) => {
    onChange(
      {
        lotId: lot.id,
        newLotExpirationDate: expiry || null,
        newLotManufacturingDate: mfg || null,
      },
      lot.onHand
    );
  };

  const expiryChanged =
    Boolean(selectedLot) && lotExpiry !== '' && lotExpiry !== toDateInput(selectedLot?.expirationDate);
  const mfgChanged =
    Boolean(selectedLot) && lotMfg !== '' && lotMfg !== toDateInput(selectedLot?.manufacturingDate);
  const dateOrderInvalid = Boolean(lotExpiry && lotMfg && lotMfg > lotExpiry);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Spinner className="h-4 w-4" /> Loading lots...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="lot-choice" className="text-sm font-medium">
          Lot
        </Label>
        <select
          id="lot-choice"
          value={choice}
          disabled={true}
          onChange={(e) => handleChoice(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
        >
          <option value={NEW_LOT}>New lot</option>
          {lots.map((lot) => (
            <option key={lot.id} value={lot.id}>
              {lot.lotNumber} • exp {new Date(lot.expirationDate).toLocaleDateString()} • on hand{' '}
              {lot.onHand}
            </option>
          ))}
        </select>
      </div>

      {selectedLot && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <Label className="text-xs font-medium">Lot number</Label>
              <Input value={selectedLot.lotNumber} readOnly disabled className="mt-1 bg-gray-100" />
            </div>
            <div>
              <Label htmlFor="lot-expiry" className="text-xs font-medium">
                Expiration date <span className="text-red-600">*</span>
              </Label>
              <Input
                id="lot-expiry"
                type="date"
                value={lotExpiry}
                disabled={disabled}
                onChange={(e) => {
                  setLotExpiry(e.target.value);
                  emitExisting(selectedLot, e.target.value, lotMfg);
                }}
                className="mt-1"
              />
              {expiryChanged && (
                <p className="mt-1 text-xs text-amber-700">
                  System: {toDateInput(selectedLot.expirationDate)}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="lot-mfg" className="text-xs font-medium">
                Manufacturing date
              </Label>
              <Input
                id="lot-mfg"
                type="date"
                value={lotMfg}
                disabled={disabled}
                onChange={(e) => {
                  setLotMfg(e.target.value);
                  emitExisting(selectedLot, lotExpiry, e.target.value);
                }}
                className="mt-1"
              />
              {mfgChanged && (
                <p className="mt-1 text-xs text-amber-700">
                  System: {toDateInput(selectedLot.manufacturingDate) || 'not set'}
                </p>
              )}
            </div>
          </div>
          {(expiryChanged || mfgChanged) && !dateOrderInvalid && (
            <p className="text-xs text-amber-800">
              The lot's date will be corrected when the owner applies the audit.
            </p>
          )}
          {dateOrderInvalid && (
            <p className="text-xs text-red-600">
              The manufacturing date cannot be after the expiration date.
            </p>
          )}
        </div>
      )}

      {choice === NEW_LOT && (
        <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-800">
            This is a new lot that is not in the system yet. It will be created when the owner applies the audit.
          </p>
          <div>
            <Label htmlFor="new-lot-number" className="text-xs font-medium">
              Lot number <span className="text-red-600">*</span>
            </Label>
            <Input
              id="new-lot-number"
              value={newNumber}
              disabled={disabled}
              maxLength={100}
              onChange={(e) => {
                setNewNumber(e.target.value);
                emitNew(e.target.value, newExpiry, newMfg);
              }}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="new-lot-expiry" className="text-xs font-medium">
                Expiration date <span className="text-red-600">*</span>
              </Label>
              <Input
                id="new-lot-expiry"
                type="date"
                value={newExpiry}
                disabled={disabled}
                onChange={(e) => {
                  setNewExpiry(e.target.value);
                  emitNew(newNumber, e.target.value, newMfg);
                }}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="new-lot-mfg" className="text-xs font-medium">
                Manufacturing date (optional)
              </Label>
              <Input
                id="new-lot-mfg"
                type="date"
                value={newMfg}
                disabled={disabled}
                onChange={(e) => {
                  setNewMfg(e.target.value);
                  emitNew(newNumber, newExpiry, e.target.value);
                }}
                className="mt-1"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
