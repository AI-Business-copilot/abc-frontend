import { requireSupabaseConfig, supabase } from "@/lib/supabase";
import { apiRequest } from "@/services/api.service";
import type { AuthProfile } from "@/types/auth.types";

const callbackUrl = `${window.location.origin}/auth/callback`;

export function getAuthErrorMessage(
  error: unknown,
  fallback = "Không thể đăng nhập.",
) {
  if (!(error instanceof Error)) return fallback;

  const authError = error as Error & { code?: string };
  switch (authError.code) {
    case "email_not_confirmed":
      return "Email chưa được xác nhận. Hãy mở email xác nhận tài khoản rồi thử đăng nhập lại.";
    case "invalid_credentials":
      return "Email hoặc mật khẩu không đúng.";
    case "user_not_found":
      return "Không tìm thấy tài khoản với email này.";
    case "user_banned":
      return "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.";
    default:
      return error.message || fallback;
  }
}

export async function signInWithGoogle() {
  requireSupabaseConfig();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl,
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });
  if (error) throw error;
}

export async function signInWithEmail(email: string, password: string) {
  requireSupabaseConfig();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw error;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string,
) {
  requireSupabaseConfig();
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      emailRedirectTo: callbackUrl,
      data: { full_name: fullName.trim() },
    },
  });
  if (error) throw error;
  return data;
}

export async function sendPasswordReset(email: string) {
  requireSupabaseConfig();
  const redirectTo = new URL(callbackUrl);
  redirectTo.searchParams.set("mode", "recovery");
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo: redirectTo.toString() },
  );
  if (error) throw error;
}

export async function getApplicationProfile() {
  return apiRequest<AuthProfile>("/auth/me");
}

export async function signOut() {
  requireSupabaseConfig();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function updatePassword(
  newPassword: string,
  currentPassword?: string,
) {
  requireSupabaseConfig();
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
    ...(currentPassword ? { current_password: currentPassword } : {}),
  });
  if (error) throw error;
  return data;
}
