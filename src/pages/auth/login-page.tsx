import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, Mail } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { Alert } from "@/components/ui/alert";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AUTH_NOTICE_EVENT, consumeAuthNotice, SESSION_EXPIRED_MESSAGE } from "@/lib/api-client";
import {
  getAuthErrorMessage,
  signInWithEmail,
  signInWithGoogle,
} from "@/services/auth.service";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(() =>
    searchParams.get("session") === "expired"
      ? SESSION_EXPIRED_MESSAGE
      : consumeAuthNotice(),
  );

  useEffect(() => {
    const pending = consumeAuthNotice();
    if (pending) setError(pending);

    const onNotice = (event: Event) => {
      const message = (event as CustomEvent<string>).detail;
      if (message) setError(message);
    };
    window.addEventListener(AUTH_NOTICE_EVENT, onNotice);
    return () => window.removeEventListener(AUTH_NOTICE_EVENT, onNotice);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signInWithEmail(email, password);
      navigate("/auth/callback", { replace: true });
    } catch (reason) {
      setError(getAuthErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  async function googleLogin() {
    setBusy(true);
    setError("");
    try {
      await signInWithGoogle();
    } catch (reason) {
      setError(getAuthErrorMessage(reason, "Không thể đăng nhập với Google."));
      setBusy(false);
    }
  }

  return (
    <AuthShell
      eyebrow="CHÀO MỪNG BẠN TRỞ LẠI"
      title="Đăng nhập cổng khách hàng ABC"
      description="Đăng nhập để tiếp tục quản lý cửa hàng và đội ngũ của bạn."
    >
      <div className="flex flex-col gap-3.5 w-full">
        {error && <Alert variant="destructive">{error}</Alert>}

        <form className="flex flex-col gap-3.5" onSubmit={(event) => void submit(event)}>
          {/* Trường Email */}
          <div className="space-y-1 text-left">
            <label htmlFor="email" className="block text-xs font-semibold text-slate-700">
              Email
            </label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@company.com"
                required
                className="h-10.5 rounded-lg border-slate-200 bg-slate-50/60 pr-10 text-xs sm:text-sm focus:bg-white focus:border-[#0f4c3a] focus:ring-[#0f4c3a]"
              />
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={17} />
            </div>
          </div>

          {/* Trường Mật khẩu */}
          <div className="space-y-1 text-left">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700">
                Mật khẩu
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-[#0f4c3a] hover:text-[#c1121f] transition-colors"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Nhập mật khẩu"
                required
                className="h-10.5 rounded-lg border-slate-200 bg-slate-50/60 pr-10 text-xs sm:text-sm focus:bg-white focus:border-[#0f4c3a] focus:ring-[#0f4c3a]"
              />
              <button
                type="button"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                onClick={() => setShowPassword((val) => !val)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Nút Đăng nhập đỏ bo tròn full pill */}
          <Button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-[#c1121f] hover:bg-[#a10e1a] !text-white font-bold py-2.5 sm:py-3 text-sm sm:text-base shadow-md shadow-red-950/20 active:scale-[0.99] transition-all cursor-pointer mt-1"
          >
            {busy ? "Đang đăng nhập…" : "Đăng nhập"}
          </Button>
        </form>

        {/* Nút Đăng nhập Google phụ */}
        <button
          type="button"
          disabled={busy}
          onClick={() => void googleLogin()}
          className="w-full rounded-full border border-slate-200 hover:bg-slate-50 py-2.5 flex items-center justify-center gap-2 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
        >
          <GoogleMark />
          <span>Tiếp tục với Google</span>
        </button>

        {/* Chuyển sang Đăng ký */}
        <p className="text-center text-xs text-slate-500 mt-1">
          Chưa có tài khoản?{" "}
          <Link to="/signup" className="text-[#c1121f] font-bold hover:underline">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" height="17" viewBox="0 0 48 48" width="17">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(0 4)" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.9c-.58 2.96-2.25 5.48-4.72 7.18l7.63 5.92c4.45-4.1 7.17-10.14 7.17-17.57Z" transform="translate(0 0)" />
      <path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.2a23.9 23.9 0 0 0 0 21.58l7.98-6.2Z" transform="translate(0 4)" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.63-5.92c-2.12 1.42-4.83 2.26-8.27 2.26-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.2C6.51 42.62 14.62 48 24 48Z" transform="translate(0 0)" />
    </svg>
  );
}
