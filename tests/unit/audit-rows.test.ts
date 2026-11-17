import { describe, expect, it, vi } from 'vitest';
import { emptyRow, rowsToAssignments, validateRows, type AuditRowDraft } from '@/pages/inventory/audit/audit-rows';

vi.mock('@/api/audit', () => ({ auditApi: {} }));
const row = (overrides: Partial<AuditRowDraft> = {}): AuditRowDraft => ({
  ...emptyRow('staff'),
  product: { id: 'product', name: 'Shirt', imageUrl: null, skuCount: 1, hasLotTracking: true },
  variant: { id: 'sku', sku: 'SKU', productName: 'Shirt', attributeText: '', onHand: 10 },
  lotItemId: 'lot-item', ...overrides,
});

describe('audit assignment rows', () => {
  it('creates independent rows with unique keys', () => {
    const first = emptyRow('staff');
    const second = emptyRow();
    expect(first.key).not.toBe(second.key);
    expect(second.assignedToUserId).toBe('');
    expect(first.product).toBeNull();
    expect(first.variant).toBeNull();
  });
  it('requires at least one row and all assignment selections', () => {
    expect(validateRows([], 'NEW_LOTS')).toBeTruthy();
    for (const incomplete of [{ assignedToUserId: '' }, { product: null }, { variant: null }]) {
      expect(validateRows([row(incomplete)], 'NEW_LOTS')).toBeTruthy();
    }
  });
  it('requires an existing lot for re-audits and allows new lots without one', () => {
    expect(validateRows([row({ lotItemId: '' })], 'RE_AUDIT')).toBeTruthy();
    expect(validateRows([row({ lotItemId: '' })], 'NEW_LOTS')).toBeNull();
    expect(validateRows([row()], 'RE_AUDIT')).toBeNull();
  });
  it('rejects the same SKU and lot assigned to different staff', () => {
    expect(validateRows([row(), row({ assignedToUserId: 'other-staff' })], 'RE_AUDIT')).toBeTruthy();
    expect(validateRows([row(), row({ lotItemId: 'other-lot' })], 'RE_AUDIT')).toBeNull();
  });
  it('sends variant and lot item IDs without leaking UI state', () => {
    expect(rowsToAssignments([row(), row({ lotItemId: '' })])).toEqual([
      { assignedToUserId: 'staff', variantId: 'sku', lotItemId: 'lot-item' },
      { assignedToUserId: 'staff', variantId: 'sku', lotItemId: null },
    ]);
  });
});
