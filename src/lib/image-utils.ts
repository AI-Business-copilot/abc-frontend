import { supabase, supabaseConfigured } from "@/lib/supabase";

/**
 * Tiện ích tải ảnh trực tiếp lên Supabase Storage bucket "SEP"
 * Tránh lưu base64 gây nặng CSDL và nghẽn băng thông.
 */
export async function uploadImageToStorage(file: File): Promise<string> {
  const bucket = "SEP";
  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filePath = `products/${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${cleanName}`;

  if (supabaseConfigured) {
    try {
      const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (!error && data) {
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
        if (urlData?.publicUrl) {
          return urlData.publicUrl;
        }
      } else if (error) {
        console.warn("Lỗi upload Supabase bucket SEP:", error.message);
      }
    } catch (err) {
      console.warn("Không thể kết nối Supabase Storage:", err);
    }
  }

  // Fallback tạm nếu chưa kết nối được storage
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
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

