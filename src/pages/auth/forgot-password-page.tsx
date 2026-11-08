import { useState, type FormEvent } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { Link } from "react-router-dom";

import { Alert } from "@/components/ui/alert";
import { AuthShell } from "@/components/layout/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendPasswordReset } from "@/services/auth.service";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể gửi email đặt lại mật khẩu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      eyebrow="KHÔI PHỤC TÀI KHOẢN"
      title={sent ? "Kiểm tra hộp thư của bạn" : "Khôi phục mật khẩu ABC"}
      description={
        sent
          ? "Nếu email có tài khoản, bạn sẽ nhận được hướng dẫn tạo mật khẩu mới."
          : "Nhập email doanh nghiệp của bạn để nhận liên kết khôi phục."
      }
    >
      <div className="flex flex-col gap-3.5 w-full">
        {error && <Alert variant="destructive">{error}</Alert>}

        {!sent ? (
          <form className="flex flex-col gap-3.5" onSubmit={(event) => void submit(event)}>
            <div className="space-y-1 text-left">
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700">
                Email đã đăng ký
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

            <Button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-[#c1121f] hover:bg-[#a10e1a] !text-white font-bold py-2.5 sm:py-3 text-sm sm:text-base shadow-md shadow-red-950/20 active:scale-[0.99] transition-all cursor-pointer mt-1"
            >
              {busy ? "Đang gửi yêu cầu…" : "Gửi liên kết khôi phục"}
            </Button>
          </form>
        ) : (
          <Alert variant="success">Hãy mở email và làm theo hướng dẫn để tạo mật khẩu mới.</Alert>
        )}

        <p className="text-center text-xs text-slate-500 mt-1">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-[#0f4c3a] hover:text-[#c1121f] font-semibold transition-colors">
            <ArrowLeft size={14} /> Quay lại đăng nhập
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
