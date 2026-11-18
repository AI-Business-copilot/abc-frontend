import { apiJson } from "@/lib/api-client";

/**
 * Tiện ích tải ảnh trực tiếp lên Supabase Storage bucket "SEP" thông qua API Backend
 * Tránh lưu base64 gây nặng CSDL và nghẽn băng thông.
 */
export async function uploadImageToStorage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const res = await apiJson<{ url: string }>("/upload", {
          method: "POST",
          body: JSON.stringify({
            base64,
            filename: file.name,
            contentType: file.type || "image/jpeg",
          }),
        });
        if (res && res.url) {
          resolve(res.url);
          return;
        }
      } catch (err) {
        console.warn("Backend upload failed, fallback to data url:", err);
      }
      // Fallback
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

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

