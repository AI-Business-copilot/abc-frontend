/**
 * Tiện ích xử lý đa ảnh cho sản phẩm và biến thể.
 * Tương thích ngược với cả ảnh đơn URL và mảng ảnh dạng JSON.
 */

export function getPrimaryImage(rawUrl: string | null | undefined): string {
  if (!rawUrl) return "";
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return typeof parsed[0] === "string" ? parsed[0] : "";
      }
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

export function getAllImages(rawUrl: string | null | undefined): string[] {
  if (!rawUrl) return [];
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string" && Boolean(item.trim()));
      }
    } catch {
      return [trimmed];
    }
  }
  return [trimmed];
}

export function serializeImages(images: string[]): string | null {
  const clean = images.map((img) => img.trim()).filter(Boolean);
  if (clean.length === 0) return null;
  if (clean.length === 1) return clean[0];
  return JSON.stringify(clean);
}

