import type { ReactNode } from "react";
import { Globe, Mail, Phone } from "lucide-react";
import { Link } from "react-router-dom";

import { supabaseConfigured } from "@/lib/supabase";

interface AuthShellProps {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
}

const ABC_CAPABILITIES = [
  {
    step: "01",
    badgeColor: "bg-[#f59e0b] shadow-amber-500/30",
    offset: "lg:translate-x-2",
    title: "QUẢN TRỊ KHO LÔ DATE (FEFO)",
    desc: "Thuật toán xuất kho ưu tiên cận hạn, ngăn chặn 90% thất thoát hàng quá hạn.",
  },
  {
    step: "02",
    badgeColor: "bg-[#ea580c] shadow-orange-500/30",
    offset: "lg:translate-x-7",
    title: "POS BÁN HÀNG & THU NGÂN",
    desc: "Thao tác tính tiền 3 giây, thanh toán VietQR động và chốt ca tiền mặt chuẩn xác.",
  },
  {
    step: "03",
    badgeColor: "bg-[#10b981] shadow-emerald-500/30",
    offset: "lg:translate-x-11",
    title: "TRỢ LÝ AI COPILOT DỰ BÁO",
    desc: "Phân tích dữ liệu bán lẻ, dự báo sức mua và đề xuất số lượng nhập kho tối ưu.",
  },
  {
    step: "04",
    badgeColor: "bg-[#0d9488] shadow-teal-500/30",
    offset: "lg:translate-x-11",
    title: "ĐỐI SOÁT & MUA HÀNG NCC",
    desc: "Quản trị đơn mua hàng (PO), nhập kho khớp lệnh và kiểm soát 100% công nợ NCC.",
  },
  {
    step: "05",
    badgeColor: "bg-[#8b5cf6] shadow-purple-600/30",
    offset: "lg:translate-x-7",
    title: "KIỂM KÊ KHO & BARCODE",
    desc: "Quét mã vạch kiểm kê tức thì, cân bằng tồn kho không làm gián đoạn bán hàng.",
  },
  {
    step: "06",
    badgeColor: "bg-[#eab308] shadow-yellow-500/30 !text-slate-900",
    offset: "lg:translate-x-2",
    title: "BÁO CÁO P&L THỜI GIAN THỰC",
    desc: "Giám sát doanh thu, biên lãi gộp, chi phí và dòng tiền từng ca làm việc 24/7.",
  },
];

