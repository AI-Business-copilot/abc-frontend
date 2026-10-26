import type { ReactNode } from "react";
import { ArrowUpRight, ChartNoAxesCombined, ShieldCheck, Sparkles } from "lucide-react";

import { Brand } from "@/components/layout/brand";
import { supabaseConfigured } from "@/lib/supabase";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-page">
      <div className="auth-shell">
        <section className="auth-visual">
          <Brand />
          <div className="visual-copy">
            <span className="eyebrow light"><Sparkles size={14} /> VẬN HÀNH CỬA HÀNG TỰ TIN HƠN</span>
            <h1>Ra quyết định<br />tốt hơn, mỗi ngày.</h1>
            <p>
              Quản lý cửa hàng rõ ràng hơn và đưa ra quyết định phù hợp với tình hình kinh doanh.
            </p>
            <div className="visual-stat">
              <span className="stat-icon"><ChartNoAxesCombined size={18} /></span>
              <span>              <strong>Chủ động trong từng quyết định</strong><small>Nắm bắt hoạt động cửa hàng mỗi ngày.</small></span>
              <ArrowUpRight className="stat-arrow" size={17} />
            </div>
          </div>
          <div className="visual-footer"><ShieldCheck size={15} /> Đăng nhập an toàn, bảo vệ thông tin của bạn</div>
          <div className="visual-orbit orbit-one" />
          <div className="visual-orbit orbit-two" />
        </section>
        <section className="auth-content">
          <div className="auth-mobile-brand"><Brand /></div>
          <div className="auth-form-wrap">
            {!supabaseConfigured && (
              <p className="auth-config-warning" role="alert">
                Chưa cấu hình Supabase: thêm <code>VITE_SUPABASE_URL</code> và{" "}
                <code>VITE_SUPABASE_ANON_KEY</code> vào{" "}
                <code>abc-frontend/.env</code> rồi khởi động lại dev server.
              </p>
            )}
            <div className="auth-heading">
              <span className="eyebrow">{eyebrow}</span>
              <h2>{title}</h2>
              <p>{description}</p>
            </div>
            {children}
            <p className="auth-legal">
              Thông tin tài khoản của bạn được bảo vệ và chỉ dùng để cung cấp dịch vụ ABC Copilot.
            </p>
          </div>
          <span className="auth-orb" aria-hidden="true" />
        </section>
      </div>
    </main>
  );
}
