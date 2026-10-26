import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const SUPABASE_CONFIG_MESSAGE =
  "Chưa cấu hình Supabase. Thêm VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY vào abc-frontend/.env rồi khởi động lại dev server.";

/** Ném lỗi rõ ràng thay vì gọi vào URL giả và nhận ERR_NAME_NOT_RESOLVED. */
export function requireSupabaseConfig() {
  if (!supabaseConfigured) {
    throw new Error(SUPABASE_CONFIG_MESSAGE);
  }
}

export const supabase = createClient(
  supabaseUrl || "https://unconfigured.supabase.co",
  supabaseAnonKey || "unconfigured-anon-key",
  {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
      persistSession: true,
    },
  },
);
