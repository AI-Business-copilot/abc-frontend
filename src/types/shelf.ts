// Types for the warehouse shelves and the positions on them.
// A lot's location is "Ke A2 - Tang 3 - O 04": a shelf, a level on it and a slot on that level.

/** One position on a shelf: a level and a slot. */
export interface ShelfCell {
  id: string;
  /** The level of the cell. Level 1 is the bottom of the shelf. */
  level: number;
  /** The position on that level. */
  slot: number;
  isActive: boolean;
  /** How many lot items sit on this position. */
  itemCount: number;
}

/** A shelf of the warehouse, with the positions it holds. */
export interface Shelf {
  id: string;
  /** The short code the staff say out loud, e.g. "A2". */
  code: string;
  /** A longer name, when the code alone is not enough to tell two shelves apart. */
  name: string | null;
  isActive: boolean;
  cells: ShelfCell[];
  /** How many lot items sit on this shelf, across all its positions. */
  itemCount: number;
}

/** Where a lot item physically sits. */
export interface ShelfCellLocation {
  id: string;
  level: number;
  slot: number;
  shelf: { id: string; code: string; name: string | null };
}

/** The location of a lot, as the staff read it: "Ke A2 - Tang 3 - O 04". */
export function shelfLocationText(location: ShelfCellLocation | null | undefined): string {
  if (!location) return "Chưa gán vị trí";
  return `Kệ ${location.shelf.code} - Tầng ${location.level} - Ô ${location.slot}`;
}
