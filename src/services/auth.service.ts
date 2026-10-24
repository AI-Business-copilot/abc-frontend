import { supabase } from "@/lib/supabase";
import { apiRequest } from "@/services/api.service";
import type { AuthProfile } from "@/types/auth.types";

const callbackUrl = `${window.location.origin}/auth/callback`;

export async function signInWithGoogle() {
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
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function updatePassword(
  newPassword: string,
  currentPassword?: string,
) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
    ...(currentPassword ? { current_password: currentPassword } : {}),
  });
  if (error) throw error;
  return data;
}
