import { apiRequest } from "@/services/api.service";
import type { Shelf, ShelfCell, ShelfCellLocation } from "@/types/shelf";

const base = "/inventory/shelves";

export const shelfApi = {
  /** Every shelf of the business, with the positions it holds. */
  list() {
    return apiRequest<Shelf[]>(base);
  },

  create(body: { code: string; name?: string }) {
    return apiRequest<Shelf>(base, { method: "POST", body: JSON.stringify(body) });
  },

  update(id: string, body: { code?: string; name?: string }) {
    return apiRequest<Shelf>(`${base}/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  },

  /** Retire a shelf. The shelf is not deleted, so the lots on it keep their location. */
  remove(id: string) {
    return apiRequest<void>(`${base}/${id}`, { method: "DELETE" });
  },

  /** Create a position on a shelf. It is created on demand too, when a lot is put on it. */
  createCell(id: string, body: { level: number; slot: number }) {
    return apiRequest<ShelfCell>(`${base}/${id}/cells`, { method: "POST", body: JSON.stringify(body) });
  },

  /** Move a position to another level and slot on the same shelf. */
  updateCell(cellId: string, body: { level: number; slot: number }) {
    return apiRequest<ShelfCell>(`${base}/cells/${cellId}`, { method: "PATCH", body: JSON.stringify(body) });
  },

  /** Retire a position. The lot items on it keep their location. */
  removeCell(cellId: string) {
    return apiRequest<void>(`${base}/cells/${cellId}`, { method: "DELETE" });
  },

  /** Put a lot item on a shelf. The position is created when it does not exist yet. */
  assignLotItem(lotId: string, lotItemId: string, body: { shelfId: string; level: number; slot: number }) {
    return apiRequest<{ id: string; shelfCell: ShelfCellLocation }>(
      `/inventory/lots/${lotId}/items/${lotItemId}/shelf`,
      { method: "PATCH", body: JSON.stringify(body) },
    );
  },
};
