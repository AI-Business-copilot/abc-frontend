import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  BarChart3,
  Bot,
  Boxes,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Globe,
  Headphones,
  Info,
  Layers,
  Mail,
  Mic,
  Package,
  Phone,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  Target,
  TrendingUp,
  Truck,
  Users,
  Zap,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";

export function HomePage() {
  const { session, profile } = useAuth();
  const destination = session ? (profile?.onboardingRequired ? "/onboarding" : "/app") : "/signup";

  // State tra cứu tính năng / module
  const [searchQuery, setSearchQuery] = useState("");
  const [featureSlideIndex, setFeatureSlideIndex] = useState(0);
  const [searchResult, setSearchResult] = useState<{
    found: boolean;
    title: string;
    category: string;
    highlight: string;
    desc: string;
  } | null>(null);

  // Danh sách các năng lực cốt lõi trong slider hero
  const featurePills = [
    { code: "FEFO", label: "Kho Lô Date (FEFO)", desc: "Xuất kho ưu tiên cận date, giảm hủy hàng" },
    { code: "POS", label: "POS Bán Hàng", desc: "Thu ngân 3 giây, VietQR động & tiền mặt" },
    { code: "AI", label: "Trợ Lý AI Copilot", desc: "Dự báo nhu cầu & cảnh báo đọng vốn" },
    { code: "PO", label: "Đối Soát NCC", desc: "Quản lý đơn mua hàng, công nợ chính xác" },
    { code: "AUDIT", label: "Kiểm Kê Barcode", desc: "Quét mã cân bằng kho không gián đoạn" },
    { code: "P&L", label: "Báo Cáo P&L", desc: "Doanh thu, lãi gộp & dòng tiền tức thời" },
    { code: "RBAC", label: "Phân Quyền Ca", desc: "Chốt ca, bàn giao tiền và kiểm soát gian lận" },
    { code: "CHAIN", label: "Chuỗi Đa Chi Nhánh", desc: "Điều chuyển kho & đồng bộ tập trung" },
  ];

  // State Bảng giá giải pháp Tabs
  const [pricingTab, setPricingTab] = useState<"vip" | "enterprise" | "pro" | "standard" | "personal">("pro");

  // State Danh mục Module nghiệp vụ
  const [moduleCategory, setModuleCategory] = useState<"all" | "basic" | "popular" | "advanced">("all");

  const handleFeatureSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    const q = searchQuery.trim().toLowerCase();
    if (q.includes("date") || q.includes("fefo") || q.includes("lô") || q.includes("hạn") || q.includes("hsd")) {
      setSearchResult({
        found: true,
        title: "Module Quản Lý Kho Lô & Hạn Sử Dụng (FEFO)",
        category: "Kho Chuyên Sâu",
        highlight: "Tự động cảnh báo cận date 3 mức độ & ưu tiên xuất lô cận hạn trước.",
        desc: "Hỗ trợ theo dõi chi tiết EXP/MFG theo từng đợt nhập, in mã vạch và báo cáo xuất hủy minh bạch.",
      });
    } else if (q.includes("pos") || q.includes("bán") || q.includes("thu ngân") || q.includes("hóa đơn") || q.includes("qr")) {
      setSearchResult({
        found: true,
        title: "Module POS Bán Hàng & Thu Ngân Đa Phương Thức",
        category: "Bán Hàng Tại Quầy",
        highlight: "Thao tác thanh toán cực nhanh dưới 3 giây, tích hợp VietQR động.",
        desc: "Hỗ trợ mở/đóng ca bán hàng, bàn giao tiền mặt chặt chẽ và tích điểm thành viên tự động.",
      });
    } else if (q.includes("ai") || q.includes("dự báo") || q.includes("copilot") || q.includes("thông minh")) {
      setSearchResult({
        found: true,
        title: "Module Trợ Lý Phân Tích AI Copilot",
        category: "Trí Tuệ Nhân Tạo",
        highlight: "Dự báo lượng hàng bán và gợi ý số lượng nhập kho tối ưu.",
        desc: "Phân tích tự động biến động doanh thu, nhận diện sản phẩm bán chạy và cảnh báo nguy cơ ứ đọng vốn.",
      });
    } else if (q.includes("kiểm kê") || q.includes("tồn") || q.includes("barcode") || q.includes("mã vạch")) {
      setSearchResult({
        found: true,
        title: "Module Kiểm Kê Kho & Cân Bằng Tồn Kho",
        category: "Kiểm Soát Tồn",
        highlight: "Kiểm kê bằng máy quét mã vạch không làm gián đoạn bán hàng.",
        desc: "Tự động tạo phiếu cân bằng kho, phân loại hao hụt theo nguyên nhân và theo dõi lịch sử kiểm kê.",
      });
    } else {
      setSearchResult({
        found: true,
        title: `Phân hệ giải pháp cho: "${searchQuery}"`,
        category: "Hệ Thống ABC",
        highlight: "Tích hợp sẵn trong nền tảng Quản trị Bán lẻ & Kho Lô Date ABC.",
        desc: "Khám phá các phân hệ POS bán hàng, quản lý kho FEFO, quản lý mua hàng và trợ lý AI phân tích.",
      });
    }
  };

  const nextFeaturePills = () => {
    setFeatureSlideIndex((prev) => (prev + 1) % (featurePills.length - 2));
  };

  const prevFeaturePills = () => {
    setFeatureSlideIndex((prev) => (prev - 1 + (featurePills.length - 2)) % (featurePills.length - 2));
  };

  return (
    <div
      id="nina-wrapper"
      className="min-h-screen w-full bg-[#f6f8f7] text-[#24332c] font-['Fz_Poppins',sans-serif] text-[14px] antialiased selection:bg-[#0f4c3a] selection:text-white"
      style={{
        fontFamily: "var(--font-Poppins, 'Fz Poppins', sans-serif)",
        fontSize: "14px",
      }}
    >
      {/* 1. TOP HEADER - TONE XANH THÔNG (EVERGREEN PINE) VỚI ĐIỂM NHẤN VÀNG KIM */}
      <div
        id="nina-top-header"
        className="w-full py-2 px-4 sm:px-8 xl:px-12 text-white text-[13px] border-b border-white/10"
        style={{
          backgroundColor: "#0f4c3a",
          position: "relative",
          zIndex: 61,
        }}
      >
        <div className="w-full flex items-center justify-between flex-wrap gap-2 text-white">
          {/* Cột trái: Hotline | Hỗ Trợ Kỹ Thuật | Email */}
          <div className="flex items-center gap-3.5 flex-wrap text-white">
            <span className="flex items-center gap-1.5">
              <Phone size={13} className="text-[#d4af37]" />
              <span>
                Hotline Tư Vấn: <strong className="font-semibold tracking-wide text-white">028.7300.6868</strong>
              </span>
            </span>
            <span className="text-white/30">|</span>
            <span className="flex items-center gap-1.5">
              <Headphones size={13} className="text-[#d4af37]" />
              <span>
                Hỗ Trợ Kỹ Thuật 24/7: <strong className="font-semibold tracking-wide text-white">028.7300.6869</strong>
              </span>
            </span>
            <span className="text-white/30">|</span>
            <span className="flex items-center gap-1.5">
              <Mail size={13} className="text-[#d4af37]" />
              <span>
                Email: <a href="mailto:hotro@abc-retail.vn" className="hover:text-[#d4af37] underline-offset-2 hover:underline">hotro@abc-retail.vn</a>
              </span>
            </span>
          </div>

          {/* Cột phải: Giới thiệu | Hướng dẫn | Dùng thử | Gửi yêu cầu tư vấn */}
          <div className="flex items-center gap-3 text-white text-[13px]">
            <a href="#gioi-thieu" className="hover:text-[#d4af37] flex items-center gap-1 transition-colors">
              <Globe size={12} /> Giới thiệu
            </a>
            <span className="text-white/30">|</span>
            <a href="#huong-dan" className="hover:text-[#d4af37] flex items-center gap-1 transition-colors">
              <Info size={12} /> Hướng dẫn
            </a>
            <span className="text-white/30">|</span>
            <a href="#tinh-nang" className="hover:text-[#d4af37] flex items-center gap-1 transition-colors">
              <Sparkles size={12} className="text-[#d4af37]" /> Phân hệ FEFO & POS
            </a>
            <span className="text-white/30">|</span>
            <a
              href="#lien-he"
              className="hover:!text-[#fef08a] flex items-center gap-1 font-semibold text-[#fef08a] transition-colors"
            >
              <Target size={12} /> Yêu cầu tư vấn
            </a>
          </div>
        </div>
      </div>

      {/* 2. MAIN NAVBAR - CHUẨN FORM CHỮ THƯƠNG HIỆU ABC & MENU NGHIỆP VỤ */}
      <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md shadow-xs border-b border-emerald-950/10">
        <div className="w-full px-4 sm:px-8 xl:px-12 h-[76px] flex items-center justify-between gap-4">
          {/* Logo ABC - AI BUSINESS COPILOT */}
          <Link to="/" className="shrink-0 flex items-center gap-2 group">
            <div className="flex flex-col items-center">
              <span className="text-[32px] font-black tracking-tight text-[#c1121f] font-sans leading-none group-hover:scale-102 transition-transform">
                ABC
              </span>
              <div className="flex items-center gap-1 mt-1">
                <span className="w-3 h-[2px] bg-[#0f4c3a]" />
                <span className="text-[8.5px] font-black text-[#0f4c3a] uppercase tracking-wider">
                  AI BUSINESS COPILOT
                </span>
                <span className="w-3 h-[2px] bg-[#0f4c3a]" />
              </div>
            </div>
          </Link>

          {/* Menu chính */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8 text-[14.5px] font-medium text-[#1e293b]">
            <div className="relative group py-2">
              <a href="#tinh-nang" className="hover:text-[#0f4c3a] transition-colors flex items-center gap-1">
                Giải Pháp & Module <ChevronDown size={14} className="text-slate-500 group-hover:rotate-180 transition-transform" />
              </a>
              <div className="absolute top-full left-0 w-64 bg-white shadow-xl rounded-b-xl border border-emerald-100 py-2 hidden group-hover:block z-50 font-normal">
                <a href="#kho-fefo" className="block px-4 py-2 hover:bg-emerald-50 hover:text-[#0f4c3a] text-[13px] font-medium">
                  Quản lý Kho Lô HSD & FEFO
                </a>
                <a href="#pos-ban-hang" className="block px-4 py-2 hover:bg-emerald-50 hover:text-[#0f4c3a] text-[13px] font-medium">
                  POS Thu Ngân & Ca Bán Hàng
                </a>
                <a href="#ai-copilot" className="block px-4 py-2 hover:bg-emerald-50 hover:text-[#0f4c3a] text-[13px] font-medium">
                  Trợ Lý AI Dự Báo Nhu Cầu
                </a>
                <a href="#doi-soat-ncc" className="block px-4 py-2 hover:bg-emerald-50 hover:text-[#0f4c3a] text-[13px] font-medium">
                  Mua Hàng & Đối Soát NCC
                </a>
                <a href="#kiem-ke" className="block px-4 py-2 hover:bg-emerald-50 hover:text-[#0f4c3a] text-[13px] font-medium">
                  Kiểm Kê Kho & Mã Vạch
                </a>
              </div>
            </div>

            <a href="#kho-fefo" className="hover:text-[#0f4c3a] transition-colors">Kho FEFO</a>
            <a href="#pos-ban-hang" className="hover:text-[#0f4c3a] transition-colors">POS Thu Ngân</a>
            <a href="#ai-copilot" className="hover:text-[#0f4c3a] transition-colors">AI Copilot</a>
            <a href="#hosting" className="hover:text-[#0f4c3a] transition-colors">Bảng Giá Giải Pháp</a>
            <a href="#uu-diem" className="hover:text-[#0f4c3a] transition-colors">Ưu Điểm Vượt Trội</a>
            <a href="#quy-trinh" className="hover:text-[#0f4c3a] transition-colors">Quy Trình Triển Khai</a>
            <a href="#lien-he" className="hover:text-[#0f4c3a] transition-colors">Liên Hệ</a>
          </nav>

          {/* Nút Đăng Nhập / Vào Hệ Thống (Chữ trắng 100% kể cả hover) */}
          <div className="shrink-0 flex items-center gap-2">
            {session ? (
              <Link
                to={destination}
                className="rounded-lg border border-[#0f4c3a] bg-[#0f4c3a] !text-white px-5 py-2 text-[14px] font-medium hover:bg-[#165b4c] hover:!text-white transition-all shadow-sm"
              >
                Vào Hệ Thống ({profile?.user?.fullName || "Bảng điều khiển"})
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="rounded-lg border border-slate-300 bg-white text-slate-800 px-5 py-2 text-[14px] font-medium hover:border-[#0f4c3a] hover:text-[#0f4c3a] transition-all shadow-2xs"
                >
                  Đăng Nhập
                </Link>
                <Link
                  to="/signup"
                  className="hidden sm:inline-flex rounded-lg bg-[#c1121f] !text-white hover:!text-white px-5 py-2 text-[14px] font-semibold hover:bg-[#991b1b] transition-all shadow-sm shadow-red-900/20"
                >
                  Đăng Ký
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 3. HERO SECTION - CẤU TRÚC 2 CỘT NGUYÊN BẢN CỦA GIAO DIỆN CŨ (#nina-slider) */}
      <section
        id="nina-slider"
        className="relative overflow-hidden w-full border-b border-emerald-950/10 min-h-[calc(100vh-165px)] flex items-center"
        style={{
          background: "linear-gradient(135deg, #f4f8f6 0%, #edf5f0 50%, #e6f0ea 100%)",
        }}
      >
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#0f4c3a_1px,transparent_1px)] [background-size:24px_24px]" />

        <div className="w-full px-4 sm:px-8 xl:px-12 relative z-10 py-10 lg:py-0">
          <div className="flex-slide">
            {/* CỘT TRÁI: TRA CỨU GIẢI PHÁP & NĂNG LỰC HỆ THỐNG ABC */}
            <div className="col-l flex flex-col items-center">
              <div className="text-center w-full max-w-[540px]">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 text-[#0f4c3a] text-[12px] font-bold uppercase tracking-wider mb-2">
                  <Sparkles size={12} className="text-[#c1121f]" />
                  Hệ Thống Quản Trị Bán Lẻ & Kho FEFO
                </div>
                <h1 className="text-[32px] sm:text-[38px] font-black text-[#0f4c3a] leading-tight">
                  Tra Cứu Tính Năng & Giải Pháp
                </h1>
                <p className="mt-2 text-[15px] text-[#4b5563] font-normal">
                  Kiểm soát kho theo Lô Hạn Sử Dụng (FEFO), tối ưu hóa bán hàng POS và trợ lý AI thông minh
                </p>
              </div>

              {/* Ô TÌM KIẾM TO HÌNH CHỮ NHẬT BO GÓC */}
              <form onSubmit={handleFeatureSearch} className="mt-7 w-full max-w-[540px]">
                <div className="flex items-stretch rounded-xl bg-white shadow-md shadow-emerald-950/10 border border-emerald-900/15 overflow-hidden h-[54px]">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Nhập tính năng cần tra cứu: Lô HSD, FEFO, POS, Báo cáo P&L..."
                    className="flex-1 px-5 text-[15px] outline-hidden text-slate-800 placeholder:text-slate-400 font-normal bg-white"
                  />
                  <div className="flex items-center px-2 bg-white text-slate-400 hover:text-[#0f4c3a] transition-colors cursor-pointer">
                    <Mic size={20} />
                  </div>
                  <button
                    type="submit"
                    className="bg-[#c1121f] hover:bg-[#991b1b] !text-white hover:!text-white px-8 font-bold text-[16px] tracking-wide transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-sm"
                  >
                    Tra Cứu
                  </button>
                </div>

                {/* Băng chuyền năng lực cốt lõi */}
                <div className="mt-5 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={prevFeaturePills}
                    aria-label="Previous"
                    className="text-slate-400 hover:text-[#0f4c3a] p-1 cursor-pointer transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <div className="flex items-center gap-2 overflow-hidden">
                    {featurePills.slice(featureSlideIndex, featureSlideIndex + 3).map((pill) => (
                      <div
                        key={pill.code}
                        onClick={() => {
                          setSearchQuery(pill.label);
                          handleFeatureSearch();
                        }}
                        className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full border border-emerald-900/15 shadow-2xs text-[13px] cursor-pointer hover:border-[#0f4c3a] hover:shadow-xs transition-all"
                      >
                        <span className="font-semibold text-slate-700">{pill.label}</span>
                        <span className="w-4 h-4 rounded-full bg-[#c1121f] text-white grid place-items-center shrink-0 text-[9px] font-black">
                          ✓
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={nextFeaturePills}
                    aria-label="Next"
                    className="text-slate-400 hover:text-[#0f4c3a] p-1 cursor-pointer transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                {/* Kết quả kiểm tra */}
                {searchResult && (
                  <div className="mt-4 p-4 rounded-xl border border-emerald-200 bg-white shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 size={18} className="text-emerald-700 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-slate-900 text-[14.5px]">
                            {searchResult.title}
                          </div>
                          <div className="text-[12.5px] text-[#c1121f] font-semibold mt-0.5">
                            {searchResult.highlight}
                          </div>
                          <p className="text-[12px] text-slate-500 mt-1 leading-snug">
                            {searchResult.desc}
                          </p>
                        </div>
                      </div>
                      <Link
                        to="/signup"
                        className="rounded-md bg-[#0f4c3a] hover:bg-[#165b4c] !text-white hover:!text-white px-3.5 py-1.5 text-[12px] font-bold shrink-0 transition-colors shadow-xs"
                      >
                        Dùng thử
                      </Link>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* CỘT PHẢI: HỆ THỐNG VẬN HÀNH ĐA MÔ HÌNH BÁN LẺ */}
            <div className="w-full lg:w-auto flex-1 flex flex-col">
              <div className="part-head flex items-center gap-5 justify-center">
                <div className="shrink-0 hidden xl:flex w-20 h-20 rounded-2xl bg-gradient-to-br from-[#0f4c3a] to-[#165b4c] text-white items-center justify-center shadow-lg shadow-emerald-950/20 border-2 border-[#d4af37]">
                  <Boxes size={40} className="text-[#fef08a]" />
                </div>

                <div className="info flex flex-col items-center">
                  <h2 className="text-[28px] sm:text-[34px] font-black text-[#0f4c3a] uppercase tracking-tight leading-none text-center">
                    HỆ THỐNG VẬN HÀNH ĐA KÊNH
                  </h2>
                  <p className="text-[14px] text-[#4b5563] mt-2 font-normal text-center">
                    Quản trị tập trung - Kiểm soát kho FEFO - Tối ưu hóa chuỗi bán lẻ
                  </p>

                  <div className="r3 mt-4 flex items-center gap-3">
                    <a
                      href="#kho-fefo"
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white border border-slate-200 text-[13px] font-semibold text-slate-700 shadow-2xs hover:border-[#0f4c3a] hover:text-[#0f4c3a] transition-all"
                    >
                      <Sparkles size={14} className="text-[#c1121f]" />
                      <span>Khám phá tính năng</span>
                      <ChevronRight size={14} />
                    </a>

                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 text-[13px] font-semibold text-slate-700 shadow-2xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Hệ thống ổn định 99.99%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* LƯỚI 6 THẺ NGÀNH NGHỀ BÁN LẺ */}
              <div className="grid-nganh mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 w-full">
                {/* 1. Mỹ Phẩm & Chăm Sóc Sắc Đẹp */}
                <a href="#kho-fefo" className="nganh-1 group bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-[#0f4c3a] hover:shadow-md transition-all flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-emerald-50 text-[#0f4c3a] grid place-items-center shrink-0">
                      <Package size={22} />
                    </div>
                    <div>
                      <h3 className="text-[14.5px] font-bold leading-tight text-[#0f4c3a]">
                        Mỹ Phẩm &amp; Skincare
                      </h3>
                      <div className="text-[11.5px] text-slate-500 mt-0.5">Quản lý Lô Date &amp; FEFO</div>
                    </div>
                  </div>
                  <span className="w-6 h-6 rounded-full bg-emerald-50 text-[#0f4c3a] grid place-items-center text-[12px] shrink-0 group-hover:translate-x-1 transition-transform">
                    <ChevronRight size={14} />
                  </span>
                </a>

                {/* 2. Thời Trang & May Mặc */}
                <a href="#pos-ban-hang" className="nganh-2 group bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-[#c1121f] hover:shadow-md transition-all flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-red-50 text-[#c1121f] grid place-items-center shrink-0">
                      <Store size={22} />
                    </div>
                    <div>
                      <h3 className="text-[14.5px] font-bold leading-tight text-[#c1121f]">
                        Thời Trang &amp; Phụ Kiện
                      </h3>
                      <div className="text-[11.5px] text-slate-500 mt-0.5">Đa biến thể Màu / Size</div>
                    </div>
                  </div>
                  <span className="w-6 h-6 rounded-full bg-red-50 text-[#c1121f] grid place-items-center text-[12px] shrink-0 group-hover:translate-x-1 transition-transform">
                    <ChevronRight size={14} />
                  </span>
                </a>

                {/* 3. Bách Hóa & Siêu Thị Mini */}
                <a href="#kho-fefo" className="nganh-3 group bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-[#0f4c3a] hover:shadow-md transition-all flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-emerald-50 text-[#0f4c3a] grid place-items-center shrink-0">
                      <ShoppingCart size={22} />
                    </div>
                    <div>
                      <h3 className="text-[14.5px] font-bold leading-tight text-[#0f4c3a]">
                        Bách Hóa &amp; Mini Mart
                      </h3>
                      <div className="text-[11.5px] text-slate-500 mt-0.5">Cảnh báo cận date 3 mức</div>
                    </div>
                  </div>
                  <span className="w-6 h-6 rounded-full bg-emerald-50 text-[#0f4c3a] grid place-items-center text-[12px] shrink-0 group-hover:translate-x-1 transition-transform">
                    <ChevronRight size={14} />
                  </span>
                </a>

                {/* 4. Chuỗi Bán Lẻ & Chi Nhánh */}
                <a href="#pos-ban-hang" className="nganh-4 group bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-[#c1121f] hover:shadow-md transition-all flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-red-50 text-[#c1121f] grid place-items-center shrink-0">
                      <Layers size={22} />
                    </div>
                    <div>
                      <h3 className="text-[14.5px] font-bold leading-tight text-[#c1121f]">
                        Chuỗi Chi Nhánh
                      </h3>
                      <div className="text-[11.5px] text-slate-500 mt-0.5">Điều chuyển kho tập trung</div>
                    </div>
                  </div>
                  <span className="w-6 h-6 rounded-full bg-red-50 text-[#c1121f] grid place-items-center text-[12px] shrink-0 group-hover:translate-x-1 transition-transform">
                    <ChevronRight size={14} />
                  </span>
                </a>

                {/* 5. Thực Phẩm & Đồ Uống (F&B) */}
                <a href="#kho-fefo" className="nganh-5 group bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-[#0f4c3a] hover:shadow-md transition-all flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-emerald-50 text-[#0f4c3a] grid place-items-center shrink-0">
                      <Boxes size={22} />
                    </div>
                    <div>
                      <h3 className="text-[14.5px] font-bold leading-tight text-[#0f4c3a]">
                        Thực Phẩm &amp; Đồ Uống
                      </h3>
                      <div className="text-[11.5px] text-slate-500 mt-0.5">Kiểm soát bảo quản &amp; HSD</div>
                    </div>
                  </div>
                  <span className="w-6 h-6 rounded-full bg-emerald-50 text-[#0f4c3a] grid place-items-center text-[12px] shrink-0 group-hover:translate-x-1 transition-transform">
                    <ChevronRight size={14} />
                  </span>
                </a>

                {/* 6. Nhà Phân Phối & Bán Buôn */}
                <a href="#doi-soat-ncc" className="nganh-6 group bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs hover:border-[#c1121f] hover:shadow-md transition-all flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-red-50 text-[#c1121f] grid place-items-center shrink-0">
                      <Truck size={22} />
                    </div>
                    <div>
                      <h3 className="text-[14.5px] font-bold leading-tight text-[#c1121f]">
                        Bán Buôn &amp; Đại Lý
                      </h3>
                      <div className="text-[11.5px] text-slate-500 mt-0.5">Công nợ &amp; Đối soát NCC</div>
                    </div>
                  </div>
                  <span className="w-6 h-6 rounded-full bg-red-50 text-[#c1121f] grid place-items-center text-[12px] shrink-0 group-hover:translate-x-1 transition-transform">
                    <ChevronRight size={14} />
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. DẢI HOTLINE CHUYÊN GIA TƯ VẤN - TONE XANH THÔNG GIÁNG SINH (#0f4c3a) */}
      <section className="w-full bg-[#0f4c3a] text-white py-2.5 px-2 sm:px-6 shadow-sm border-t border-emerald-800">
        <div className="w-full">
          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-1 text-[12px] divide-x divide-emerald-800/60">
            {[
              { role: "Tổng đài CSKH", tel: "028.7300.6868" },
              { role: "Hỗ trợ Kỹ thuật", tel: "028.7300.6869" },
              { role: "Tư vấn Kho FEFO", tel: "0938.848.248" },
              { role: "Chuyên viên POS", tel: "0903.177.419" },
              { role: "Tư vấn AI Copilot", tel: "0909.135.454" },
              { role: "Kế toán Đối soát", tel: "0708.358.121" },
              { role: "Triển khai Chuỗi", tel: "0931.332.359" },
              { role: "Tư vấn Đào tạo", tel: "0898.65.65.66" },
              { role: "Hỗ trợ Kiểm kê", tel: "0935.088.573" },
              { role: "Bảo hành SLA", tel: "0908.656.425" },
            ].map((contact, idx) => (
              <a
                key={idx}
                href={`tel:${contact.tel.replace(/\./g, "")}`}
                className="px-2 py-1 hover:bg-[#165b4c] transition-colors flex items-center gap-1.5"
              >
                <Phone size={12} className="text-[#d4af37] shrink-0" />
                <div className="leading-tight">
                  <div className="font-bold text-[11.5px] text-white">{contact.role}</div>
                  <div className="text-[11px] text-emerald-200 font-mono tracking-tight">{contact.tel}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* 5. PHẦN 4 Ô DỊCH VỤ STAGGERED SO LE NGUYÊN BẢN (#nina-service-page) */}
      <section id="nina-service-page" className="w-full bg-white border-b border-emerald-950/10 overflow-hidden min-h-screen flex items-center py-16">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 xl:px-12 w-full">
          <div className="flex-services">
            {/* Cột trái: 4 ô tính năng phối xanh thông và trắng viền đỏ ruby */}
            <div className="col-l">
              <div className="grid grid-cols-2 gap-4 sm:gap-6 items-center">
                {/* Cột con trái: Kho FEFO & POS Thu Ngân */}
                <div className="flex flex-col gap-4 sm:gap-6 -translate-y-6 sm:-translate-y-10 lg:-translate-y-12 transition-transform">
                  <div className="itemService bg-[#0f4c3a] text-white p-6 rounded-2xl shadow-lg border border-emerald-800 flex flex-col items-center justify-center text-center group hover:scale-102 transition-all">
                    <div className="wrap flex flex-col items-center">
                      <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-3">
                        <Boxes size={28} className="text-[#fef08a]" />
                      </div>
                      <h3 className="text-[17px] font-bold text-white leading-tight">
                        Kho Lô &amp; FEFO
                      </h3>
                      <p className="text-[11.5px] text-emerald-200 mt-1">Xuất kho ưu tiên cận date</p>
                    </div>
                  </div>

                  <div className="itemService bg-white text-[#c1121f] border-2 border-red-100 shadow-md p-6 rounded-2xl flex flex-col items-center justify-center text-center group hover:scale-102 transition-all">
                    <div className="wrap flex flex-col items-center">
                      <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-3">
                        <Receipt size={28} className="text-[#c1121f]" />
                      </div>
                      <h3 className="text-[17px] font-bold text-slate-800 leading-tight">
                        POS Bán Hàng
                      </h3>
                      <p className="text-[11.5px] text-slate-500 mt-1">Thanh toán 3s &amp; VietQR</p>
                    </div>
                  </div>
                </div>

                {/* Cột con phải: AI Copilot & Đối Soát NCC */}
                <div className="flex flex-col gap-4 sm:gap-6 translate-y-6 sm:translate-y-10 lg:translate-y-12 transition-transform">
                  <div className="itemService bg-white text-[#0f4c3a] border-2 border-emerald-100 shadow-md p-6 rounded-2xl flex flex-col items-center justify-center text-center group hover:scale-102 transition-all">
                    <div className="wrap flex flex-col items-center">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3">
                        <Bot size={28} className="text-[#0f4c3a]" />
                      </div>
                      <h3 className="text-[17px] font-bold text-slate-800 leading-tight">
                        AI Copilot
                      </h3>
                      <p className="text-[11.5px] text-slate-500 mt-1">Dự báo nhu cầu &amp; tồn kho</p>
                    </div>
                  </div>

                  <div className="itemService bg-[#0f4c3a] text-white p-6 rounded-2xl shadow-lg border border-emerald-800 flex flex-col items-center justify-center text-center group hover:scale-102 transition-all">
                    <div className="wrap flex flex-col items-center">
                      <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-3">
                        <Truck size={28} className="text-[#fef08a]" />
                      </div>
                      <h3 className="text-[17px] font-bold text-white leading-tight">
                        Đối Soát NCC
                      </h3>
                      <p className="text-[11.5px] text-emerald-200 mt-1">Khớp lệnh mua &amp; công nợ</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cột phải: Đoạn văn bản giới thiệu giải pháp ABC */}
            <div className="col-r">
              <div className="des-service">
                <div className="sloganHome text-[#c1121f]">Tối ưu hóa vận hành &amp; gia tăng lợi nhuận!</div>
                <div className="r2 !text-[#0f4c3a] text-[30px] sm:text-[36px] font-black leading-tight">
                  Đồng Hành Cùng Doanh Nghiệp Quản Trị Chuỗi Toàn Diện
                </div>
                <div className="r3 mt-5 space-y-4 text-slate-600 leading-relaxed text-[15px]">
                  <p>
                    Hệ thống ABC (AI Business Copilot) được thiết kế đặc thù cho ngành bán lẻ, giải quyết bài toán cốt lõi: kiểm soát chặt chẽ từng lô hàng và hạn sử dụng (EXP/MFG) theo phương pháp FEFO (First Expired, First Out), ngăn chặn 90% nguy cơ thất thoát do hàng quá hạn.
                  </p>
                  <p>
                    Tích hợp liền mạch giữa POS bán hàng tốc độ cao, quản trị mua hàng và trợ lý trí tuệ nhân tạo (AI Copilot), ABC giúp người quản lý ra quyết định nhập kho chuẩn xác, kiểm soát dòng tiền ca làm việc và nắm bắt báo cáo lãi gộp P&amp;L theo thời gian thực.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. BẢNG TÍNH NĂNG CHUYÊN SÂU 1: KHO LÔ DATE & FEFO */}
      <section id="kho-fefo" className="w-full min-h-screen flex items-center py-16 bg-[#f4f7f5] border-b border-emerald-950/10">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 xl:px-12 w-full">
          <div className="nina-domain-box grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Cột trái: 6 Năng lực kho FEFO */}
            <div className="lg:col-span-6">
              <div className="text-[13px] font-bold uppercase tracking-wider text-[#c1121f]">
                Kiểm soát hạn dùng chuyên sâu
              </div>
              <h2 className="text-[28px] sm:text-[34px] font-black text-[#0f4c3a] uppercase mt-2">
                Quản Trị Kho Lô &amp; Hạn Sử Dụng (FEFO)
              </h2>
              
              <p className="text-[14px] text-slate-600 leading-relaxed mb-6">
                Thuật toán FEFO (First Expired, First Out) tự động chỉ định lô hàng có hạn sử dụng gần nhất xuất trước. Tích hợp cảnh báo đa tầng giúp loại bỏ hoàn toàn tình trạng hàng tồn kho hết date không rõ nguyên nhân.
              </p>

              {/* 6 Thẻ tính năng kho bo góc */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { title: "Theo dõi Lô & HSD từng SKU", tag: "Chi tiết EXP/MFG" },
                  { title: "Cảnh báo cận Date 3 mức độ", tag: "30-60-90 ngày" },
                  { title: "Xuất kho ưu tiên FEFO tự động", tag: "Giảm hủy hàng" },
                  { title: "In mã vạch Barcode / QR theo lô", tag: "Chuẩn quốc tế" },
                  { title: "Kiểm kê kho & Cân bằng tồn", tag: "Không ngừng bán" },
                  { title: "Quản lý phiếu xuất hủy minh bạch", tag: "Rõ nguyên nhân" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-5 py-3.5 bg-white shadow-xs border border-emerald-950/10 rounded-[10px] hover:border-[#0f4c3a] hover:shadow-md transition-all group"
                  >
                    <span className="font-bold text-slate-800 text-[14px]">{item.title}</span>
                    <span className="font-semibold text-[#0f4c3a] text-[12px] bg-emerald-50 px-2 py-0.5 rounded-md">
                      {item.tag}
                    </span>
                  </div>
                ))}
              </div>

              <div className="nina-readmore mt-7 flex justify-start w-full">
                <a
                  href="#hosting"
                  className="relative inline-flex items-center justify-center px-8 py-3 rounded-full !text-white bg-[#c1121f] hover:bg-[#991b1b] hover:!text-white font-bold text-[15px] transition-all duration-300 shadow-md text-center hover:scale-102"
                  style={{
                    boxShadow: "0 8px 20px rgba(193, 18, 31, 0.35)",
                  }}
                >
                  Trải Nghiệm Kho FEFO Ngay
                </a>
              </div>
            </div>

            {/* Cột phải: Khung mô phỏng trực quan bảng quản lý kho FEFO */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="w-full max-w-[520px] bg-white rounded-2xl shadow-xl border border-emerald-950/10 p-6 relative overflow-hidden">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-[13px] font-bold text-slate-700 ml-2">Bảng Kiểm Soát Lô Date FEFO</span>
                  </div>
                  <span className="text-[11px] font-bold text-[#c1121f] bg-red-50 px-2.5 py-0.5 rounded-full">
                    Đang cảnh báo 3 lô
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="p-3 bg-red-50/70 border border-red-200/80 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-[13px] font-bold text-slate-800">Kem Dưỡng Da Phục Hồi B5</div>
                      <div className="text-[11.5px] text-red-700 font-mono">Lô: LOT-2026-A1 • HSD: 15/12/2026 (Cận 38 ngày)</div>
                    </div>
                    <span className="text-[12px] font-bold text-white bg-[#c1121f] px-2.5 py-1 rounded-md">
                      Xuất Trước
                    </span>
                  </div>

                  <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-[13px] font-bold text-slate-800">Serum Cấp Ẩm Hyaluronic</div>
                      <div className="text-[11.5px] text-amber-800 font-mono">Lô: LOT-2026-B4 • HSD: 20/02/2027 (Cận 105 ngày)</div>
                    </div>
                    <span className="text-[12px] font-bold text-amber-900 bg-amber-200/80 px-2.5 py-1 rounded-md">
                      Theo Dõi
                    </span>
                  </div>

                  <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-[13px] font-bold text-slate-800">Sữa Rửa Mặt Dịu Nhẹ 150ml</div>
                      <div className="text-[11.5px] text-emerald-800 font-mono">Lô: LOT-2026-C9 • HSD: 10/11/2027 (An toàn)</div>
                    </div>
                    <span className="text-[12px] font-bold text-emerald-900 bg-emerald-200/80 px-2.5 py-1 rounded-md">
                      Tồn 340 SP
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[12px] text-slate-500">
                  <span>Thuật toán FEFO tự động khóa lô xa date khi bán</span>
                  <span className="font-bold text-[#0f4c3a]">Độ chính xác 100%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. BẢNG TÍNH NĂNG CHUYÊN SÂU 2: POS BÁN HÀNG & CA THU NGÂN */}
      <section id="pos-ban-hang" className="w-full min-h-screen flex items-center py-16 bg-white border-b border-emerald-950/10">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 xl:px-12 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Cột trái: Khung mô phỏng POS bán hàng */}
            <div className="lg:col-span-6 flex justify-center order-2 lg:order-1">
              <div className="w-full max-w-[520px] bg-slate-900 text-white rounded-2xl shadow-xl p-6 border border-slate-800">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Receipt size={18} className="text-[#d4af37]" />
                    <span className="font-bold text-[14px]">POS Thu Ngân - Ca Sáng (#C01)</span>
                  </div>
                  <span className="text-[11px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                    Trực Tuyến
                  </span>
                </div>

                <div className="mt-4 space-y-2.5 text-[13px]">
                  <div className="flex justify-between py-2 border-b border-slate-800/80">
                    <span>1. Kem Dưỡng B5 (Lô A1 - FEFO) x 2</span>
                    <span className="font-mono font-bold text-emerald-400">720.000đ</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-800/80">
                    <span>2. Sữa Rửa Mặt Dịu Nhẹ x 1</span>
                    <span className="font-mono font-bold text-emerald-400">280.000đ</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-800/80">
                    <span className="text-slate-400">Chiết khấu thành viên VIP (-10%)</span>
                    <span className="font-mono font-bold text-red-400">-100.000đ</span>
                  </div>
                  <div className="flex justify-between pt-2 text-[16px] font-bold">
                    <span>Tổng thanh toán</span>
                    <span className="text-[#fef08a] font-mono">900.000đ</span>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-emerald-900/40 border border-emerald-700/50 text-center">
                    <div className="text-[11px] text-emerald-300">Quét mã VietQR</div>
                    <div className="text-[13px] font-bold text-white mt-0.5">Tự Động Khớp Tiền</div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-800 text-center border border-slate-700">
                    <div className="text-[11px] text-slate-400">Bàn giao tiền ca</div>
                    <div className="text-[13px] font-bold text-white mt-0.5">Khớp Lệnh 100%</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cột phải: 6 Năng lực POS Bán Hàng */}
            <div className="lg:col-span-6 order-1 lg:order-2">
              <div className="text-[13px] font-bold uppercase tracking-wider text-[#c1121f]">
                Tốc độ &amp; Trải nghiệm khách hàng
              </div>
              <h2 className="text-[28px] sm:text-[34px] font-black text-[#0f4c3a] uppercase mt-2">
                POS Bán Hàng &amp; Quản Lý Ca Thu Ngân
              </h2>
              
              <p className="text-[14px] text-slate-600 leading-relaxed mb-6">
                Giao diện POS tối ưu thao tác chỉ từ 3 giây cho mỗi đơn hàng. Tích hợp thanh toán QR động, kết nối máy in hóa đơn và máy quét mã vạch không dây mượt mà.
              </p>

              {/* 6 Tính năng POS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { title: "Thanh toán VietQR động", tag: "Chống nhầm lẫn" },
                  { title: "Mở ca, chốt ca chặt chẽ", tag: "Chống thất thoát" },
                  { title: "Đổi trả hàng & Hoàn tiền kho", tag: "Tức thì" },
                  { title: "Tích điểm & Hạng thành viên", tag: "Tự động" },
                  { title: "Áp dụng khuyến mãi & Combo", tag: "Linh hoạt" },
                  { title: "Hoạt động mượt mà đa thiết bị", tag: "PC / Tablet / POS" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-5 py-3.5 bg-[#f6f8f7] shadow-xs border border-emerald-950/10 rounded-[10px] hover:border-[#0f4c3a] hover:shadow-md transition-all group"
                  >
                    <span className="font-bold text-slate-800 text-[14px]">{item.title}</span>
                    <span className="font-semibold text-[#0f4c3a] text-[12px] bg-emerald-100/70 px-2 py-0.5 rounded-md">
                      {item.tag}
                    </span>
                  </div>
                ))}
              </div>

              <div className="nina-readmore mt-7 flex justify-start w-full">
                <a
                  href="#hosting"
                  className="relative inline-flex items-center justify-center px-8 py-3 rounded-full !text-white bg-[#0f4c3a] hover:bg-[#165b4c] hover:!text-white font-bold text-[15px] transition-all duration-300 shadow-md text-center hover:scale-102"
                  style={{
                    boxShadow: "0 8px 20px rgba(15, 76, 58, 0.35)",
                  }}
                >
                  Xem Bảng Giá Giải Pháp
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. BẢNG GIÁ GIẢI PHÁP PHẦN MỀM ABC - NỀN XANH THÔNG ĐẬM SANG TRỌNG, HẾT BỊ CHÌM */}
      <div className="bgHostWeb w-full overflow-hidden">
        <section id="hosting" className="relative w-full pt-16 pb-12 overflow-hidden">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-8">
            {/* Header Bảng giá giải pháp - Trên nền parabol xanh thông, chữ trắng sáng và vàng kim */}
            <div className="nina-title text-center max-w-[910px] mx-auto mb-6 pt-4">
              <div className="sloganHome sloganHome3 !text-[#fef08a] font-bold text-[13px] uppercase tracking-wider mb-2">
                <Sparkles size={13} className="inline-block mr-1 text-[#fef08a]" />
                Đầu tư hiệu quả &amp; minh bạch
              </div>
              <h2 className="titleHome titleHome2 !text-white uppercase text-2xl md:text-4xl font-black drop-shadow-md">
                Bảng Giá Giải Pháp Phần Mềm ABC
              </h2>
              <p className="txtHome txtHome2 !text-white/95 text-[15px] sm:text-[16px] max-w-[760px] mx-auto mt-2 leading-relaxed font-normal drop-shadow-xs">
                Lựa chọn gói giải pháp phù hợp với quy mô cửa hàng hoặc chuỗi chi nhánh của bạn. Cam kết không phát sinh chi phí ẩn.
              </p>
            </div>

            <div className="nina-tabs-host text-center mt-6 mb-8">
              <div className="nav-list inline-block">
                <div className="flex justify-center items-center gap-2 sm:gap-3 flex-wrap">
                  {[
                    { id: "personal", label: "Gói Khởi Nghiệp" },
                    { id: "standard", label: "Gói Bán Lẻ Thời Trang" },
                    { id: "pro", label: "Gói Chuyên Nghiệp FEFO" },
                    { id: "enterprise", label: "Gói Chuỗi Chi Nhánh" },
                    { id: "vip", label: "Gói Doanh Nghiệp & AI" },
                  ].map((tab) => (
                    <button
                      type="button"
                      key={tab.id}
                      onClick={() => setPricingTab(tab.id as any)}
                      className={`capitalize px-5 py-2.5 rounded-full font-bold text-[13px] transition-all duration-200 cursor-pointer shadow-sm ${
                        pricingTab === tab.id
                          ? "bg-[#c1121f] !text-white border-2 border-white/80 shadow-md scale-105"
                          : "bg-white/95 text-slate-800 border border-slate-200 hover:bg-white hover:text-[#0f4c3a]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Khung Carousel 3 Gói Giá */}
            <div className="relative mx-0 md:mx-6 lg:mx-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch pt-2">
                {/* 1. Gói Khởi Nghiệp / Tiêu Chuẩn */}
                <div className="nina-col-hosting">
                  <div className="nina-item-hosting bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all p-6 flex flex-col justify-between h-full">
                    <div>
                      <div className="text-center pb-4 border-b border-slate-100">
                        <span className="text-[12px] font-bold uppercase tracking-wider text-slate-500">Dành cho 1 cửa hàng</span>
                        <h3 className="text-[22px] font-black text-slate-800 mt-1">Gói Tiêu Chuẩn</h3>
                        <div className="mt-3">
                          <span className="text-[13px] text-slate-400">Chỉ từ </span>
                          <span className="text-[30px] font-black text-[#0f4c3a]">290.000</span>
                          <span className="text-[13px] text-slate-500"> đ / tháng</span>
                        </div>
                      </div>

                      <ul className="mt-5 space-y-3 text-[13.5px] text-slate-600">
                        <li className="flex items-center justify-between py-1.5 border-b border-slate-100">
                          <span>Số điểm bán (POS):</span>
                          <strong className="text-slate-800">01 Cửa hàng</strong>
                        </li>
                        <li className="flex items-center justify-between py-1.5 border-b border-slate-100">
                          <span>Quản lý danh mục SP:</span>
                          <strong className="text-slate-800">Không giới hạn</strong>
                        </li>
                        <li className="flex items-center justify-between py-1.5 border-b border-slate-100">
                          <span>Quản lý kho cơ bản:</span>
                          <strong className="text-emerald-700">Có sẵn</strong>
                        </li>
                        <li className="flex items-center justify-between py-1.5 border-b border-slate-100">
                          <span>Thanh toán VietQR động:</span>
                          <strong className="text-emerald-700">Có sẵn</strong>
                        </li>
                        <li className="flex items-center justify-between py-1.5 border-b border-slate-100">
                          <span>Báo cáo doanh thu:</span>
                          <strong className="text-emerald-700">Theo thời gian thực</strong>
                        </li>
                        <li className="flex items-center justify-between py-1.5 text-slate-400">
                          <span>Quản lý Lô Date FEFO:</span>
                          <span className="text-slate-400">-</span>
                        </li>
                      </ul>
                    </div>

                    <div className="mt-8 text-center">
                      <Link
                        to="/signup"
                        className="block w-full py-3 rounded-full bg-[#0f4c3a] hover:bg-[#165b4c] !text-white hover:!text-white font-bold text-[14px] transition-all text-center shadow-md shadow-emerald-950/20"
                      >
                        Đăng Ký Sử Dụng
                      </Link>
                    </div>
                  </div>
                </div>

                {/* 2. Gói Chuyên Nghiệp FEFO (NỔI BẬT Ở GIỮA VỚI TONE ĐỎ RUBY & VÀNG KIM) */}
                <div className="nina-col-hosting">
                  <div className="nina-item-hosting bg-white rounded-2xl border-2 border-[#c1121f] shadow-2xl transition-all p-6 flex flex-col justify-between h-full relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-[#c1121f] text-white text-[10px] font-black uppercase px-4 py-1 rounded-bl-xl shadow-xs">
                      Khuyên Dùng Cho Ngành Date
                    </div>

                    <div>
                      <div className="text-center pb-4 border-b border-slate-100 pt-2">
                        <span className="text-[12px] font-bold uppercase tracking-wider text-[#c1121f]">Mỹ phẩm, Dược phẩm, F&amp;B</span>
                        <h3 className="text-[24px] font-black text-slate-900 mt-1">Gói Chuyên Nghiệp FEFO</h3>
                        <div className="mt-3">
                          <span className="text-[13px] text-slate-400">Chỉ từ </span>
                          <span className="text-[34px] font-black text-[#c1121f]">590.000</span>
                          <span className="text-[13px] text-slate-500"> đ / tháng</span>
                        </div>
                      </div>

                      <ul className="mt-5 space-y-3 text-[13.5px] text-slate-700">
                        <li className="flex items-center justify-between py-1.5 border-b border-slate-100">
                          <span>Số điểm bán (POS):</span>
                          <strong className="text-slate-900">03 Cửa hàng / Kho</strong>
                        </li>
                        <li className="flex items-center justify-between py-1.5 border-b border-slate-100">
                          <span>Quản lý Lô Date (FEFO):</span>
                          <strong className="text-[#c1121f] font-bold">Toàn diện 100%</strong>
                        </li>
                        <li className="flex items-center justify-between py-1.5 border-b border-slate-100">
                          <span>Cảnh báo cận Date 3 mức:</span>
                          <strong className="text-emerald-700">Tự động qua App</strong>
                        </li>
                        <li className="flex items-center justify-between py-1.5 border-b border-slate-100">
                          <span>In mã vạch Barcode/QR:</span>
                          <strong className="text-emerald-700">Theo từng lô hàng</strong>
                        </li>
                        <li className="flex items-center justify-between py-1.5 border-b border-slate-100">
                          <span>Đối soát mua hàng NCC:</span>
                          <strong className="text-emerald-700">Khớp phiếu nhập</strong>
                        </li>
                        <li className="flex items-center justify-between py-1.5">
                          <span>Kiểm kê &amp; Cân bằng kho:</span>
                          <strong className="text-emerald-700">Không gián đoạn</strong>
                        </li>
                      </ul>
                    </div>

                    <div className="mt-8 text-center">
                      <Link
                        to="/signup"
                        className="block w-full py-3 rounded-full bg-[#c1121f] hover:bg-[#991b1b] !text-white hover:!text-white font-bold text-[14px] transition-all shadow-md shadow-red-950/20 text-center hover:scale-102"
                      >
                        Đăng Ký Gói FEFO Ngay
                      </Link>
                    </div>
                  </div>
                </div>

                {/* 3. Gói Doanh Nghiệp Chuỗi & AI */}
                <div className="nina-col-hosting">
                  <div className="nina-item-hosting bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all p-6 flex flex-col justify-between h-full">
                    <div>
                      <div className="text-center pb-4 border-b border-slate-100">
                        <span className="text-[12px] font-bold uppercase tracking-wider text-slate-500">Chuỗi bán lẻ &amp; Phân phối</span>
                        <h3 className="text-[22px] font-black text-slate-800 mt-1">Gói Doanh Nghiệp &amp; AI</h3>
                        <div className="mt-3">
                          <span className="text-[13px] text-slate-400">Chỉ từ </span>
                          <span className="text-[30px] font-black text-[#0f4c3a]">1.290.000</span>
                          <span className="text-[13px] text-slate-500"> đ / tháng</span>
                        </div>
                      </div>

                      <ul className="mt-5 space-y-3 text-[13.5px] text-slate-600">
                        <li className="flex items-center justify-between py-1.5 border-b border-slate-100">
                          <span>Số điểm bán &amp; Kho:</span>
                          <strong className="text-slate-800">Không giới hạn</strong>
                        </li>
                        <li className="flex items-center justify-between py-1.5 border-b border-slate-100">
                          <span>Trợ lý AI Copilot dự báo:</span>
                          <strong className="text-[#0f4c3a] font-bold">Tích hợp sẵn</strong>
                        </li>
                        <li className="flex items-center justify-between py-1.5 border-b border-slate-100">
                          <span>Điều chuyển kho liên chi nhánh:</span>
                          <strong className="text-emerald-700">Đồng bộ tức thời</strong>
                        </li>
                        <li className="flex items-center justify-between py-1.5 border-b border-slate-100">
                          <span>Phân quyền RBAC nâng cao:</span>
                          <strong className="text-emerald-700">Đa cấp bậc</strong>
                        </li>
                        <li className="flex items-center justify-between py-1.5 border-b border-slate-100">
                          <span>Cam kết SLA vận hành:</span>
                          <strong className="text-emerald-700">99.9% có kỹ sư riêng</strong>
                        </li>
                        <li className="flex items-center justify-between py-1.5">
                          <span>Báo cáo P&amp;L tài chính:</span>
                          <strong className="text-emerald-700">Chuyên sâu</strong>
                        </li>
                      </ul>
                    </div>

                    <div className="mt-8 text-center">
                      <Link
                        to="/signup"
                        className="block w-full py-3 rounded-full bg-[#0f4c3a] hover:bg-[#165b4c] !text-white hover:!text-white font-bold text-[14px] transition-all text-center shadow-md shadow-emerald-950/20"
                      >
                        Liên Hệ Doanh Nghiệp
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 9. HỆ SINH THÁI 9 PHÂN HỆ NGHIỆP VỤ ABC */}
        <section id="thiet-ke-web" className="pt-4 pb-24 bg-transparent relative z-30">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-8">
            <div className="text-center max-w-[910px] mx-auto mb-14">
              <div className="sloganHome sloganWeb text-center text-[#c1121f]">Hệ sinh thái phân hệ toàn diện!</div>
              <h2 className="titleHome uppercase text-xl md:text-3xl font-bold text-[#0f4c3a]">
                Các Phân Hệ Nghiệp Vụ Chuyên Biệt
              </h2>
              <p className="txtHome txtHomeWeb text-slate-600">
                Lựa chọn và mở rộng linh hoạt từng phân hệ chức năng phù hợp theo từng giai đoạn phát triển của doanh nghiệp.
              </p>

              <div className="mt-7 inline-flex rounded-full bg-white p-1 border border-slate-200 shadow-xs">
                <button
                  type="button"
                  onClick={() => setModuleCategory("all")}
                  className={`px-5 py-2 rounded-full text-[13px] font-bold transition-all cursor-pointer ${
                    moduleCategory === "all" ? "bg-[#0f4c3a] text-white" : "text-slate-700 hover:text-[#0f4c3a]"
                  }`}
                >
                  Tất cả 9 phân hệ
                </button>
                <button
                  type="button"
                  onClick={() => setModuleCategory("basic")}
                  className={`px-5 py-2 rounded-full text-[13px] font-bold transition-all cursor-pointer ${
                    moduleCategory === "basic" ? "bg-[#0f4c3a] text-white" : "text-slate-700 hover:text-[#0f4c3a]"
                  }`}
                >
                  Vận Hành Cơ Bản
                </button>
                <button
                  type="button"
                  onClick={() => setModuleCategory("popular")}
                  className={`px-5 py-2 rounded-full text-[13px] font-bold transition-all cursor-pointer ${
                    moduleCategory === "popular" ? "bg-[#0f4c3a] text-white" : "text-slate-700 hover:text-[#0f4c3a]"
                  }`}
                >
                  Quản Trị Kho &amp; POS
                </button>
                <button
                  type="button"
                  onClick={() => setModuleCategory("advanced")}
                  className={`px-5 py-2 rounded-full text-[13px] font-bold transition-all cursor-pointer ${
                    moduleCategory === "advanced" ? "bg-[#0f4c3a] text-white" : "text-slate-700 hover:text-[#0f4c3a]"
                  }`}
                >
                  Doanh Nghiệp &amp; AI
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {/* Module 1: POS Thu Ngân */}
              {(moduleCategory === "all" || moduleCategory === "basic") && (
                <div className="rounded-2xl bg-white p-7 border border-slate-200 shadow-xs hover:border-[#0f4c3a] hover:shadow-lg transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0f4c3a] grid place-items-center">
                        <Store size={20} />
                      </div>
                      <h3 className="text-[18px] font-black text-slate-800 uppercase">
                        Module POS Thu Ngân
                      </h3>
                    </div>
                    <ul className="space-y-2 text-[13px] text-slate-600 pt-4">
                      <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Bán hàng tại quầy siêu tốc 3s</li>
                      <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Tích hợp VietQR động &amp; tiền mặt</li>
                      <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Mở ca, chốt ca, bàn giao tiền chặt chẽ</li>
                      <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> In hóa đơn và quét mã vạch không dây</li>
                    </ul>
                  </div>
                  <Link
                    to="/signup"
                    className="mt-6 block w-full text-center rounded-full bg-[#0f4c3a] hover:bg-[#165b4c] !text-white hover:!text-white py-2.5 text-[13px] font-bold transition-all shadow-xs"
                  >
                    Xem Chi Tiết
                  </Link>
                </div>
              )}

              {/* Module 2: Quản Lý Kho Lô Date & FEFO */}
              {(moduleCategory === "all" || moduleCategory === "popular") && (
                <div className="rounded-2xl bg-white p-7 border-2 border-[#c1121f] shadow-md hover:shadow-xl transition-all flex flex-col justify-between relative">
                  <span className="absolute -top-3 right-6 bg-[#c1121f] text-white text-[10px] font-black uppercase px-3 py-0.5 rounded-full">
                    Cốt lõi
                  </span>
                  <div>
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                      <div className="w-10 h-10 rounded-xl bg-red-50 text-[#c1121f] grid place-items-center">
                        <Boxes size={20} />
                      </div>
                      <h3 className="text-[18px] font-black text-slate-800 uppercase">
                        Kho Lô HSD &amp; FEFO
                      </h3>
                    </div>
                    <ul className="space-y-2 text-[13px] text-slate-600 pt-4">
                      <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Theo dõi hạn dùng EXP/MFG từng SKU</li>
                      <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Cảnh báo hàng cận date tự động 3 mức</li>
                      <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Thuật toán FEFO chỉ định xuất kho ưu tiên</li>
                      <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Báo cáo hủy hàng &amp; nguyên nhân thất thoát</li>
                    </ul>
                  </div>
                  <Link
                    to="/signup"
                    className="mt-6 block w-full text-center rounded-full bg-[#c1121f] hover:bg-[#991b1b] !text-white hover:!text-white py-2.5 text-[13px] font-bold transition-all shadow-sm hover:scale-102"
                  >
                    Kích Hoạt Phân Hệ
                  </Link>
                </div>
              )}

              {/* Module 3: Mua Hàng & Đối Soát NCC */}
              {(moduleCategory === "all" || moduleCategory === "popular") && (
                <div className="rounded-2xl bg-white p-7 border border-slate-200 shadow-xs hover:border-[#0f4c3a] hover:shadow-lg transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0f4c3a] grid place-items-center">
                        <Truck size={20} />
                      </div>
                      <h3 className="text-[18px] font-black text-slate-800 uppercase">
                        Đơn Mua &amp; Đối Soát NCC
                      </h3>
                    </div>
                    <ul className="space-y-2 text-[13px] text-slate-600 pt-4">
                      <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Tạo đơn đặt hàng nhà cung cấp (PO)</li>
                      <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Nhập kho khớp lệnh theo từng phiếu mua</li>
                      <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Theo dõi công nợ &amp; lịch sử thanh toán</li>
                      <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Đánh giá chất lượng NCC và thời gian giao</li>
                    </ul>
                  </div>
                  <Link
                    to="/signup"
                    className="mt-6 block w-full text-center rounded-full bg-[#0f4c3a] hover:bg-[#165b4c] !text-white hover:!text-white py-2.5 text-[13px] font-bold transition-all shadow-xs"
                  >
                    Xem Chi Tiết
                  </Link>
                </div>
              )}

              {/* Module 4: Kiểm Kê & Cân Bằng Tồn */}
              {(moduleCategory === "all" || moduleCategory === "basic") && (
                <div className="rounded-2xl bg-white p-7 border border-slate-200 shadow-xs hover:border-[#0f4c3a] hover:shadow-lg transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0f4c3a] grid place-items-center">
                        <Package size={20} />
                      </div>
                      <h3 className="text-[18px] font-black text-slate-800 uppercase">
                        Kiểm Kê Barcode
                      </h3>
                    </div>
                    <ul className="space-y-2 text-[13px] text-slate-600 pt-4">
                      <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Quét mã vạch kiểm kho trực tiếp trên điện thoại</li>
                      <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Lưu nháp và cân bằng kho tự động</li>
                      <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Báo cáo chênh lệch tồn thực tế và sổ sách</li>
                      <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Không làm gián đoạn việc bán hàng tại quầy</li>
                    </ul>
                  </div>
                  <Link
                    to="/signup"
                    className="mt-6 block w-full text-center rounded-full bg-[#0f4c3a] hover:bg-[#165b4c] !text-white hover:!text-white py-2.5 text-[13px] font-bold transition-all shadow-xs"
                  >
                    Xem Chi Tiết
                  </Link>
                </div>
              )}

              {/* Module 5: Trợ Lý AI Copilot */}
              {(moduleCategory === "all" || moduleCategory === "advanced") && (
                <div className="rounded-2xl bg-white p-7 border-2 border-[#0f4c3a] shadow-md hover:shadow-xl transition-all flex flex-col justify-between relative">
                  <span className="absolute -top-3 right-6 bg-[#0f4c3a] text-white text-[10px] font-black uppercase px-3 py-0.5 rounded-full">
                    AI Đột Phá
                  </span>
                  <div>
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0f4c3a] grid place-items-center">
                        <Bot size={20} />
                      </div>
                      <h3 className="text-[18px] font-black text-slate-800 uppercase">
                        Trợ Lý AI Copilot
                      </h3>
                    </div>
                    <ul className="space-y-2 text-[13px] text-slate-600 pt-4">
                      <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Dự báo nhu cầu bán hàng kỳ tiếp theo</li>
                      <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Gợi ý số lượng đặt hàng tối ưu (Tránh ứ vốn)</li>
                      <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Tự động phân tích sản phẩm bán chạy/ế ẩm</li>
                      <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Trả lời số liệu kinh doanh bằng ngôn ngữ tự nhiên</li>
                    </ul>
                  </div>
                  <Link
                    to="/signup"
                    className="mt-6 block w-full text-center rounded-full bg-[#0f4c3a] hover:bg-[#165b4c] !text-white hover:!text-white py-2.5 text-[13px] font-bold transition-all shadow-sm hover:scale-102"
                  >
                    Trải Nghiệm AI
                  </Link>
                </div>
              )}

              {/* Module 6: Báo Cáo P&L Tài Chính */}
              {(moduleCategory === "all" || moduleCategory === "advanced") && (
                <div className="rounded-2xl bg-white p-7 border border-slate-200 shadow-xs hover:border-[#0f4c3a] hover:shadow-lg transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0f4c3a] grid place-items-center">
                        <BarChart3 size={20} />
                      </div>
                      <h3 className="text-[18px] font-black text-slate-800 uppercase">
                        Báo Cáo P&amp;L Tài Chính
                      </h3>
                    </div>
                    <ul className="space-y-2 text-[13px] text-slate-600 pt-4">
                      <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Doanh thu, giá vốn &amp; lãi gộp thời gian thực</li>
                      <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Báo cáo dòng tiền thu chi theo từng ca bán</li>
                      <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Tỷ suất lợi nhuận trên từng ngành hàng và SKU</li>
                      <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Xuất file Excel / PDF tiêu chuẩn kế toán</li>
                    </ul>
                  </div>
                  <Link
                    to="/signup"
                    className="mt-6 block w-full text-center rounded-full bg-[#0f4c3a] hover:bg-[#165b4c] !text-white hover:!text-white py-2.5 text-[13px] font-bold transition-all shadow-xs"
                  >
                    Xem Chi Tiết
                  </Link>
                </div>
              )}

              {/* Module 7: Khách Hàng & Loyalty */}
              {(moduleCategory === "all" || moduleCategory === "basic") && (
                <div className="rounded-2xl bg-white p-7 border border-slate-200 shadow-xs hover:border-[#0f4c3a] hover:shadow-lg transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0f4c3a] grid place-items-center">
                        <Users size={20} />
                      </div>
                      <h3 className="text-[18px] font-black text-slate-800 uppercase">
                        Khách Hàng &amp; Tích Điểm
                      </h3>
                    </div>
                    <ul className="space-y-2 text-[13px] text-slate-600 pt-4">
                      <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Hồ sơ khách hàng &amp; lịch sử mua hàng</li>
                      <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Tự động xếp hạng thành viên: Bạc, Vàng, Kim Cương</li>
                      <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Áp dụng chiết khấu sinh nhật &amp; voucher ưu đãi</li>
                      <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Gửi tin nhắn chăm sóc khách hàng qua SMS/Zalo</li>
                    </ul>
                  </div>
                  <Link
                    to="/signup"
                    className="mt-6 block w-full text-center rounded-full bg-[#0f4c3a] hover:bg-[#165b4c] !text-white hover:!text-white py-2.5 text-[13px] font-bold transition-all shadow-xs"
                  >
                    Xem Chi Tiết
                  </Link>
                </div>
              )}

              {/* Module 8: Quản Lý Chuỗi Đa Điểm */}
              {(moduleCategory === "all" || moduleCategory === "advanced") && (
                <div className="rounded-2xl bg-white p-7 border border-slate-200 shadow-xs hover:border-[#0f4c3a] hover:shadow-lg transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0f4c3a] grid place-items-center">
                        <Layers size={20} />
                      </div>
                      <h3 className="text-[18px] font-black text-slate-800 uppercase">
                        Chuỗi Chi Nhánh Đa Điểm
                      </h3>
                    </div>
                    <ul className="space-y-2 text-[13px] text-slate-600 pt-4">
                      <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Quản lý tập trung không giới hạn cửa hàng/kho</li>
                      <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Điều chuyển hàng hóa liên kho trong 1 chạm</li>
                      <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Thiết lập chính sách giá và khuyến mãi theo chi nhánh</li>
                      <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> So sánh hiệu quả kinh doanh giữa các cửa hàng</li>
                    </ul>
                  </div>
                  <Link
                    to="/signup"
                    className="mt-6 block w-full text-center rounded-full bg-[#0f4c3a] hover:bg-[#165b4c] !text-white hover:!text-white py-2.5 text-[13px] font-bold transition-all shadow-xs"
                  >
                    Xem Chi Tiết
                  </Link>
                </div>
              )}

              {/* Module 9: Phân Quyền RBAC & Kiểm Soát */}
              {(moduleCategory === "all" || moduleCategory === "popular") && (
                <div className="rounded-2xl bg-white p-7 border border-slate-200 shadow-xs hover:border-[#0f4c3a] hover:shadow-lg transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0f4c3a] grid place-items-center">
                        <ShieldCheck size={20} />
                      </div>
                      <h3 className="text-[18px] font-black text-slate-800 uppercase">
                        Phân Quyền RBAC Bảo Mật
                      </h3>
                    </div>
                    <ul className="space-y-2 text-[13px] text-slate-600 pt-4">
                      <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Phân quyền chi tiết: Thu ngân, Thủ kho, Quản lý, Chủ chuỗi</li>
                      <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Giám sát thao tác sửa/xóa hóa đơn và hủy hàng</li>
                      <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Nhật ký kiểm toán hệ thống (Audit Log) minh bạch</li>
                      <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Mã hóa dữ liệu đám mây chuẩn an toàn cao cấp</li>
                    </ul>
                  </div>
                  <Link
                    to="/signup"
                    className="mt-6 block w-full text-center rounded-full bg-[#0f4c3a] hover:bg-[#165b4c] !text-white hover:!text-white py-2.5 text-[13px] font-bold transition-all shadow-xs"
                  >
                    Xem Chi Tiết
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* 10. ƯU ĐIỂM NỔI BẬT CỦA HỆ THỐNG ABC (#uu-diem) */}
      <section id="uu-diem" className="py-20 bg-white min-h-screen flex items-center border-b border-emerald-950/10">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 xl:px-12 w-full">
          <div className="flex-uudiem">
            {/* Cột trái: Mockup trực quan hệ thống ABC */}
            <div className="col-l">
              <div className="p-8 rounded-3xl bg-gradient-to-br from-[#0f4c3a] via-[#14532d] to-[#165b4c] text-white shadow-2xl border-4 border-emerald-800/40 relative">
                <div className="flex items-center justify-between pb-6 border-b border-white/20">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-white/10 grid place-items-center text-[#d4af37]">
                      <Award size={24} />
                    </span>
                    <div>
                      <h4 className="font-bold text-[18px]">Hiệu Suất Thực Chiến</h4>
                      <p className="text-[12px] text-emerald-200">Đo lường sau 30 ngày vận hành</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#c1121f] text-white text-[11px] font-bold">
                    Cam Kết SLA
                  </span>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                    <div className="text-[28px] font-black text-[#fef08a] leading-none">-90%</div>
                    <div className="text-[14px] font-bold mt-1">Thất Thoát Do Hàng Cận Date</div>
                    <div className="text-[12px] text-emerald-200">Nhờ thuật toán xuất kho FEFO ưu tiên</div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                    <div className="text-[28px] font-black text-[#fef08a] leading-none">&lt; 3 Giây</div>
                    <div className="text-[14px] font-bold mt-1">Tốc Độ Tạo &amp; Thanh Toán Hóa Đơn</div>
                    <div className="text-[12px] text-emerald-200">Giảm tối đa thời gian khách chờ tại quầy</div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
                    <div className="text-[28px] font-black text-[#fef08a] leading-none">100%</div>
                    <div className="text-[14px] font-bold mt-1">Khớp Lệnh Ca &amp; Đối Soát Nhà Cung Cấp</div>
                    <div className="text-[12px] text-emerald-200">Chống gian lận tiền mặt và sai lệch kho</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cột phải: Tiêu đề + 5 thẻ ưu điểm */}
            <div className="col-r">
              <div className="des-service">
                <div className="sloganHome text-[#c1121f]">Đột phá hiệu quả kinh doanh!</div>
                <div className="r2 !text-[#0f4c3a] text-[30px] sm:text-[36px] font-black leading-tight">
                  Ưu Điểm Vượt Trội Của Hệ Thống ABC
                </div>
                <div className="r3 mt-4 text-slate-600 text-[15px] leading-relaxed">
                  <p>
                    ABC được xây dựng với sứ mệnh loại bỏ hoàn toàn sự cồng kềnh của các phần mềm ERP truyền thống, cung cấp giải pháp quản trị bán lẻ tinh gọn, chính xác từng số liệu và vận hành ổn định trên mọi thiết bị.
                  </p>
                </div>
              </div>

              {/* Lưới 5 thẻ ưu điểm (.gridUudiem) */}
              <div className="gridUudiem mt-6">
                <div className="itemUuDiem flex items-center gap-3.5 p-3 rounded-xl bg-[#f6f8f7] border border-slate-200/80">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 text-[#0f4c3a] grid place-items-center shrink-0">
                    <TrendingUp size={20} />
                  </div>
                  <div className="info">
                    <h3 className="font-bold text-slate-800 text-[14px]">Chi phí đầu tư hợp lý, hoàn vốn nhanh</h3>
                  </div>
                </div>

                <div className="itemUuDiem flex items-center gap-3.5 p-3 rounded-xl bg-[#f6f8f7] border border-slate-200/80">
                  <div className="w-10 h-10 rounded-lg bg-red-100 text-[#c1121f] grid place-items-center shrink-0">
                    <Zap size={20} />
                  </div>
                  <div className="info">
                    <h3 className="font-bold text-slate-800 text-[14px]">Triển khai vận hành chỉ trong 24 giờ</h3>
                  </div>
                </div>

                <div className="itemUuDiem flex items-center gap-3.5 p-3 rounded-xl bg-[#f6f8f7] border border-slate-200/80">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 text-[#0f4c3a] grid place-items-center shrink-0">
                    <Users size={20} />
                  </div>
                  <div className="info">
                    <h3 className="font-bold text-slate-800 text-[14px]">Thu ngân làm quen chỉ sau 15 phút</h3>
                  </div>
                </div>

                <div className="itemUuDiem flex items-center gap-3.5 p-3 rounded-xl bg-[#f6f8f7] border border-slate-200/80">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 grid place-items-center shrink-0">
                    <Bot size={20} />
                  </div>
                  <div className="info">
                    <h3 className="font-bold text-slate-800 text-[14px]">AI Copilot dự báo lượng bán chính xác</h3>
                  </div>
                </div>

                <div className="itemUuDiem flex items-center gap-3.5 p-3 rounded-xl bg-[#f6f8f7] border border-slate-200/80">
                  <div className="w-10 h-10 rounded-lg bg-red-100 text-[#c1121f] grid place-items-center shrink-0">
                    <Headphones size={20} />
                  </div>
                  <div className="info">
                    <h3 className="font-bold text-slate-800 text-[14px]">Đội ngũ kỹ sư hỗ trợ 24/7 trực tiếp</h3>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 11. QUY TRÌNH 5 BƯỚC TRIỂN KHAI NHANH CHÓNG (#quy-trinh) */}
      <section id="quy-trinh" className="py-24 bg-[#f4f7f5] border-b border-emerald-950/10">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8">
          <div className="text-center max-w-[800px] mx-auto mb-16">
            <h2 className="text-[32px] sm:text-[38px] font-black text-[#0f4c3a] uppercase">
              Quy Trình 5 Bước Triển Khai
            </h2>
            <div className="w-20 h-1 bg-[#c1121f] mx-auto my-3" />
            <p className="text-[15px] text-slate-600">
              Đưa hệ thống vào vận hành thực tế nhanh chóng, chuẩn hóa dữ liệu kho và đào tạo nhân viên chuyên nghiệp.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              {
                step: "BƯỚC 01",
                name: "Khảo Sát Nhu Cầu",
                desc: "Tiếp nhận quy mô cửa hàng, mô hình quản lý kho date và yêu cầu chi tiết.",
              },
              {
                step: "BƯỚC 02",
                name: "Khởi Tạo Dữ Liệu",
                desc: "Nhập danh mục sản phẩm, mã vạch Barcode và cấu hình các kho hàng.",
              },
              {
                step: "BƯỚC 03",
                name: "Cấu Hình Kho FEFO",
                desc: "Thiết lập mốc cảnh báo cận date và kích hoạt quy tắc xuất kho ưu tiên.",
              },
              {
                step: "BƯỚC 04",
                name: "Đào Tạo Thu Ngân",
                desc: "Hướng dẫn nhân viên mở ca, thanh toán POS, in bill và kiểm kê kho.",
              },
              {
                step: "BƯỚC 05",
                name: "Vận Hành & Đồng Hành",
                desc: "Chính thức đi vào hoạt động và kỹ sư trực kỹ thuật 24/7 đồng hành.",
              },
            ].map((st, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs hover:shadow-lg hover:border-[#0f4c3a] transition-all flex flex-col items-center text-center group"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#0f4c3a] grid place-items-center mb-4 font-black text-[20px] group-hover:scale-110 group-hover:bg-[#0f4c3a] group-hover:text-white transition-all">
                  0{i + 1}
                </div>
                <div className="text-[11.5px] font-black text-[#c1121f] tracking-wider uppercase">{st.step}</div>
                <h4 className="text-[15.5px] font-black text-slate-800 mt-1">{st.name}</h4>
                <p className="text-[12px] text-slate-500 mt-2 leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 12. SẴN SÀNG TRIỂN KHAI VẬN HÀNH (#nina-support-page) */}
      <section id="nina-support-page" className="py-16 relative z-20 bg-[#eaf3ee]">
        <div className="max-w-[1360px] mx-auto px-4 text-center">
          <h3 className="text-2xl sm:text-3xl lg:text-4xl text-[#0f4c3a] font-bold mb-3">
            Sẵn sàng tối ưu hóa chuỗi bán lẻ của bạn cùng ABC.
          </h3>
          <p className="text-base lg:text-xl text-slate-700 mb-6">
            Liên hệ ngay hôm nay để nhận tư vấn và trải nghiệm hệ thống miễn phí.
          </p>

          <div className="nina-support-call flex items-center justify-center gap-8 sm:gap-14 mb-8 flex-wrap">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold">
              <a href="tel:02873006868" className="flex items-center gap-2 text-[#c1121f] hover:text-[#0f4c3a] transition-colors">
                <Headphones size={28} className="shrink-0 text-[#c1121f]" />
                <span>028.7300.6868</span>
              </a>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold">
              <a href="tel:02873006869" className="flex items-center gap-2 text-[#c1121f] hover:text-[#0f4c3a] transition-colors">
                <Headphones size={28} className="shrink-0 text-[#c1121f]" />
                <span>028.7300.6869</span>
              </a>
            </div>
          </div>

          <div className="px-8 py-7 bg-[#0f4c3a] inline-block mx-auto text-white rounded-2xl shadow-xl max-w-[760px] w-full text-center border-2 border-[#d4af37]">
            <p className="text-base lg:text-lg mb-2 text-emerald-100">
              Bạn đang phân vân về quy trình quản lý kho Lô HSD &amp; FEFO hoặc POS bán hàng?
            </p>
            <p className="text-2xl lg:text-3xl font-bold mb-2 text-[#fef08a]">
              Gọi ngay <a href="tel:02873006868" className="hover:underline">028.7300.6868</a>
            </p>
            <p className="text-sm lg:text-base text-emerald-200">
              Đội ngũ chuyên gia kỹ thuật sẵn sàng khảo sát và tư vấn mô hình tối ưu nhất
            </p>
          </div>
        </div>
      </section>

      {/* 13. FOOTER 4 CỘT CHÍNH THỨC ABC - NỀN XANH THÔNG LIỀN MẠCH, KHÔNG CÓ KHOẢNG TRẮNG (#nina-footer) */}
      <footer id="nina-footer" className="bg-[#0f4c3a] border-t border-emerald-900 overflow-hidden pb-16 lg:pb-24">
        <div className="nina-footer-top bg-white py-10 lg:py-12 border-b border-slate-200">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-6">
              {/* Cột 1: Thông tin chung */}
              <div className="lg:col-span-3 lg:border-r lg:border-r-slate-200 lg:pr-6">
                <h3 className="text-base uppercase text-[#0f4c3a] font-bold mb-4 tracking-wide">
                  Hệ Thống ABC
                </h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li><a href="#gioi-thieu" className="hover:text-[#0f4c3a] hover:font-semibold transition-all">Giới thiệu nền tảng</a></li>
                  <li><a href="#kho-fefo" className="hover:text-[#0f4c3a] hover:font-semibold transition-all">Quản trị Kho Lô Date (FEFO)</a></li>
                  <li><a href="#pos-ban-hang" className="hover:text-[#0f4c3a] hover:font-semibold transition-all">POS Thu ngân bán hàng</a></li>
                  <li><a href="#ai-copilot" className="hover:text-[#0f4c3a] hover:font-semibold transition-all">Trợ lý AI Copilot</a></li>
                </ul>
              </div>

              {/* Cột 2: Phân hệ nghiệp vụ */}
              <div className="lg:col-span-3 lg:border-r lg:border-r-slate-200 lg:pr-6">
                <h3 className="text-base uppercase text-[#0f4c3a] font-bold mb-4 tracking-wide">
                  Phân Hệ Nghiệp Vụ
                </h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li><a href="#doi-soat-ncc" className="hover:text-[#0f4c3a] hover:font-semibold transition-all">Quản lý Mua hàng &amp; NCC</a></li>
                  <li><a href="#kiem-ke" className="hover:text-[#0f4c3a] hover:font-semibold transition-all">Kiểm kê Barcode &amp; Tồn kho</a></li>
                  <li><a href="#hosting" className="hover:text-[#0f4c3a] hover:font-semibold transition-all">Bảng giá gói giải pháp</a></li>
                  <li><a href="#quy-trinh" className="hover:text-[#0f4c3a] hover:font-semibold transition-all">Quy trình 5 bước triển khai</a></li>
                </ul>
              </div>

              {/* Cột 3: Tiêu chuẩn an toàn & Cam kết */}
              <div className="lg:col-span-3 lg:border-r lg:border-r-slate-200 lg:pr-6">
                <h3 className="text-base uppercase text-[#0f4c3a] font-bold mb-4 tracking-wide">
                  An Toàn Dữ Liệu
                </h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li><span className="text-slate-700">Mã hóa dữ liệu chuẩn SSL 256-bit</span></li>
                  <li><span className="text-slate-700">Sao lưu dữ liệu đám mây hàng ngày</span></li>
                  <li><span className="text-slate-700">Cam kết bảo mật thông tin khách hàng</span></li>
                  <li><span className="text-slate-700">Cam kết vận hành ổn định SLA 99.9%</span></li>
                  <li><span className="text-slate-700">Kiểm toán nhật ký hệ thống (Audit Log)</span></li>
                </ul>
              </div>

              {/* Cột 4: Đồng hành cùng khách hàng */}
              <div className="lg:col-span-3">
                <h2 className="text-[20px] sm:text-[22px] text-[#0f4c3a] font-bold mb-2">
                  Đồng Hành Cùng Bạn
                </h2>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                  Cần tư vấn thiết kế quy trình kho Lô FEFO hoặc chuỗi bán lẻ? Đội ngũ kỹ sư ABC sẽ liên hệ hỗ trợ trong vòng 15 phút.
                </p>

                <div className="mb-4">
                  <a
                    href="#lien-he"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#c1121f] hover:bg-[#991b1b] !text-white hover:!text-white text-sm font-bold shadow-md shadow-red-950/20 transition-all group hover:scale-102"
                  >
                    <span>Yêu Cầu Tư Vấn Ngay</span>
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform !text-white" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 14. FOOTER BOTTOM: BẢN QUYỀN ABC (TONE XANH THÔNG GIÁNG SINH #0f4c3a) */}
        <div className="nina-footer-bottom bg-[#0f4c3a] text-white py-8 pb-16">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-8">
            <div className="flex flex-col lg:flex-row items-start justify-between gap-8">
              {/* Bên trái: Logo ABC & Copyright */}
              <div className="w-full lg:w-[25%] flex flex-col items-center lg:items-start text-center lg:text-left">
                <Link to="/" className="block mb-2">
                  <span className="text-[32px] font-black tracking-tight text-white font-sans leading-none">
                    ABC
                  </span>
                  <div className="text-[10px] text-[#fef08a] font-bold tracking-wider mt-1 uppercase">
                    AI Business Copilot
                  </div>
                </Link>

                <div className="nina-copyright mt-4 text-[13px] text-emerald-100 leading-relaxed">
                  <p>Copyright © 2026 by ABC - AI Business Copilot</p>
                  <p>Nền tảng Quản trị Bán lẻ &amp; Kho Lô Date FEFO</p>
                  <p className="text-emerald-300 text-[12px] mt-1">All rights reserved</p>
                </div>
              </div>

              {/* Bên phải: Thông tin công ty & Trụ sở */}
              <div className="w-full lg:w-[73%] text-white text-sm leading-relaxed">
                <div className="footer-title text-base sm:text-lg uppercase font-bold mb-2 tracking-wide text-[#fef08a]">
                  HỆ THỐNG PHẦN MỀM QUẢN TRỊ BÁN LẺ ABC
                </div>

                <div className="space-y-3 text-emerald-100 text-[13px]">
                  <div>
                    <h3 className="font-bold text-[13px] uppercase text-white">Trụ sở chính</h3>
                    <p>
                      Địa chỉ: Tòa nhà Công Nghệ Cao, Khu Đô Thị Sáng Tạo, Thành phố Hồ Chí Minh, Việt Nam
                    </p>
                    <p>
                      Hotline: 028.7300.6868 – Kỹ thuật: 028.7300.6869 – Email: hotro@abc-retail.vn
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-[13px] uppercase text-white">Hỗ trợ triển khai &amp; Bảo hành</h3>
                    <p>
                      Thời gian hỗ trợ: 24/7 toàn quốc qua tổng đài, TeamViewer và hỗ trợ trực tiếp tại điểm bán.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* 15. DẢI HOTLINE TƯ VẤN VIÊN CỐ ĐỊNH Ở ĐÁY MÀN HÌNH (STICKY FIXED BOTTOM - TO LÊN & CHE KHOẢNG CÁCH) */}
      <aside className="fixed bottom-0 left-0 right-0 z-50 bg-[#0f4c3a] text-white shadow-[0_-4px_25px_rgba(0,0,0,0.3)] border-t-2 border-[#165b4c] py-2.5 sm:py-3">
        <div className="w-full px-2 sm:px-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 text-[12px] divide-x divide-emerald-800/80 items-center">
            {[
              { role: "CSKH ABC", tel: "028.7300.6868" },
              { role: "Kỹ thuật 24/7", tel: "028.7300.6869" },
              { role: "Kho Lô FEFO", tel: "0938.848.248" },
              { role: "Thu ngân POS", tel: "0903.177.419" },
              { role: "AI Copilot", tel: "0909.135.454" },
              { role: "Kiểm kê kho", tel: "0708.358.121" },
              { role: "Chuỗi đa điểm", tel: "0931.332.359" },
              { role: "Đối soát NCC", tel: "0898.65.65.66" },
              { role: "Hỗ trợ Barcode", tel: "0935.088.573" },
              { role: "Cam kết SLA", tel: "0908.656.425" },
            ].map((contact, idx) => (
              <a
                key={idx}
                href={`tel:${contact.tel.replace(/\./g, "")}`}
                className="px-2 py-1.5 hover:bg-[#165b4c] rounded-md transition-all flex items-center justify-center gap-2 group"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-900/80 flex items-center justify-center shrink-0 group-hover:bg-[#c1121f] transition-colors">
                  <Phone size={12} className="text-[#fef08a]" />
                </div>
                <div className="leading-snug text-left">
                  <div className="font-bold text-[12.5px] text-white tracking-wide">{contact.role}</div>
                  <div className="text-[11.5px] text-emerald-200 font-mono tracking-tight font-medium">{contact.tel}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
