import { useState, type FormEvent } from "react";
import { CheckCircle2, Eye, EyeOff, Mail, UserRound } from "lucide-react";
import { Link } from "react-router-dom";

import { Alert } from "@/components/ui/alert";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isStrongPassword } from "@/lib/password-policy";
import { signUpWithEmail } from "@/services/auth.service";

export function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isStrongPassword(password)) {
      setError("Mật khẩu phải từ 12 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await signUpWithEmail(email, password, name);
      setSent(!data.session);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tạo tài khoản.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      eyebrow="TẠO TÀI KHOẢN"
      title={sent ? "Kiểm tra email xác nhận" : "Đăng ký tài khoản doanh nghiệp ABC"}
      description="Khởi tạo nền tảng quản trị bán lẻ và kho FEFO thông minh cho doanh nghiệp của bạn."
    >
      <div className="flex flex-col gap-3.5 w-full">
        {error && <Alert variant="destructive">{error}</Alert>}

        {sent ? (
          <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-emerald-50 border border-emerald-200">
            <CheckCircle2 size={44} className="text-[#0f4c3a] mb-2" />
            <h3 className="text-sm font-bold text-[#0f4c3a]">Email xác nhận đã được gửi!</h3>
            <p className="text-xs text-slate-600 mt-1 mb-4 leading-relaxed">
              Vui lòng kiểm tra hộp thư của bạn ({email}) và nhấp vào liên kết xác nhận để kích hoạt tài khoản.
            </p>
            <Button asChild className="rounded-full bg-[#0f4c3a] hover:bg-[#093226] text-white text-xs px-5 py-2 font-semibold">
              <Link to="/login">Quay lại đăng nhập</Link>
            </Button>
          </div>
        ) : (
          <>
            <form className="flex flex-col gap-3.5" onSubmit={(event) => void submit(event)}>
              {/* Họ và tên */}
              <div className="space-y-1 text-left">
                <label htmlFor="full-name" className="block text-xs font-semibold text-slate-700">
                  Họ và tên người đại diện
                </label>
                <div className="relative">
                  <Input
                    id="full-name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Nguyễn Minh Anh"
                    required
                    className="h-10.5 rounded-lg border-slate-200 bg-slate-50/60 pr-10 text-xs sm:text-sm focus:bg-white focus:border-[#0f4c3a] focus:ring-[#0f4c3a]"
                  />
                  <UserRound className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={17} />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1 text-left">
                <label htmlFor="email" className="block text-xs font-semibold text-slate-700">
                  Email doanh nghiệp
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

              {/* Mật khẩu */}
              <div className="space-y-1 text-left">
                <label htmlFor="password" className="block text-xs font-semibold text-slate-700">
                  Mật khẩu
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={12}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Tối thiểu 12 ký tự (chữ hoa, số, ký tự đặc biệt)"
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
                <p className="text-[10.5px] text-slate-500">Gồm chữ hoa, thường, số và ký hiệu đặc biệt.</p>
              </div>

              {/* Nút Đăng ký đỏ bo tròn full pill */}
              <Button
                type="submit"
                disabled={busy}
                className="w-full rounded-full bg-[#c1121f] hover:bg-[#a10e1a] !text-white font-bold py-2.5 sm:py-3 text-sm sm:text-base shadow-md shadow-red-950/20 active:scale-[0.99] transition-all cursor-pointer mt-1"
              >
                {busy ? "Đang khởi tạo tài khoản…" : "Đăng ký tài khoản"}
              </Button>
            </form>

            {/* Chuyển sang Đăng nhập */}
            <p className="text-center text-xs text-slate-500 mt-1">
              Đã có tài khoản?{" "}
              <Link to="/login" className="text-[#c1121f] font-bold hover:underline">
                Đăng nhập
              </Link>
            </p>
          </>
        )}
      </div>
    </AuthShell>
  );
}