export function AuthShell({ title, children }: AuthShellProps) {
  return (
    <main className="min-h-screen w-full bg-[#06231a] bg-gradient-to-br from-[#0a2e23] via-[#06231a] to-[#03150f] flex items-center justify-center p-3 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      <div className="w-full max-w-[1360px] grid grid-cols-1 lg:grid-cols-12 items-center gap-6 lg:gap-10 relative z-10 my-auto">
        {/* Cột trái: Vòng tròn Trống đồng / HUD công nghệ cao & 6 Module cốt lõi ABC */}
        <section className="hidden lg:flex lg:col-span-7 flex-col justify-center relative min-h-[640px] py-4 select-none">
          {/* Nền SVG vi mạch kỹ thuật số & Trống đồng HUD */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none opacity-45 select-none"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 700 700"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <radialGradient id="circuitGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#06231a" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Vòng hào quang trung tâm */}
            <circle cx="80" cy="350" r="320" fill="url(#circuitGlow)" />

            {/* Các vòng tròn đồng tâm họa tiết HUD / Trống đồng kỹ thuật số */}
            <circle cx="80" cy="350" r="300" fill="none" stroke="#10b981" strokeWidth="1" strokeDasharray="6 8" opacity="0.3" />
            <circle cx="80" cy="350" r="260" fill="none" stroke="#d4af37" strokeWidth="1.5" strokeDasharray="16 8" opacity="0.35" />
            <circle cx="80" cy="350" r="220" fill="none" stroke="#ffffff" strokeWidth="0.75" strokeDasharray="4 4" opacity="0.2" />
            <circle cx="80" cy="350" r="180" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.3" />
            <circle cx="80" cy="350" r="140" fill="none" stroke="#d4af37" strokeWidth="1.5" strokeDasharray="10 5" opacity="0.4" />

            {/* Đường mạch điện tử ngang & góc 45 độ */}
            <path d="M 80 50 L 30 50 L 10 30 L 0 30" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.35" />
            <circle cx="10" cy="30" r="3" fill="#10b981" opacity="0.7" />

            <path d="M 80 650 L 40 650 L 20 670 L 0 670" fill="none" stroke="#d4af37" strokeWidth="1.5" opacity="0.35" />
            <circle cx="20" cy="670" r="3" fill="#d4af37" opacity="0.7" />

            <path d="M 380 350 L 480 350 L 520 390 L 680 390" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.4" />
            <circle cx="520" cy="390" r="3.5" fill="#10b981" opacity="0.8" />
            <circle cx="680" cy="390" r="2.5" fill="#10b981" opacity="0.5" />

            <path d="M 340 180 L 430 180 L 470 140 L 650 140" fill="none" stroke="#d4af37" strokeWidth="1.5" opacity="0.4" />
            <circle cx="470" cy="140" r="3.5" fill="#d4af37" opacity="0.8" />

            <path d="M 340 520 L 420 520 L 460 560 L 640 560" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.4" />
            <circle cx="460" cy="560" r="3.5" fill="#10b981" opacity="0.8" />

            <path d="M 280 90 L 350 90 L 380 60 L 540 60" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.25" />
            <circle cx="380" cy="60" r="3" fill="#ffffff" opacity="0.6" />

            <path d="M 280 610 L 360 610 L 390 640 L 560 640" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.25" />
            <circle cx="390" cy="640" r="3" fill="#ffffff" opacity="0.6" />
          </svg>

          {/* Biểu tượng logo ABC tròn trung tâm trống đồng */}
          <div className="absolute -left-12 xl:left-2 top-1/2 -translate-y-1/2 w-44 h-44 xl:w-52 xl:h-52 rounded-full bg-white shadow-2xl flex flex-col items-center justify-center p-4 border-4 border-emerald-800/40 z-20 shrink-0">
            <span className="text-3xl xl:text-4xl font-black text-[#c1121f] font-sans tracking-tight leading-none">
              ABC
            </span>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-2.5 h-[1.5px] bg-[#0f4c3a]" />
              <span className="text-[8px] xl:text-[9px] font-black text-[#0f4c3a] uppercase tracking-wider">
                AI BUSINESS COPILOT
              </span>
              <span className="w-2.5 h-[1.5px] bg-[#0f4c3a]" />
            </div>
          </div>

          {/* 6 Module / Năng lực cốt lõi uốn lượn hình cánh cung */}
          <div className="flex flex-col gap-4.5 xl:gap-5 pl-36 xl:pl-48 relative z-10 py-5">
            {ABC_CAPABILITIES.map((cap) => (
              <div
                key={cap.step}
                className={`flex items-center gap-3.5 transition-transform duration-300 ${cap.offset}`}
              >
                <div
                  className={`w-11 h-11 xl:w-12 xl:h-12 rounded-full ${cap.badgeColor} font-black text-base xl:text-lg flex items-center justify-center shadow-lg shrink-0 text-white`}
                >
                  {cap.step}
                </div>
                <div className="flex flex-col">
                  <h3 className="text-white font-bold text-xs xl:text-[13.5px] tracking-wide uppercase">
                    {cap.title}
                  </h3>
                  <p className="text-white/80 text-[11px] xl:text-xs leading-snug max-w-[280px] xl:max-w-[340px] mt-0.5">
                    {cap.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Cột phải: Khung Card Trắng bo góc tròn nổi bật */}
        <section className="col-span-1 lg:col-span-5 flex justify-center items-center w-full">
          <div className="w-full max-w-[430px] bg-white rounded-[28px] shadow-2xl shadow-emerald-950/60 p-6 sm:p-7.5 relative z-20 flex flex-col">
            {/* Header Logo ABC */}
            <Link to="/" className="flex flex-col items-center group transition-transform hover:scale-102">
              <span className="text-[32px] font-black tracking-tight text-[#c1121f] font-sans leading-none">
                ABC
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-3 h-[2px] bg-[#0f4c3a]" />
                <span className="text-[8.5px] font-black text-[#0f4c3a] uppercase tracking-wider">
                  AI BUSINESS COPILOT
                </span>
                <span className="w-3 h-[2px] bg-[#0f4c3a]" />
              </div>
            </Link>

            {/* Tiêu đề trang xác thực */}
            <h2 className="text-[15.5px] font-bold text-slate-800 text-center mt-2.5 mb-5 tracking-tight">
              {title}
            </h2>

            {/* Cảnh báo Supabase nếu chưa cấu hình */}
            {!supabaseConfigured && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900" role="alert">
                Chưa cấu hình Supabase: thêm <code>VITE_SUPABASE_URL</code> và{" "}
                <code>VITE_SUPABASE_ANON_KEY</code> vào <code>abc-frontend/.env</code>.
              </div>
            )}

            {/* Nội dung form */}
            <div className="w-full">{children}</div>

            {/* Phân cách LIÊN HỆ HỖ TRỢ */}
            <div className="mt-4 pt-1">
              <div className="relative flex items-center my-3.5">
                <div className="flex-grow border-t border-slate-200" />
                <span className="flex-shrink mx-3 text-[10.5px] font-bold text-slate-400 tracking-wider uppercase">
                  LIÊN HỆ HỖ TRỢ
                </span>
                <div className="flex-grow border-t border-slate-200" />
              </div>

              {/* 3 Nút Pill: Website | Email | Hotline */}
              <div className="flex items-center justify-center gap-2">
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                >
                  <Globe size={13} className="text-slate-500" />
                  <span>Website</span>
                </Link>
                <a
                  href="mailto:hotro@abc-retail.vn"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                >
                  <Mail size={13} className="text-slate-500" />
                  <span>Email</span>
                </a>
                <a
                  href="tel:02873006868"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                >
                  <Phone size={13} className="text-slate-500" />
                  <span>Hotline</span>
                </a>
              </div>

              {/* Số hotline liên hệ trực tiếp */}
              <a
                href="tel:02873006868"
                className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700 mt-3.5 hover:text-[#c1121f] transition-colors"
              >
                <Phone size={13} className="text-slate-600" />
                <span>Hotline:</span>
                <strong className="font-bold text-slate-900">028.7300.6868</strong>
              </a>

              {/* Huy hiệu App Store & Google Play */}
              <div className="flex items-center justify-center gap-2.5 mt-3.5">
                <img
                  src="/assets/images/app_ios.png"
                  alt="Download on the App Store"
                  className="h-8 w-auto object-contain cursor-pointer hover:opacity-90 transition-opacity"
                />
                <img
                  src="/assets/images/app_google.png"
                  alt="GET IT ON Google Play"
                  className="h-8 w-auto object-contain cursor-pointer hover:opacity-90 transition-opacity"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
