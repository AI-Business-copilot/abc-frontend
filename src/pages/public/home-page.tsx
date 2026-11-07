import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Gift,
  Globe,
  Headphones,
  Info,
  Mail,
  Mic,
  Phone,
  ShoppingCart,
  Target,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";

export function HomePage() {
  const { session, profile } = useAuth();
  const destination = session ? (profile?.onboardingRequired ? "/onboarding" : "/app") : "/signup";

  // State tìm kiếm tên miền
  const [domainSearchQuery, setDomainSearchQuery] = useState("");
  const [domainSlideIndex, setDomainSlideIndex] = useState(0);
  const [searchResult, setSearchResult] = useState<{
    checked: boolean;
    name: string;
    ext: string;
    available: boolean;
    price: string;
  } | null>(null);

  // Danh sách đuôi tên miền trong slider hero đúng như ảnh
  const domainPills = [
    { ext: ".org", price: "448.200đ" },
    { ext: ".biz", price: "583.200đ" },
    { ext: ".net.vn", price: "691.000đ" },
    { ext: ".vn", price: "820.000đ" },
    { ext: ".com", price: "452.520đ" },
    { ext: ".com.vn", price: "691.000đ" },
    { ext: ".net", price: "463.320đ" },
    { ext: ".info", price: "858.600đ" },
  ];

  // State Hosting Tabs
  const [hostingTab, setHostingTab] = useState<"vip" | "enterprise" | "pro" | "standard" | "personal">("vip");

  // State Danh mục Website
  const [webCategory, setWebCategory] = useState<"all" | "basic" | "popular" | "advanced">("all");

  const handleDomainSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!domainSearchQuery.trim()) return;

    let cleanName = domainSearchQuery.trim().toLowerCase();
    cleanName = cleanName.replace(/^(https?:\/\/)?(www\.)?/, "");
    const extMatch = cleanName.match(/\.(vn|com\.vn|com|net|org|xyz|info|gov\.vn|edu\.vn|biz|net\.vn)$/);
    const chosenExt = extMatch ? extMatch[0] : ".vn";
    if (extMatch) {
      cleanName = cleanName.replace(extMatch[0], "");
    }

    const priceMap: Record<string, string> = {
      ".vn": "820.000đ",
      ".com.vn": "691.000đ",
      ".com": "452.520đ",
      ".net": "463.320đ",
      ".gov.vn": "397.000đ",
      ".info": "858.600đ",
      ".edu.vn": "397.000đ",
      ".org": "448.200đ",
      ".biz": "583.200đ",
      ".net.vn": "691.000đ",
      ".me": "766.800đ",
      ".info.vn": "397.000đ",
    };

    setSearchResult({
      checked: true,
      name: cleanName,
      ext: chosenExt,
      available: cleanName.length % 2 === 0,
      price: priceMap[chosenExt] || "450.000đ",
    });
  };

  const nextDomainPills = () => {
    setDomainSlideIndex((prev) => (prev + 1) % (domainPills.length - 2));
  };

  const prevDomainPills = () => {
    setDomainSlideIndex((prev) => (prev - 1 + (domainPills.length - 2)) % (domainPills.length - 2));
  };

  return (
    <div
      id="nina-wrapper"
      className="min-h-screen w-full bg-[#f0f5fc] text-[#333] font-['Fz_Poppins',sans-serif] text-[14px] antialiased selection:bg-[#0569b8] selection:text-white"
      style={{
        fontFamily: "var(--font-Poppins, 'Fz Poppins', sans-serif)",
        fontSize: "14px",
      }}
    >
      {/* 1. TOP HEADER - TRÀN ĐẦY MÀN HÌNH (#nina-top-header) */}
      <div
        id="nina-top-header"
        className="w-full py-2 px-4 sm:px-8 xl:px-12 text-white text-[13px] border-b border-white/10"
        style={{
          backgroundColor: "rgb(4, 97, 170)",
          position: "relative",
          zIndex: 61,
        }}
      >
        <div className="w-full flex items-center justify-between flex-wrap gap-2 text-white">
          {/* Cột trái: Hotline | Hỗ Trợ Kỹ Thuật | Email */}
          <div className="flex items-center gap-3.5 flex-wrap text-white">
            <span className="flex items-center gap-1.5">
              <Phone size={13} className="text-white" />
              <span>Hotline: <strong className="font-semibold tracking-wide">028.3715.4879</strong></span>
            </span>
            <span className="text-white/40">|</span>
            <span>
              Hỗ Trợ Kỹ Thuật: <strong className="font-semibold tracking-wide">028.3715.4878</strong>
            </span>
            <span className="text-white/40">|</span>
            <span className="flex items-center gap-1.5">
              <Mail size={13} className="text-white" />
              <span>Email: <a href="mailto:nasani@nasani.vn" className="hover:underline">nasani@nasani.vn</a></span>
            </span>
          </div>

          {/* Cột phải: Giới thiệu | Hướng dẫn | Giỏ hàng (0) | Gửi yêu cầu hỗ trợ */}
          <div className="flex items-center gap-3 text-white text-[13px]">
            <a href="#gioi-thieu" className="hover:underline flex items-center gap-1 text-white">
              <Globe size={12} /> Giới thiệu
            </a>
            <span className="text-white/40">|</span>
            <a href="#huong-dan" className="hover:underline flex items-center gap-1 text-white">
              <Info size={12} /> Hướng dẫn
            </a>
            <span className="text-white/40">|</span>
            <a href="#gio-hang" className="hover:underline flex items-center gap-1 text-white">
              <ShoppingCart size={12} /> Giỏ hàng (0)
            </a>
            <span className="text-white/40">|</span>
            <a
              href="#lien-he"
              className="hover:underline flex items-center gap-1 text-white font-medium"
            >
              <Target size={12} /> Gửi yêu cầu hỗ trợ
            </a>
          </div>
        </div>
      </div>

      {/* 2. MAIN NAVBAR - TRÀN ĐẦY MÀN HÌNH (W-FULL) */}
      <header className="sticky top-0 z-50 w-full bg-white shadow-xs border-b border-slate-100">
        <div className="w-full px-4 sm:px-8 xl:px-12 h-[76px] flex items-center justify-between gap-4">
          {/* Logo NASANI - NASANI XIN CHÀO! */}
          <Link to="/" className="shrink-0 flex items-center gap-2 group">
            <div className="flex flex-col items-center">
              <span className="text-[32px] font-black tracking-tight text-[#d42125] font-sans leading-none">
                NASANI
              </span>
              <div className="flex items-center gap-1 mt-1">
                <span className="w-3.5 h-[1.5px] bg-[#0569b8]" />
                <span className="text-[8.5px] font-black text-[#0569b8] uppercase tracking-wider">
                  NASANI XIN CHÀO !
                </span>
                <span className="w-3.5 h-[1.5px] bg-[#0569b8]" />
              </div>
            </div>
          </Link>

          {/* Menu chính */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8 text-[14.5px] font-medium text-[#2b2b2b]">
            <div className="relative group py-2">
              <a href="#ten-mien" className="hover:text-[#0569b8] transition-colors flex items-center gap-1">
                Tên Miền <ChevronDown size={14} className="text-slate-500" />
              </a>
              <div className="absolute top-full left-0 w-60 bg-white shadow-xl rounded-b-lg border border-slate-100 py-2 hidden group-hover:block z-50 font-normal">
                <a href="#ten-mien" className="block px-4 py-2 hover:bg-blue-50 hover:text-[#0569b8] text-[13px]">
                  Kiểm tra tên miền
                </a>
                <a href="#ten-mien-qt" className="block px-4 py-2 hover:bg-blue-50 hover:text-[#0569b8] text-[13px]">
                  Bảng giá tên miền Quốc Tế
                </a>
                <a href="#ten-mien-vn" className="block px-4 py-2 hover:bg-blue-50 hover:text-[#0569b8] text-[13px]">
                  Bảng giá tên miền Việt Nam
                </a>
              </div>
            </div>

            <a href="#hosting" className="hover:text-[#0569b8] transition-colors">Hosting</a>
            <a href="#email-server" className="hover:text-[#0569b8] transition-colors">Email Server</a>
            <a href="#thiet-ke-web" className="hover:text-[#0569b8] transition-colors">Thiết Kế Website</a>
            <a href="#mau-giao-dien" className="hover:text-[#0569b8] transition-colors">Mẫu Giao Diện</a>
            <a href="#blog" className="hover:text-[#0569b8] transition-colors">Blog</a>
            <a href="#cham-soc-web" className="hover:text-[#0569b8] transition-colors">Chăm Sóc Web</a>
            <a href="#tuyen-dung" className="hover:text-[#0569b8] transition-colors">Tuyển Dụng</a>
          </nav>

          {/* Nút Đăng Nhập dạng khung bo tròn nhẹ đúng hình chụp */}
          <div className="shrink-0 flex items-center gap-2">
            {session ? (
              <Link
                to={destination}
                className="rounded-md border border-[#0569b8] bg-[#0569b8] text-white px-6 py-2 text-[14px] font-medium hover:bg-[#045291] transition-all"
              >
                Tài khoản ({profile?.user?.fullName || "Bảng điều khiển"})
              </Link>
            ) : (
              <Link
                to="/login"
                className="rounded-md border border-slate-300 bg-white text-slate-800 px-6 py-2 text-[14px] font-medium hover:border-[#0569b8] hover:text-[#0569b8] transition-all shadow-2xs"
              >
                Đăng Nhập
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* 3. HERO SECTION - #nina-slider (NỀN BN_BG_FULL.JPG CHUẨN TỪ NASANI) */}
      <section
        id="nina-slider"
        className="relative overflow-hidden w-full border-b border-slate-200 min-h-[calc(100vh-165px)] flex items-center"
      >
        <div className="w-full px-4 sm:px-8 xl:px-12 relative z-10">
          <div className="flex-slide">
            {/* CỘT TRÁI: KIỂM TRA TÊN MIỀN (2 DÒNG CĂN GIỮA + HỘP TÌM KIẾM TO HÌNH CHỮ NHẬT BO GÓC) */}
            <div className="col-l flex flex-col items-center">
              {/* 2 Dòng căn giữa chuẩn 100% yêu cầu */}
              <div className="text-center w-full max-w-[520px]">
                <h1 className="text-[34px] sm:text-[40px] font-black text-[#0569b8] leading-tight">
                  Kiểm Tra Tên Miền
                </h1>
                <p className="mt-2 text-[15px] text-[#4b5563] font-normal">
                  Đăng ký tên miền ngay từ bây giờ để bảo vệ thương hiệu của bạn
                </p>
              </div>

              {/* Ô TÌM KIẾM TÊN MIỀN TO HÌNH CHỮ NHẬT CÓ GÓC BO TRÒN (H-14, ROUNDED-xl) */}
              <form onSubmit={handleDomainSearch} className="mt-7 w-full max-w-[520px]">
                <div className="flex items-stretch rounded-xl bg-white shadow-md shadow-blue-900/10 border border-slate-200 overflow-hidden h-[54px]">
                  <input
                    type="text"
                    value={domainSearchQuery}
                    onChange={(e) => setDomainSearchQuery(e.target.value)}
                    placeholder="Nhập tên miền bạn muốn tìm kiếm..."
                    className="flex-1 px-5 text-[15px] outline-hidden text-slate-800 placeholder:text-slate-400 font-normal bg-white"
                  />
                  {/* Icon Micro giọng nói */}
                  <div className="flex items-center px-2 bg-white text-slate-400 hover:text-[#0569b8] transition-colors cursor-pointer">
                    <Mic size={20} />
                  </div>
                  {/* Nút Kiểm Tra to hình chữ nhật đỏ */}
                  <button
                    type="submit"
                    className="bg-[#d42125] hover:bg-[#b0161a] text-white px-8 font-bold text-[16px] tracking-wide transition-all cursor-pointer flex items-center justify-center shrink-0"
                  >
                    Kiểm Tra
                  </button>
                </div>

                {/* Băng chuyền 3 đuôi tên miền kèm hộp quà đỏ và mũi tên */}
                <div className="mt-5 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={prevDomainPills}
                    aria-label="Previous"
                    className="text-slate-400 hover:text-[#0569b8] p-1 cursor-pointer transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <div className="flex items-center gap-2 overflow-hidden">
                    {domainPills.slice(domainSlideIndex, domainSlideIndex + 3).map((pill) => (
                      <div
                        key={pill.ext}
                        onClick={() => {
                          setDomainSearchQuery(`mybrand${pill.ext}`);
                          handleDomainSearch();
                        }}
                        className="flex items-center gap-1.5 bg-white px-3.5 py-1.5 rounded-full border border-slate-200 shadow-2xs text-[13px] cursor-pointer hover:border-[#0569b8] transition-all"
                      >
                        <span className="font-medium text-slate-700">{pill.ext}</span>
                        <span className="font-bold text-slate-900">{pill.price}</span>
                        <span className="w-4 h-4 rounded-full bg-[#d42125] text-white grid place-items-center shrink-0">
                          <Gift size={10} />
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={nextDomainPills}
                    aria-label="Next"
                    className="text-slate-400 hover:text-[#0569b8] p-1 cursor-pointer transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                {/* Kết quả kiểm tra */}
                {searchResult && (
                  <div className="mt-4 p-3.5 rounded-xl border border-blue-200 bg-white/95 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-[14px]">
                        <CheckCircle2 size={16} className="text-emerald-600" />
                        <span className="font-bold text-slate-800">
                          {searchResult.name}
                          <span className="text-[#0569b8]">{searchResult.ext}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-black text-[#d42125]">{searchResult.price}</span>
                        <Link
                          to="/signup"
                          className="rounded-md bg-[#0569b8] text-white px-3 py-1 text-[12px] font-bold"
                        >
                          Đăng ký
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* CỘT PHẢI: HỆ THỐNG QUẢN LÝ (.part-head & .grid-nganh) */}
            <div className="w-full lg:w-auto flex-1 flex flex-col">
              {/* KHỐI TIÊU ĐỀ: LOGO CHÌA KHÓA BÊN CẠNH 3 HÀNG CHỮ (.part-head) */}
              <div className="part-head flex items-center gap-5 justify-center">
                {/* Logo chìa khóa / khiên lục giác 3D phát sáng - ẩn khi màn hình thu hẹp */}
                <div className="shrink-0 hidden xl:block">
                  <img
                    src="https://nasani.vn/assets/imgs/bn/bn_ic_left.png"
                    alt="Logo chìa khóa phần mềm Nasani"
                    className="w-24 h-24 object-contain drop-shadow-md select-none pointer-events-none"
                  />
                </div>

                {/* 3 Hàng chữ hệ thống quản lý (.info) */}
                <div className="info flex flex-col items-center">
                  {/* Hàng 1: HỆ THỐNG QUẢN LÝ */}
                  <h2 className="text-[30px] sm:text-[36px] font-black text-[#0569b8] uppercase tracking-tight leading-none">
                    HỆ THỐNG QUẢN LÝ
                  </h2>

                  {/* Hàng 2: Quản lý tập trung - Vận hành thông minh - Tối ưu hiệu suất doanh nghiệp */}
                  <p className="text-[14px] text-[#4b5563] mt-2 font-normal">
                    Quản lý tập trung - Vận hành thông minh - Tối ưu hiệu suất doanh nghiệp
                  </p>

                  {/* Hàng 3: 2 Nút pill bên dưới (.r3) */}
                  <div className="r3 mt-4">
                    <a href="#uu-diem">
                      <img
                        src="https://nasani.vn/assets/imgs/bn/bn_ic_tau.png"
                        alt="Tàu vũ trụ"
                        className="w-4 h-4 object-contain"
                      />
                      <span>Khám phá hệ thống</span>
                      <ChevronRight size={14} />
                    </a>

                    <button type="button">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Hệ thống hoạt động ổn định</span>
                      <img
                        src="https://nasani.vn/assets/imgs/bn/bn_ic_tk.png"
                        alt="Biểu đồ"
                        className="w-4 h-4 object-contain"
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* LƯỚI 6 THẺ NGÀNH NGHỀ (.grid-nganh) */}
              <div className="grid-nganh mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 w-full">
                {/* 1. Ăn Uống, Giải Trí */}
                <a href="#an-uong" className="nganh-1 group">
                  <div className="flex items-center gap-3">
                    <img
                      src="https://nasani.vn/assets/imgs/bn/bn_ic1.png"
                      alt="Ăn Uống, Giải Trí"
                      className="w-12 h-12 object-contain shrink-0"
                    />
                    <div>
                      <h3 className="text-[14.5px] font-bold leading-tight" style={{ color: "#BD8B41" }}>
                        Ăn Uống, Giải Trí
                      </h3>
                      <div className="text-[11.5px] text-slate-400 mt-0.5">Khám phá hệ thống</div>
                    </div>
                  </div>
                  <span className="w-6 h-6 rounded-full grid place-items-center text-[12px] shrink-0" style={{ backgroundColor: "rgba(189, 139, 65, .15)", color: "#BD8B41" }}>
                    <ChevronRight size={14} />
                  </span>
                </a>

                {/* 2. Buôn Bán, Bán Lẻ */}
                <a href="#buon-ban" className="nganh-2 group">
                  <div className="flex items-center gap-3">
                    <img
                      src="https://nasani.vn/assets/imgs/bn/bn_ic2.png"
                      alt="Buôn Bán, Bán Lẻ"
                      className="w-12 h-12 object-contain shrink-0"
                    />
                    <div>
                      <h3 className="text-[14.5px] font-bold leading-tight" style={{ color: "#8B3FD9" }}>
                        Buôn Bán, Bán Lẻ
                      </h3>
                      <div className="text-[11.5px] text-slate-400 mt-0.5">Khám phá hệ thống</div>
                    </div>
                  </div>
                  <span className="w-6 h-6 rounded-full grid place-items-center text-[12px] shrink-0" style={{ backgroundColor: "rgba(139, 63, 217, .15)", color: "#8B3FD9" }}>
                    <ChevronRight size={14} />
                  </span>
                </a>

                {/* 3. Chuyển Phát Quốc Tế */}
                <a href="#chuyen-phat" className="nganh-3 group">
                  <div className="flex items-center gap-3">
                    <img
                      src="https://nasani.vn/assets/imgs/bn/bn_ic3.png"
                      alt="Chuyển Phát Quốc Tế"
                      className="w-12 h-12 object-contain shrink-0"
                    />
                    <div>
                      <h3 className="text-[14.5px] font-bold leading-tight" style={{ color: "#EA580C" }}>
                        Chuyển Phát Quốc Tế
                      </h3>
                      <div className="text-[11.5px] text-slate-400 mt-0.5">Khám phá hệ thống</div>
                    </div>
                  </div>
                  <span className="w-6 h-6 rounded-full grid place-items-center text-[12px] shrink-0" style={{ backgroundColor: "rgba(234, 88, 12, .15)", color: "#EA580C" }}>
                    <ChevronRight size={14} />
                  </span>
                </a>

                {/* 4. Làm Đẹp */}
                <a href="#lam-dep" className="nganh-4 group">
                  <div className="flex items-center gap-3">
                    <img
                      src="https://nasani.vn/assets/imgs/bn/bn_ic4.png"
                      alt="Làm Đẹp"
                      className="w-12 h-12 object-contain shrink-0"
                    />
                    <div>
                      <h3 className="text-[14.5px] font-bold leading-tight" style={{ color: "#E11D48" }}>
                        Làm Đẹp
                      </h3>
                      <div className="text-[11.5px] text-slate-400 mt-0.5">Khám phá hệ thống</div>
                    </div>
                  </div>
                  <span className="w-6 h-6 rounded-full grid place-items-center text-[12px] shrink-0" style={{ backgroundColor: "rgba(225, 29, 72, .15)", color: "#E11D48" }}>
                    <ChevronRight size={14} />
                  </span>
                </a>

                {/* 5. Lưu Trú */}
                <a href="#luu-tru" className="nganh-5 group">
                  <div className="flex items-center gap-3">
                    <img
                      src="https://nasani.vn/assets/imgs/bn/bn_ic5.png"
                      alt="Lưu Trú"
                      className="w-12 h-12 object-contain shrink-0"
                    />
                    <div>
                      <h3 className="text-[14.5px] font-bold leading-tight" style={{ color: "#059669" }}>
                        Lưu Trú
                      </h3>
                      <div className="text-[11.5px] text-slate-400 mt-0.5">Khám phá hệ thống</div>
                    </div>
                  </div>
                  <span className="w-6 h-6 rounded-full grid place-items-center text-[12px] shrink-0" style={{ backgroundColor: "rgba(5, 150, 105, .15)", color: "#059669" }}>
                    <ChevronRight size={14} />
                  </span>
                </a>

                {/* 6. Vận Tải Nội Địa */}
                <a href="#van-tai" className="nganh-6 group">
                  <div className="flex items-center gap-3">
                    <img
                      src="https://nasani.vn/assets/imgs/bn/bn_ic6.png"
                      alt="Vận Tải Nội Địa"
                      className="w-12 h-12 object-contain shrink-0"
                    />
                    <div>
                      <h3 className="text-[14.5px] font-bold leading-tight" style={{ color: "#0284C7" }}>
                        Vận Tải Nội Địa
                      </h3>
                      <div className="text-[11.5px] text-slate-400 mt-0.5">Khám phá hệ thống</div>
                    </div>
                  </div>
                  <span className="w-6 h-6 rounded-full grid place-items-center text-[12px] shrink-0" style={{ backgroundColor: "rgba(2, 132, 199, .15)", color: "#0284C7" }}>
                    <ChevronRight size={14} />
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. DẢI HOTLINE TƯ VẤN VIÊN - TRÀN ĐẦY MÀN HÌNH W-FULL (#0569b8) */}
      <section className="w-full bg-[#0569b8] text-white py-2 px-2 sm:px-6 shadow-sm border-t border-blue-400/30">
        <div className="w-full">
          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-1 text-[12px] divide-x divide-blue-400/30">
            {[
              { role: "CSKH", tel: "0938.848.248" },
              { role: "Kỹ thuật", tel: "028.3715.4878" },
              { role: "Ms.Dung", tel: "093.868.5275" },
              { role: "Mr.Hải", tel: "0903.177.419" },
              { role: "Mr.Tròn", tel: "0909.135.454" },
              { role: "Ms.Phí", tel: "0708.358.121" },
              { role: "Mr.Tèo", tel: "0931.332.359" },
              { role: "Ms.Trang", tel: "0898.65.65.66" },
              { role: "Mr.Cường", tel: "0935.088.573" },
              { role: "Mr.Trọng", tel: "0908.656.425" },
            ].map((contact, idx) => (
              <a
                key={idx}
                href={`tel:${contact.tel.replace(/\./g, "")}`}
                className="px-2 py-1 hover:bg-[#045291] transition-colors flex items-center gap-1.5"
              >
                <Phone size={12} className="text-white shrink-0" />
                <div className="leading-tight">
                  <div className="font-bold text-[12px]">{contact.role}</div>
                  <div className="text-[11px] text-blue-100 font-mono tracking-tight">{contact.tel}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* 5. PHẦN "ĐỒNG HÀNH CÙNG BẠN NÂNG TẦM THƯƠNG HIỆU" (#nina-service-page) */}
      <section id="nina-service-page" className="w-full bg-white border-b border-slate-100 overflow-hidden min-h-screen flex items-center">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 xl:px-12 w-full">
          <div className="flex-services">
            {/* Cột trái: 4 ô dịch vụ trắng xanh xen kẽ (.col-l) */}
            <div className="col-l">
              <div className="grid grid-cols-2 gap-4 sm:gap-6 items-center">
                {/* Cột con trái: Thiết Kế Website & Domain (So le lên trên 40%) */}
                <div className="flex flex-col gap-4 sm:gap-6 -translate-y-6 sm:-translate-y-10 lg:-translate-y-12 transition-transform">
                  {/* 1. Thiết Kế Website (XANH - Blue) */}
                  <div className="itemService bg-[#0569C2] text-white">
                    <div className="wrap">
                      <img
                        src="https://media.nasani.vn/upload/news/dvweb-1874.png"
                        alt="Thiết Kế Website"
                        className="w-14 h-14 object-contain brightness-0 invert drop-shadow-sm mb-3"
                      />
                      <h3 className="text-[17px] font-bold text-white leading-tight text-center">
                        Thiết Kế Website
                      </h3>
                    </div>
                  </div>

                  {/* 3. Domain (TRẮNG - White) */}
                  <div className="itemService bg-white text-[#0569C2] border border-blue-100/80 shadow-md">
                    <div className="wrap">
                      <img
                        src="https://media.nasani.vn/upload/news/dvdomain-1793.png"
                        alt="Domain"
                        className="w-14 h-14 object-contain drop-shadow-sm mb-3"
                      />
                      <h3 className="text-[17px] font-bold text-[#0569C2] leading-tight text-center">
                        Domain
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Cột con phải: Web Hosting & Email Server (So le xuống dưới) */}
                <div className="flex flex-col gap-4 sm:gap-6 translate-y-6 sm:translate-y-10 lg:translate-y-12 transition-transform">
                  {/* 2. Web Hosting (TRẮNG - White) */}
                  <div className="itemService bg-white text-[#0569C2] border border-blue-100/80 shadow-md">
                    <div className="wrap">
                      <img
                        src="https://media.nasani.vn/upload/news/dvhosting-7630.png"
                        alt="Web Hosting"
                        className="w-14 h-14 object-contain drop-shadow-sm mb-3"
                      />
                      <h3 className="text-[17px] font-bold text-[#0569C2] leading-tight text-center">
                        Web Hosting
                      </h3>
                    </div>
                  </div>

                  {/* 4. Email Server (XANH - Blue) */}
                  <div className="itemService bg-[#0569C2] text-white">
                    <div className="wrap">
                      <img
                        src="https://media.nasani.vn/upload/news/dvemail-1090.png"
                        alt="Email Server"
                        className="w-14 h-14 object-contain brightness-0 invert drop-shadow-sm mb-3"
                      />
                      <h3 className="text-[17px] font-bold text-white leading-tight text-center">
                        Email Server
                      </h3>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cột phải: Đoạn chữ kết nối nâng tầm kinh doanh (.col-r & .des-service) */}
            <div className="col-r">
              <div className="des-service">
                <div className="sloganHome">Kết nối &amp; nâng tầm kinh doanh!</div>
                <div className="r2">Đồng hành Cùng Bạn Nâng Tầm Thương Hiệu</div>
                <div className="r3">
                  <p>
                    Công ty chuyên cung cấp giải pháp thiết kế website chuyên nghiệp, dịch vụ Web Hosting, Domain, Email Service uy tín và trọn gói. Với đội ngũ kỹ sư công nghệ thông tin, lập trình viên sáng tạo, nhiều kinh nghiệm, NASANI cam kết mang đến cho khách hàng những sản phẩm website tối ưu, chuẩn SEO, giao diện đẹp và vận hành mượt mà.
                  </p>
                  <p>
                    Trong thời đại số hoá mạnh mẽ, website không chỉ là một trang thông tin mà chính là bộ mặt thương hiệu, là cửa hàng trực tuyến, là công cụ marketing hiệu quả giúp doanh nghiệp tiếp cận khách hàng mọi lúc
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. BẢNG GIÁ TÊN MIỀN VIỆT NAM (1:1 Nasani) */}
      <section id="ten-mien-vn" className="w-full min-h-screen flex items-center py-16 bg-[#fafcff]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 xl:px-12 w-full">
          <div className="nina-domain-box grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Cột trái: Bảng giá */}
            <div className="lg:col-span-6">
              <div className="text-[13px] font-bold uppercase tracking-wider text-[#d42125]">
                Kết nối &amp; nâng tầm kinh doanh!
              </div>
              <h2 className="text-[28px] sm:text-[34px] font-black text-[#0569b8] uppercase mt-2">
                Bảng giá Tên miền Việt Nam
              </h2>
              
              <p className="text-[14px] text-slate-600 leading-relaxed mb-6">
                Tên miền Tiếng Việt nằm trong hệ thống tên miền quốc gia Việt Nam &quot;.vn&quot;, thuộc hệ thống tên miền đa ngữ IDNS đã được quốc tế công nhận, là xu thế phát triển của công nghiệp nội dung Internet.
              </p>

              {/* 6 Tên miền Việt Nam dạng thẻ bo góc Nasani */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { ext: ".vn", price: "820.000đ" },
                  { ext: ".com.vn", price: "691.000đ" },
                  { ext: ".gov.vn", price: "397.000đ" },
                  { ext: ".edu.vn", price: "397.000đ" },
                  { ext: ".net.vn", price: "691.000đ" },
                  { ext: ".info.vn", price: "397.000đ" },
                ].map((item) => (
                  <div
                    key={item.ext}
                    className="flex items-center justify-between px-5 py-3.5 bg-white shadow-sm border border-slate-100 rounded-[10px] hover:border-[#0569b8] hover:shadow-md transition-all group"
                  >
                    <span className="font-bold text-slate-800 text-[15px]">{item.ext}</span>
                    <span className="font-bold text-[#0569b8] text-[15px]">{item.price}</span>
                  </div>
                ))}
              </div>

              <div className="nina-readmore mt-7 flex justify-center w-full">
                <a
                  href="#ten-mien"
                  className="relative flex items-center justify-center w-auto px-8 py-3 rounded-full text-white bg-[#d42125] hover:bg-[#b0161a] font-bold text-[15px] transition-all duration-500 shadow-md text-center"
                  style={{
                    color: "#ffffff",
                    boxShadow: "5px 9px 15px rgba(212, 35, 37, 0.6)",
                  }}
                >
                  Xem Thêm Bảng Giá
                </a>
              </div>
            </div>

            {/* Cột phải: Hình ảnh minh họa chính hãng Nasani */}
            <div className="lg:col-span-6 flex justify-center">
              <img
                src="https://nasani.vn/assets/imgs/hinh_domain_vn.png"
                alt="Bảng giá Tên miền Việt Nam"
                className="w-full max-w-[500px] h-auto object-contain drop-shadow-sm"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 7. BẢNG GIÁ TÊN MIỀN QUỐC TẾ (1:1 Nasani) */}
      <section id="ten-mien-qt" className="w-full min-h-screen flex items-center py-16 bg-white">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 xl:px-12 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Cột trái: Hình ảnh minh họa Quốc tế Nasani */}
            <div className="lg:col-span-6 flex justify-center order-2 lg:order-1">
              <img
                src="https://nasani.vn/assets/imgs/hinh_domain_qt.png"
                alt="Bảng giá Tên miền Quốc Tế"
                className="w-full max-w-[500px] h-auto object-contain drop-shadow-sm"
              />
            </div>

            {/* Cột phải: Bảng giá Quốc tế */}
            <div className="lg:col-span-6 order-1 lg:order-2">
              <div className="text-[13px] font-bold uppercase tracking-wider text-[#d42125]">
                Kết nối &amp; nâng tầm kinh doanh!
              </div>
              <h2 className="text-[28px] sm:text-[34px] font-black text-[#0569b8] uppercase mt-2">
                Bảng giá Tên miền Quốc Tế
              </h2>
              
              <p className="text-[14px] text-slate-600 leading-relaxed mb-6">
                Tên miền Quốc Tế là giải pháp dành cho các cá nhân hoặc doanh nghiệp muốn mở rộng kinh doanh, bảo vệ thương hiệu trên môi trường Internet toàn cầu.
              </p>

              {/* 6 Tên miền Quốc tế */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { ext: ".com", price: "452.520đ" },
                  { ext: ".net", price: "463.320đ" },
                  { ext: ".info", price: "858.600đ" },
                  { ext: ".org", price: "448.200đ" },
                  { ext: ".biz", price: "583.200đ" },
                  { ext: ".me", price: "766.800đ" },
                ].map((item) => (
                  <div
                    key={item.ext}
                    className="flex items-center justify-between px-5 py-3.5 bg-white shadow-sm border border-slate-100 rounded-[10px] hover:border-[#0569b8] hover:shadow-md transition-all group"
                  >
                    <span className="font-bold text-slate-800 text-[15px]">{item.ext}</span>
                    <span className="font-bold text-[#0569b8] text-[15px]">{item.price}</span>
                  </div>
                ))}
              </div>

              <div className="nina-readmore mt-7 flex justify-center w-full">
                <a
                  href="#ten-mien"
                  className="relative flex items-center justify-center w-auto px-8 py-3 rounded-full text-white bg-[#d42125] hover:bg-[#b0161a] font-bold text-[15px] transition-all duration-500 shadow-md text-center"
                  style={{
                    color: "#ffffff",
                    boxShadow: "5px 9px 15px rgba(212, 35, 37, 0.6)",
                  }}
                >
                  Xem Thêm Bảng Giá
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WRAPPER BG HOSTING & WEBSITE CHUYỂN GIAO NỀN PARABOL (.bgHostWeb) */}
      <div className="bgHostWeb w-full overflow-hidden">
        {/* 8. BẢNG GIÁ HOSTING */}
        <section id="hosting" className="relative w-full pt-16 pb-12 overflow-hidden">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-8">
            <div className="nina-title text-center max-w-[910px] mx-auto mb-6">
              <div className="sloganHome sloganHome3">Kết nối & nâng tầm kinh doanh!</div>
              <h2 className="titleHome titleHome2 uppercase text-xl md:text-3xl font-bold">
                Bảng Giá Hosting
              </h2>
              <p className="txtHome txtHome2">
                Website của bạn sẽ bảo mật, ổn định và nhanh gấp nhiều lần khi sử dụng hosting tại công ty chúng tôi
              </p>
            </div>

            <div className="nina-tabs-host text-center mt-6 mb-8">
              <div className="nav-list inline-block">
                <div className="flex justify-center items-center gap-3 flex-wrap">
                  {[
                    { id: "vip", label: "Hosting Vip" },
                    { id: "enterprise", label: "Hosting Doanh Nghiệp" },
                    { id: "pro", label: "Hosting Chuyên Nghiệp" },
                    { id: "standard", label: "Hosting Phổ Thông" },
                    { id: "personal", label: "Hosting Cá Nhân" },
                  ].map((tab) => (
                    <button
                      type="button"
                      key={tab.id}
                      onClick={() => setHostingTab(tab.id as any)}
                      className={`nav-list-item capitalize px-6 py-2 transition-all duration-200 cursor-pointer ${
                        hostingTab === tab.id ? "active" : ""
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Khung Carousel Hosting có 2 nút tròn điều hướng < và > trên nền parabol */}
            <div className="relative mx-0 md:mx-6 lg:mx-10">
              {/* Nút mũi tên trái */}
              <button
                type="button"
                aria-label="Previous"
                className="hidden md:flex absolute -left-6 lg:-left-8 top-1/2 -translate-y-1/2 z-20 w-[50px] h-[50px] bg-white rounded-full shadow-[0_0_20px_rgba(0,96,59,.14)] items-center justify-center text-xl text-[#0569b8] hover:scale-105 transition-all cursor-pointer"
              >
                <ChevronLeft size={24} />
              </button>

              {/* Nút mũi tên phải */}
              <button
                type="button"
                aria-label="Next"
                className="hidden md:flex absolute -right-6 lg:-right-8 top-1/2 -translate-y-1/2 z-20 w-[50px] h-[50px] bg-white rounded-full shadow-[0_0_20px_rgba(0,96,59,.14)] items-center justify-center text-xl text-[#0569b8] hover:scale-105 transition-all cursor-pointer"
              >
                <ChevronRight size={24} />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch pt-2">
                {/* 1. Gói 350GB (bên trái) */}
                <div className="nina-col-hosting">
                  <div className="nina-item-hosting nina-item-hosting-home">
                    <div className="nina-header-hosting relative pt-6 pb-2">
                      <div className="hosting-bonus">
                        <div>
                          <div className="txt">
                            <p>Hỗ trợ chăm</p>
                            <p>sóc Website</p>
                          </div>
                        </div>
                        <img src="https://nasani.vn/assets/imgs/ic_qua.png" alt="bonus" className="ringRing" />
                      </div>

                      <div className="nina-title-hosting">
                        <div className="wrap">
                          <p>Gói</p>
                          <h3>350GB</h3>
                        </div>
                      </div>

                      <div className="nina-price-hosting pt-3">
                        <div className="nina-text-price1 text-md">Chỉ từ</div>
                        <div className="nina-text-price2">9.540.000</div>
                        <div className="nina-text-price3 text-md">vnđ / tháng</div>
                      </div>
                    </div>

                    <div className="nina-body-hosting relative px-6 pt-4 pb-6">
                      <ul>
                        <li className="flex items-center justify-between py-3 border-b border-b-[#CCDAEE] text-sm">
                          <div className="nina-info-hosting">Dung lượng</div>
                          <div className="nina-info-parameter font-bold">350</div>
                        </li>
                        <li className="flex items-center justify-between py-3 border-b border-b-[#CCDAEE] text-sm">
                          <div className="nina-info-hosting">Băng thông</div>
                          <div className="nina-info-parameter font-bold">KGH</div>
                        </li>
                        <li className="flex items-center justify-between py-3 border-b border-b-[#CCDAEE] text-sm">
                          <div className="nina-info-hosting">Subdomain</div>
                          <div className="nina-info-parameter font-bold">KGH</div>
                        </li>
                        <li className="flex items-center justify-between py-3 border-b border-b-[#CCDAEE] text-sm">
                          <div className="nina-info-hosting">Mysql</div>
                          <div className="nina-info-parameter font-bold">350</div>
                        </li>
                        <li className="flex items-center justify-between py-3 border-b border-b-[#CCDAEE] text-sm">
                          <div className="nina-info-hosting">Địa chỉ Mail</div>
                          <div className="nina-info-parameter font-bold">KGH</div>
                        </li>
                        <li className="flex items-center justify-between py-3 border-b border-b-[#CCDAEE] text-sm">
                          <div className="nina-info-hosting">Backup</div>
                          <div className="nina-info-parameter font-bold">Miễn phí</div>
                        </li>
                        <li className="flex items-center justify-between py-3 text-sm">
                          <div className="nina-info-hosting">Chi phí/năm</div>
                          <div className="nina-info-parameter font-bold text-[#BD1042]">114.480.000đ</div>
                        </li>
                      </ul>

                      <div className="nina-readmore mt-5 text-center">
                        <Link
                          to="/signup"
                          className="btnGraHome group w-auto capitalize flex items-center justify-center px-8 py-3 rounded-full relative transition-all duration-500"
                        >
                          <span>Đăng ký ngay</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Gói 200GB (ở giữa) */}
                <div className="nina-col-hosting">
                  <div className="nina-item-hosting nina-item-hosting-home">
                    <div className="nina-header-hosting relative pt-6 pb-2">
                      <div className="hosting-bonus">
                        <div>
                          <div className="txt">
                            <p>Hỗ trợ chăm</p>
                            <p>sóc Website</p>
                          </div>
                        </div>
                        <img src="https://nasani.vn/assets/imgs/ic_qua.png" alt="bonus" className="ringRing" />
                      </div>

                      <div className="nina-title-hosting">
                        <div className="wrap">
                          <p>Gói</p>
                          <h3>200GB</h3>
                        </div>
                      </div>

                      <div className="nina-price-hosting pt-3">
                        <div className="nina-text-price1 text-md">Chỉ từ</div>
                        <div className="nina-text-price2">6.480.000</div>
                        <div className="nina-text-price3 text-md">vnđ / tháng</div>
                      </div>
                    </div>

                    <div className="nina-body-hosting relative px-6 pt-4 pb-6">
                      <ul>
                        <li className="flex items-center justify-between py-3 border-b border-b-[#CCDAEE] text-sm">
                          <div className="nina-info-hosting">Dung lượng</div>
                          <div className="nina-info-parameter font-bold">200</div>
                        </li>
                        <li className="flex items-center justify-between py-3 border-b border-b-[#CCDAEE] text-sm">
                          <div className="nina-info-hosting">Băng thông</div>
                          <div className="nina-info-parameter font-bold">KGH</div>
                        </li>
                        <li className="flex items-center justify-between py-3 border-b border-b-[#CCDAEE] text-sm">
                          <div className="nina-info-hosting">Subdomain</div>
                          <div className="nina-info-parameter font-bold">KGH</div>
                        </li>
                        <li className="flex items-center justify-between py-3 border-b border-b-[#CCDAEE] text-sm">
                          <div className="nina-info-hosting">Mysql</div>
                          <div className="nina-info-parameter font-bold">200</div>
                        </li>
                        <li className="flex items-center justify-between py-3 border-b border-b-[#CCDAEE] text-sm">
                          <div className="nina-info-hosting">Địa chỉ Mail</div>
                          <div className="nina-info-parameter font-bold">KGH</div>
                        </li>
                        <li className="flex items-center justify-between py-3 border-b border-b-[#CCDAEE] text-sm">
                          <div className="nina-info-hosting">Backup</div>
                          <div className="nina-info-parameter font-bold">Miễn phí</div>
                        </li>
                        <li className="flex items-center justify-between py-3 text-sm">
                          <div className="nina-info-hosting">Chi phí/năm</div>
                          <div className="nina-info-parameter font-bold text-[#BD1042]">77.760.000đ</div>
                        </li>
                      </ul>

                      <div className="nina-readmore mt-5 text-center">
                        <Link
                          to="/signup"
                          className="btnGraHome group w-auto capitalize flex items-center justify-center px-8 py-3 rounded-full relative transition-all duration-500"
                        >
                          <span>Đăng ký ngay</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Gói 150GB (bên phải) */}
                <div className="nina-col-hosting">
                  <div className="nina-item-hosting nina-item-hosting-home">
                    <div className="nina-header-hosting relative pt-6 pb-2">
                      <div className="nina-title-hosting">
                        <div className="wrap">
                          <p>Gói</p>
                          <h3>150GB</h3>
                        </div>
                      </div>

                      <div className="nina-price-hosting pt-3">
                        <div className="nina-text-price1 text-md">Chỉ từ</div>
                        <div className="nina-text-price2">5.400.000</div>
                        <div className="nina-text-price3 text-md">vnđ / tháng</div>
                      </div>
                    </div>

                    <div className="nina-body-hosting relative px-6 pt-4 pb-6">
                      <ul>
                        <li className="flex items-center justify-between py-3 border-b border-b-[#CCDAEE] text-sm">
                          <div className="nina-info-hosting">Dung lượng</div>
                          <div className="nina-info-parameter font-bold">150</div>
                        </li>
                        <li className="flex items-center justify-between py-3 border-b border-b-[#CCDAEE] text-sm">
                          <div className="nina-info-hosting">Băng thông</div>
                          <div className="nina-info-parameter font-bold">KGH</div>
                        </li>
                        <li className="flex items-center justify-between py-3 border-b border-b-[#CCDAEE] text-sm">
                          <div className="nina-info-hosting">Subdomain</div>
                          <div className="nina-info-parameter font-bold">KGH</div>
                        </li>
                        <li className="flex items-center justify-between py-3 border-b border-b-[#CCDAEE] text-sm">
                          <div className="nina-info-hosting">Mysql</div>
                          <div className="nina-info-parameter font-bold">150</div>
                        </li>
                        <li className="flex items-center justify-between py-3 border-b border-b-[#CCDAEE] text-sm">
                          <div className="nina-info-hosting">Địa chỉ Mail</div>
                          <div className="nina-info-parameter font-bold">KGH</div>
                        </li>
                        <li className="flex items-center justify-between py-3 border-b border-b-[#CCDAEE] text-sm">
                          <div className="nina-info-hosting">Backup</div>
                          <div className="nina-info-parameter font-bold">Miễn phí</div>
                        </li>
                        <li className="flex items-center justify-between py-3 text-sm">
                          <div className="nina-info-hosting">Chi phí/năm</div>
                          <div className="nina-info-parameter font-bold text-[#BD1042]">64.800.000đ</div>
                        </li>
                      </ul>

                      <div className="nina-readmore mt-5 text-center">
                        <Link
                          to="/signup"
                          className="btnGraHome group w-auto capitalize flex items-center justify-center px-8 py-3 rounded-full relative transition-all duration-500"
                        >
                          <span>Đăng ký ngay</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      {/* 9. BẢNG GIÁ THIẾT KẾ WEBSITE (9 Gói) */}
      <section id="thiet-ke-web" className="pt-2 pb-24 bg-transparent relative z-30">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8">
          <div className="text-center max-w-[910px] mx-auto mb-14">
            <div className="sloganHome sloganWeb text-center">Kết nối & nâng tầm kinh doanh!</div>
            <h2 className="titleHome uppercase text-xl md:text-3xl font-bold">
              Bảng Giá Thiết Kế Website
            </h2>
            <p className="txtHome txtHomeWeb">
              Tạo website chuyên nghiệp với giao diện đẹp mắt, hỗ trợ mua sắm online tiện lợi sẽ khiến cho khách hàng yêu quý, tin tưởng hơn vào sản phẩm và thương hiệu của bạn.
            </p>

            <div className="mt-7 inline-flex rounded-full bg-white p-1 border border-slate-200 shadow-xs">
              <button
                type="button"
                onClick={() => setWebCategory("all")}
                className={`px-5 py-2 rounded-full text-[13px] font-bold transition-all ${
                  webCategory === "all" ? "bg-[#0569b8] text-white" : "text-slate-700 hover:text-[#0569b8]"
                }`}
              >
                Tất cả 9 gói
              </button>
              <button
                type="button"
                onClick={() => setWebCategory("basic")}
                className={`px-5 py-2 rounded-full text-[13px] font-bold transition-all ${
                  webCategory === "basic" ? "bg-[#0569b8] text-white" : "text-slate-700 hover:text-[#0569b8]"
                }`}
              >
                Gói Cơ Bản (01, 02, 03)
              </button>
              <button
                type="button"
                onClick={() => setWebCategory("popular")}
                className={`px-5 py-2 rounded-full text-[13px] font-bold transition-all ${
                  webCategory === "popular" ? "bg-[#0569b8] text-white" : "text-slate-700 hover:text-[#0569b8]"
                }`}
              >
                Gói Phổ Thông (01, 02, 03)
              </button>
              <button
                type="button"
                onClick={() => setWebCategory("advanced")}
                className={`px-5 py-2 rounded-full text-[13px] font-bold transition-all ${
                  webCategory === "advanced" ? "bg-[#0569b8] text-white" : "text-slate-700 hover:text-[#0569b8]"
                }`}
              >
                Gói Nâng Cao (01, 02, 03)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {(webCategory === "all" || webCategory === "basic") && (
              <div className="rounded-2xl bg-white p-7 border border-slate-200 shadow-sm hover:border-[#0569b8] hover:shadow-lg transition-all flex flex-col justify-between">
                <div>
                  <h3 className="text-[20px] font-black text-slate-800 uppercase text-center pb-3 border-b border-slate-100">
                    Gói cơ bản 01
                  </h3>
                  <div className="text-center my-4">
                    <span className="text-[13px] text-slate-400 font-bold">Giá: </span>
                    <span className="text-[26px] font-black text-[#d42125]">LIÊN HỆ</span>
                    <span className="text-[12px] text-slate-400"> đ/website</span>
                    <p className="text-[11.5px] text-slate-500 mt-1">Liên hệ để nhận báo giá ngay</p>
                  </div>
                  <ul className="space-y-2 text-[13px] text-slate-600 border-t border-slate-100 pt-4">
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Website cơ bản</li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Tìm kiếm cơ bản</li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Tối ưu link chuẩn SEO</li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Đăng ký nhận tin</li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Nút gọi điện, Zalo/Facebook</li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Mobile / Responsive</li>
                  </ul>
                </div>
                <a
                  href="#lien-he"
                  className="mt-6 block w-full text-center rounded-full border-2 border-[#0569b8] text-[#0569b8] hover:bg-blue-50 py-2.5 text-[13px] font-bold transition-colors"
                >
                  Liên hệ ngay
                </a>
              </div>
            )}

            {(webCategory === "all" || webCategory === "basic") && (
              <div className="rounded-2xl bg-white p-7 border border-slate-200 shadow-sm hover:border-[#0569b8] hover:shadow-lg transition-all flex flex-col justify-between">
                <div>
                  <h3 className="text-[20px] font-black text-slate-800 uppercase text-center pb-3 border-b border-slate-100">
                    Gói cơ bản 02
                  </h3>
                  <div className="text-center my-4">
                    <span className="text-[13px] text-slate-400 font-bold">Giá: </span>
                    <span className="text-[26px] font-black text-[#d42125]">LIÊN HỆ</span>
                    <span className="text-[12px] text-slate-400"> đ/website</span>
                    <p className="text-[11.5px] text-slate-500 mt-1">Liên hệ để nhận báo giá ngay</p>
                  </div>
                  <ul className="space-y-2 text-[13px] text-slate-600 border-t border-slate-100 pt-4">
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Website cơ bản nâng cao</li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Popup quảng cáo khuyến mãi</li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Đóng dấu bản quyền hình ảnh</li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Nút gọi điện, Zalo/Facebook</li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Mục lục bài viết / Sản phẩm</li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Mobile / Responsive</li>
                  </ul>
                </div>
                <a
                  href="#lien-he"
                  className="mt-6 block w-full text-center rounded-full border-2 border-[#0569b8] text-[#0569b8] hover:bg-blue-50 py-2.5 text-[13px] font-bold transition-colors"
                >
                  Liên hệ ngay
                </a>
              </div>
            )}

            {(webCategory === "all" || webCategory === "basic") && (
              <div className="rounded-2xl bg-white p-7 border border-slate-200 shadow-sm hover:border-[#0569b8] hover:shadow-lg transition-all flex flex-col justify-between">
                <div>
                  <h3 className="text-[20px] font-black text-slate-800 uppercase text-center pb-3 border-b border-slate-100">
                    Gói cơ bản 03
                  </h3>
                  <div className="text-center my-4">
                    <span className="text-[13px] text-slate-400 font-bold">Giá: </span>
                    <span className="text-[26px] font-black text-[#d42125]">LIÊN HỆ</span>
                    <span className="text-[12px] text-slate-400"> đ/website</span>
                    <p className="text-[11.5px] text-slate-500 mt-1">Liên hệ để nhận báo giá ngay</p>
                  </div>
                  <ul className="space-y-2 text-[13px] text-slate-600 border-t border-slate-100 pt-4">
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Đầy đủ tính năng Gói 02</li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Tích hợp Google Dịch đa ngôn ngữ</li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Bản đồ chỉ đường tương tác</li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Tối ưu tốc độ tải trang nhanh</li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Bảo mật tường lửa chống hack</li>
                  </ul>
                </div>
                <a
                  href="#lien-he"
                  className="mt-6 block w-full text-center rounded-full border-2 border-[#0569b8] text-[#0569b8] hover:bg-blue-50 py-2.5 text-[13px] font-bold transition-colors"
                >
                  Liên hệ ngay
                </a>
              </div>
            )}

            {(webCategory === "all" || webCategory === "popular") && (
              <div className="rounded-2xl bg-white p-7 border-2 border-[#0569b8] shadow-md hover:shadow-xl transition-all flex flex-col justify-between relative">
                <span className="absolute -top-3 right-6 bg-[#0569b8] text-white text-[10px] font-black uppercase px-3 py-0.5 rounded-full">
                  Khuyên dùng
                </span>
                <div>
                  <h3 className="text-[20px] font-black text-slate-800 uppercase text-center pb-3 border-b border-slate-100">
                    Gói phổ thông 01
                  </h3>
                  <div className="text-center my-4">
                    <span className="text-[13px] text-slate-400 font-bold">Giá: </span>
                    <span className="text-[26px] font-black text-[#d42125]">LIÊN HỆ</span>
                    <span className="text-[12px] text-slate-400"> đ/website</span>
                    <p className="text-[11.5px] text-slate-500 mt-1">Liên hệ để nhận báo giá ngay</p>
                  </div>
                  <ul className="space-y-2 text-[13px] text-slate-600 border-t border-slate-100 pt-4">
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Toàn bộ tính năng Gói cơ bản 03</li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Chứng chỉ số bảo mật SSL cao cấp</li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Giỏ hàng / Đặt lịch cơ bản</li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Thông báo đẩy (Onesignal)</li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Hỗ trợ song ngữ Anh - Việt</li>
                  </ul>
                </div>
                <a
                  href="#lien-he"
                  className="mt-6 block w-full text-center rounded-full bg-[#0569b8] hover:bg-[#045291] text-white py-2.5 text-[13px] font-bold transition-colors"
                >
                  Liên hệ ngay
                </a>
              </div>
            )}

            {(webCategory === "all" || webCategory === "popular") && (
              <div className="rounded-2xl bg-white p-7 border border-slate-200 shadow-sm hover:border-[#0569b8] hover:shadow-lg transition-all flex flex-col justify-between">
                <div>
                  <h3 className="text-[20px] font-black text-slate-800 uppercase text-center pb-3 border-b border-slate-100">
                    Gói phổ thông 02
                  </h3>
                  <div className="text-center my-4">
                    <span className="text-[13px] text-slate-400 font-bold">Giá: </span>
                    <span className="text-[26px] font-black text-[#d42125]">LIÊN HỆ</span>
                    <span className="text-[12px] text-slate-400"> đ/website</span>
                    <p className="text-[11.5px] text-slate-500 mt-1">Liên hệ để nhận báo giá ngay</p>
                  </div>
                  <ul className="space-y-2 text-[13px] text-slate-600 border-t border-slate-100 pt-4">
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Giao diện độc quyền thiết kế riêng</li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Tích hợp chat Zalo / Messenger</li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Quản lý sản phẩm đa danh mục</li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Form thu thập thông tin khách hàng</li>
                  </ul>
                </div>
                <a
                  href="#lien-he"
                  className="mt-6 block w-full text-center rounded-full border-2 border-[#0569b8] text-[#0569b8] hover:bg-blue-50 py-2.5 text-[13px] font-bold transition-colors"
                >
                  Liên hệ ngay
                </a>
              </div>
            )}

            {(webCategory === "all" || webCategory === "popular") && (
              <div className="rounded-2xl bg-white p-7 border border-slate-200 shadow-sm hover:border-[#0569b8] hover:shadow-lg transition-all flex flex-col justify-between">
                <div>
                  <h3 className="text-[20px] font-black text-slate-800 uppercase text-center pb-3 border-b border-slate-100">
                    Gói phổ thông 03
                  </h3>
                  <div className="text-center my-4">
                    <span className="text-[13px] text-slate-400 font-bold">Giá: </span>
                    <span className="text-[26px] font-black text-[#d42125]">LIÊN HỆ</span>
                    <span className="text-[12px] text-slate-400"> đ/website</span>
                    <p className="text-[11.5px] text-slate-500 mt-1">Liên hệ để nhận báo giá ngay</p>
                  </div>
                  <ul className="space-y-2 text-[13px] text-slate-600 border-t border-slate-100 pt-4">
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Chuẩn SEO Google toàn diện Onpage</li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Module Tin tức &amp; Dự án hoàn thành</li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Tối ưu trải nghiệm mua sắm Mobile</li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Bàn giao toàn bộ mã nguồn website</li>
                  </ul>
                </div>
                <a
                  href="#lien-he"
                  className="mt-6 block w-full text-center rounded-full border-2 border-[#0569b8] text-[#0569b8] hover:bg-blue-50 py-2.5 text-[13px] font-bold transition-colors"
                >
                  Liên hệ ngay
                </a>
              </div>
            )}

            {(webCategory === "all" || webCategory === "advanced") && (
              <div className="rounded-2xl bg-white p-7 border border-slate-200 shadow-sm hover:border-[#0569b8] hover:shadow-lg transition-all flex flex-col justify-between">
                <div>
                  <h3 className="text-[20px] font-black text-slate-800 uppercase text-center pb-3 border-b border-slate-100">
                    Gói nâng cao 01
                  </h3>
                  <div className="text-center my-4">
                    <span className="text-[13px] text-slate-400 font-bold">Giá: </span>
                    <span className="text-[26px] font-black text-[#d42125]">LIÊN HỆ</span>
                    <span className="text-[12px] text-slate-400"> đ/website</span>
                    <p className="text-[11.5px] text-slate-500 mt-1">Liên hệ để nhận báo giá ngay</p>
                  </div>
                  <ul className="space-y-2 text-[13px] text-slate-600 border-t border-slate-100 pt-4">
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Toàn bộ tính năng Gói phổ thông 01</li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Hệ thống Đăng ký &amp; Đăng nhập thành viên</li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Tìm kiếm sản phẩm nâng cao đa bộ lọc</li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Phân quyền quản trị nhiều cấp độ</li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Tích hợp thanh toán online VietQR/MoMo</li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Tự động tính phí vận chuyển GHN/GHTK</li>
                  </ul>
                </div>
                <a
                  href="#lien-he"
                  className="mt-6 block w-full text-center rounded-full border-2 border-[#0569b8] text-[#0569b8] hover:bg-blue-50 py-2.5 text-[13px] font-bold transition-colors"
                >
                  Liên hệ ngay
                </a>
              </div>
            )}

            {(webCategory === "all" || webCategory === "advanced") && (
              <div className="rounded-2xl bg-white p-7 border border-slate-200 shadow-sm hover:border-[#0569b8] hover:shadow-lg transition-all flex flex-col justify-between">
                <div>
                  <h3 className="text-[20px] font-black text-slate-800 uppercase text-center pb-3 border-b border-slate-100">
                    Gói nâng cao 02
                  </h3>
                  <div className="text-center my-4">
                    <span className="text-[13px] text-slate-400 font-bold">Giá: </span>
                    <span className="text-[26px] font-black text-[#d42125]">LIÊN HỆ</span>
                    <span className="text-[12px] text-slate-400"> đ/website</span>
                    <p className="text-[11.5px] text-slate-500 mt-1">Liên hệ để nhận báo giá ngay</p>
                  </div>
                  <ul className="space-y-2 text-[13px] text-slate-600 border-t border-slate-100 pt-4">
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Đồng bộ kho hàng Shopee / TikTok Shop</li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Hệ thống khuyến mãi, mã giảm giá Coupon</li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Báo cáo doanh thu &amp; đơn hàng tự động</li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Hỗ trợ kỹ thuật 24/7 trực tiếp</li>
                  </ul>
                </div>
                <a
                  href="#lien-he"
                  className="mt-6 block w-full text-center rounded-full border-2 border-[#0569b8] text-[#0569b8] hover:bg-blue-50 py-2.5 text-[13px] font-bold transition-colors"
                >
                  Liên hệ ngay
                </a>
              </div>
            )}

            {(webCategory === "all" || webCategory === "advanced") && (
              <div className="rounded-2xl bg-white p-7 border border-slate-200 shadow-sm hover:border-[#0569b8] hover:shadow-lg transition-all flex flex-col justify-between">
                <div>
                  <h3 className="text-[20px] font-black text-slate-800 uppercase text-center pb-3 border-b border-slate-100">
                    Gói nâng cao 03
                  </h3>
                  <div className="text-center my-4">
                    <span className="text-[13px] text-slate-400 font-bold">Giá: </span>
                    <span className="text-[26px] font-black text-[#d42125]">LIÊN HỆ</span>
                    <span className="text-[12px] text-slate-400"> đ/website</span>
                    <p className="text-[11.5px] text-slate-500 mt-1">Liên hệ để nhận báo giá ngay</p>
                  </div>
                  <ul className="space-y-2 text-[13px] text-slate-600 border-t border-slate-100 pt-4">
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Nền tảng thương mại điện tử quy mô lớn</li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Tích hợp API ERP / CRM của doanh nghiệp</li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Chịu tải hàng chục ngàn lượt truy cập đồng thời</li>
                    <li className="flex items-center gap-2"><Check size={15} className="text-emerald-600" /> Cam kết SLA 99.99% vận hành ổn định</li>
                  </ul>
                </div>
                <a
                  href="#lien-he"
                  className="mt-6 block w-full text-center rounded-full border-2 border-[#0569b8] text-[#0569b8] hover:bg-blue-50 py-2.5 text-[13px] font-bold transition-colors"
                >
                  Liên hệ ngay
                </a>
              </div>
            )}
          </div>
        </div>
      </section>
      </div>

      {/* 10. ƯU ĐIỂM NỔI BẬT CỦA DỊCH VỤ THIẾT KẾ WEBSITE (1:1 Nasani) */}
      <section id="uu-diem" className="py-20 bg-white min-h-screen flex items-center border-b border-slate-100">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 xl:px-12 w-full">
          <div className="flex-uudiem">
            {/* Cột trái: Hình minh họa 3D hinh_uudiem_web.png */}
            <div className="col-l">
              <img
                src="https://nasani.vn/assets/imgs/hinh_uudiem_web.png"
                alt="Ưu điểm nổi bật của dịch vụ thiết kế website"
                className="w-full max-w-[540px] h-auto object-contain drop-shadow-sm select-none pointer-events-none"
              />
            </div>

            {/* Cột phải: Tiêu đề + 5 thẻ ưu điểm */}
            <div className="col-r">
              <div className="des-service">
                <div className="sloganHome">Kết nối &amp; nâng tầm kinh doanh!</div>
                <div className="r2">Ưu Điểm Nổi Bật Của Dịch Vụ Thiết Kế Website</div>
                <div className="r3">
                  <p>
                    Chúng tôi luôn đồng hành cùng khách hàng của mình trong việc xây dựng nền tảng Marketing phù hợp, hướng đến sự nhận diện thương hiệu thật dễ dàng và phát triển đơn hàng một cách bền vững.
                  </p>
                </div>
              </div>

              {/* Lưới 5 thẻ ưu điểm (.gridUudiem) */}
              <div className="gridUudiem">
                {/* 1. Chi phí hợp lý */}
                <div className="itemUuDiem">
                  <div className="img inline-block">
                    <span className="bg-emerald-500/10">
                      <div
                        className="w-[32px] h-[32px] bg-emerald-600"
                        style={{
                          WebkitMask: "url(https://media.nasani.vn/upload/news/price-tag-3-line-3515.svg) no-repeat center / contain",
                          mask: "url(https://media.nasani.vn/upload/news/price-tag-3-line-3515.svg) no-repeat center / contain",
                        }}
                      />
                    </span>
                  </div>
                  <div className="info">
                    <h3>Chi phí hợp lý</h3>
                  </div>
                </div>

                {/* 2. Tiến độ chặt chẽ */}
                <div className="itemUuDiem">
                  <div className="img inline-block">
                    <span className="bg-purple-500/10">
                      <div
                        className="w-[32px] h-[32px] bg-purple-600"
                        style={{
                          WebkitMask: "url(https://media.nasani.vn/upload/news/time-line-3277.svg) no-repeat center / contain",
                          mask: "url(https://media.nasani.vn/upload/news/time-line-3277.svg) no-repeat center / contain",
                        }}
                      />
                    </span>
                  </div>
                  <div className="info">
                    <h3>Tiến độ chặt chẽ</h3>
                  </div>
                </div>

                {/* 3. Tương tác liên tục, kịp thời */}
                <div className="itemUuDiem">
                  <div className="img inline-block">
                    <span className="bg-amber-500/10">
                      <div
                        className="w-[32px] h-[32px] bg-amber-600"
                        style={{
                          WebkitMask: "url(https://media.nasani.vn/upload/news/shake-hands-line-6683.svg) no-repeat center / contain",
                          mask: "url(https://media.nasani.vn/upload/news/shake-hands-line-6683.svg) no-repeat center / contain",
                        }}
                      />
                    </span>
                  </div>
                  <div className="info">
                    <h3>Tương tác liên tục, kịp thời</h3>
                  </div>
                </div>

                {/* 4. Chất lượng vượt trội */}
                <div className="itemUuDiem">
                  <div className="img inline-block">
                    <span className="bg-lime-500/10">
                      <div
                        className="w-[32px] h-[32px] bg-lime-600"
                        style={{
                          WebkitMask: "url(https://media.nasani.vn/upload/news/seo-line-1540.svg) no-repeat center / contain",
                          mask: "url(https://media.nasani.vn/upload/news/seo-line-1540.svg) no-repeat center / contain",
                        }}
                      />
                    </span>
                  </div>
                  <div className="info">
                    <h3>Chất lượng vượt trội</h3>
                  </div>
                </div>

                {/* 5. Hỗ trợ vận hành */}
                <div className="itemUuDiem">
                  <div className="img inline-block">
                    <span className="bg-rose-500/10">
                      <div
                        className="w-[32px] h-[32px] bg-rose-600"
                        style={{
                          WebkitMask: "url(https://media.nasani.vn/upload/news/customer-service-2-fill-3390.svg) no-repeat center / contain",
                          mask: "url(https://media.nasani.vn/upload/news/customer-service-2-fill-3390.svg) no-repeat center / contain",
                        }}
                      />
                    </span>
                  </div>
                  <div className="info">
                    <h3>Hỗ trợ vận hành</h3>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 11. QUY TRÌNH THIẾT KẾ WEBSITE (5 Bước SVG chính gốc Nasani) */}
      <section id="quy-trinh" className="py-24 bg-[#fafcff] border-b border-slate-100">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8">
          <div className="text-center max-w-[800px] mx-auto mb-16">
            <h2 className="text-[32px] sm:text-[38px] font-black text-[#0569b8] uppercase">
              Quy trình Thiết kế website
            </h2>
            <div className="w-20 h-1 bg-[#d42125] mx-auto my-3" />
            <p className="text-[15px] text-slate-600">
              Chỉ với 5 bước đơn giản dưới đây bạn đã sở hữu một website chuyên nghiệp.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              {
                step: "BƯỚC 01",
                name: "Tư vấn khách hàng",
                icon: "https://media.nasani.vn/upload/news/b1-2275.svg",
                desc: "Tiếp nhận thông tin, khảo sát nhu cầu và tư vấn giải pháp tối ưu.",
              },
              {
                step: "BƯỚC 02",
                name: "Thiết kế giao diện",
                icon: "https://media.nasani.vn/upload/news/b2-8437.svg",
                desc: "Lên layout bản vẽ UI/UX độc quyền theo nhận diện thương hiệu.",
              },
              {
                step: "BƯỚC 03",
                name: "Khách hàng duyệt giao diện",
                icon: "https://media.nasani.vn/upload/news/b3-2229.svg",
                desc: "Trao đổi, chỉnh sửa chi tiết và thống nhất giao diện trước khi lập trình.",
              },
              {
                step: "BƯỚC 04",
                name: "Triển khai dự án",
                icon: "https://media.nasani.vn/upload/news/b4-1110.svg",
                desc: "Lập trình tính năng, tối ưu SEO, cắt HTML5/CSS3 chuẩn Responsive.",
              },
              {
                step: "BƯỚC 05",
                name: "Nghiệm thu bàn giao",
                icon: "https://media.nasani.vn/upload/news/b5-1985.svg",
                desc: "Kiểm thử toàn diện, bàn giao source code và hướng dẫn quản trị.",
              },
            ].map((st, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-lg hover:border-[#0569b8] transition-all flex flex-col items-center text-center group"
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-50 grid place-items-center mb-4 group-hover:scale-110 transition-transform">
                  <img src={st.icon} alt={st.name} className="w-10 h-10 object-contain" />
                </div>
                <div className="text-[12px] font-black text-[#d42125] tracking-wider uppercase">{st.step}</div>
                <h4 className="text-[16px] font-black text-slate-800 mt-1">{st.name}</h4>
                <p className="text-[12px] text-slate-500 mt-2 leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 12. SẴN SÀNG ĐỂ XÂY DỰNG, VẬN HÀNH WEBSITE CHO BẠN (#nina-support-page - 1:1 NASANI) */}
      <section id="nina-support-page" className="py-12 lg:py-16 relative z-20">
        <div className="max-w-[1360px] mx-auto px-4 text-center">
          <h3 className="text-2xl sm:text-3xl lg:text-4xl text-[#0369C2] font-bold mb-3">
            Sẵn sàng để xây dựng, vận hành website cho bạn.
          </h3>
          <p className="text-base lg:text-xl text-gray-700/90 mb-5">
            Gọi ngay cho chúng tôi để sử dụng dịch vụ.
          </p>

          <div className="nina-support-call flex items-center justify-center gap-8 sm:gap-14 mb-8 flex-wrap">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold">
              <a href="tel:02837154879" className="flex items-center gap-2">
                <Headphones size={28} className="shrink-0" />
                <span>028.3715.4879</span>
              </a>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold">
              <a href="tel:02837154878" className="flex items-center gap-2">
                <Headphones size={28} className="shrink-0" />
                <span>028.3715.4878</span>
              </a>
            </div>
          </div>

          <div className="px-8 py-7 bg-[#d42125] inline-block mx-auto text-white rounded-2xl shadow-xl max-w-[760px] w-full text-center">
            <p className="text-base lg:text-lg mb-2 opacity-95">
              Bạn đang phân vân hoặc cần tư vấn về thiết kế web, tên miền, hosting...
            </p>
            <p className="text-2xl lg:text-3xl font-bold mb-2">
              Gọi ngay <a href="tel:02837154879" className="hover:underline">028.3715.4879</a>
            </p>
            <p className="text-base lg:text-lg opacity-95">
              Để được tư vấn hỗ trợ miễn phí
            </p>
          </div>
        </div>
      </section>

      {/* 13. NINA FOOTER 4 CỘT (1:1 NASANI) */}
      <footer id="nina-footer" className="pb-0 lg:pb-[57px] bg-white border-t border-gray-100 overflow-hidden">
        <div className="nina-footer-top bg-gray-50/60 py-10 lg:py-12 border-b border-gray-100">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-6">
              {/* Cột 1: Thông tin chung (2.5 cols) */}
              <div className="lg:col-span-3 lg:border-r lg:border-r-gray-200/70 lg:pr-6">
                <h3 className="text-base uppercase text-gray-700 font-bold mb-4 tracking-wide">
                  Thông tin chung
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li><a href="#gioi-thieu" className="hover:text-[#0369C2] hover:font-semibold transition-all">Giới thiệu</a></li>
                  <li><a href="#ho-tro" className="hover:text-[#0369C2] hover:font-semibold transition-all">Hỗ trợ</a></li>
                  <li><a href="#chinh-sach" className="hover:text-[#0369C2] hover:font-semibold transition-all">Chính sách bảo mật</a></li>
                  <li><a href="#thanh-toan" className="hover:text-[#0369C2] hover:font-semibold transition-all">Hướng dẫn thanh toán</a></li>
                </ul>
              </div>

              {/* Cột 2: Dịch vụ cung cấp (2.5 cols) */}
              <div className="lg:col-span-3 lg:border-r lg:border-r-gray-200/70 lg:pr-6">
                <h3 className="text-base uppercase text-gray-700 font-bold mb-4 tracking-wide">
                  Dịch vụ cung cấp
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li><a href="#hosting" className="hover:text-[#0369C2] hover:font-semibold transition-all">Dịch vụ hosting</a></li>
                  <li><a href="#email-server" className="hover:text-[#0369C2] hover:font-semibold transition-all">Dịch vụ email server</a></li>
                  <li><a href="#ten-mien" className="hover:text-[#0369C2] hover:font-semibold transition-all">Dịch vụ tên miền</a></li>
                  <li><a href="#thiet-ke-web" className="hover:text-[#0369C2] hover:font-semibold transition-all">Dịch vụ thiết kế website</a></li>
                </ul>
              </div>

              {/* Cột 3: Thông tin cần biết (2.5 cols) */}
              <div className="lg:col-span-3 lg:border-r lg:border-r-gray-200/70 lg:pr-6">
                <h3 className="text-base uppercase text-gray-700 font-bold mb-4 tracking-wide">
                  Thông tin cần biết
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li><a href="#" className="hover:text-[#0369C2] hover:font-semibold transition-all">Văn bản pháp lý</a></li>
                  <li><a href="#" className="hover:text-[#0369C2] hover:font-semibold transition-all">Thỏa thuận bảo mật thông tin</a></li>
                  <li><a href="#" className="hover:text-[#0369C2] hover:font-semibold transition-all">Thỏa thuận sử dụng</a></li>
                  <li><a href="#" className="hover:text-[#0369C2] hover:font-semibold transition-all">Các quy định về tên miền .vn</a></li>
                  <li><a href="#" className="hover:text-[#0369C2] hover:font-semibold transition-all">Quy định sử dụng tên miền quốc tế</a></li>
                  <li><a href="#" className="hover:text-[#0369C2] hover:font-semibold transition-all">Vòng đời tên miền quốc tế</a></li>
                  <li><a href="#" className="hover:text-[#0369C2] hover:font-semibold transition-all">Quy trình bàn giao</a></li>
                  <li><a href="#" className="hover:text-[#0369C2] hover:font-semibold transition-all">ICANN thông báo ngừng sử dụng WHOIS</a></li>
                  <li><a href="#" className="hover:text-[#0369C2] hover:font-semibold transition-all">Tính pháp lý của hợp đồng điện tử</a></li>
                  <li><a href="#" className="hover:text-[#0369C2] hover:font-semibold transition-all">Biểu mẫu hồ sơ</a></li>
                </ul>
              </div>

              {/* Cột 4: Đồng hành cùng khách hàng (3.5 cols) */}
              <div className="lg:col-span-3">
                <h2 className="text-[20px] sm:text-[22px] text-[#0369C2] font-bold mb-2">
                  Đồng hành cùng khách hàng
                </h2>
                <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                  Bạn đang cần thiết kế website? Hãy để lại thông tin, nhân viên của chúng tôi sẽ liên hệ quý khách trong vòng 24h
                </p>

                <div className="mb-4">
                  <a
                    href="#lien-he"
                    className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#d42125] text-[#d42125] rounded-full text-sm font-semibold hover:bg-[#d42125] hover:text-white transition-all group"
                  >
                    <span>Liên Hệ ngay</span>
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </a>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                    <span className="text-[12px] text-gray-700 whitespace-nowrap">
                      Tải ứng dụng <span className="text-[#d42125] font-bold">NASANI</span> ngay
                    </span>
                    <div className="flex items-center gap-2">
                      <a href="https://apps.apple.com/vn/app/nasani-vn/id6822568388" target="_blank" rel="noreferrer">
                        <img src="/assets/images/app_ios.png" alt="App Store" className="w-[110px] h-auto object-contain hover:opacity-90" />
                      </a>
                      <a href="https://play.google.com/store/apps/details?id=vn.nasani.app" target="_blank" rel="noreferrer">
                        <img src="/assets/images/app_google.png" alt="Google Play" className="w-[110px] h-auto object-contain hover:opacity-90" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                    <span className="text-[12px] text-gray-700 whitespace-nowrap">
                      Tải ứng dụng <span className="text-[#d42125] font-bold">NASANI ID</span> ngay
                    </span>
                    <div className="flex items-center gap-2">
                      <a href="#" rel="noreferrer">
                        <img src="/assets/images/app_ios.png" alt="App Store" className="w-[110px] h-auto object-contain hover:opacity-90" />
                      </a>
                      <a href="#" rel="noreferrer">
                        <img src="/assets/images/app_google.png" alt="Google Play" className="w-[110px] h-auto object-contain hover:opacity-90" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 14. NINA FOOTER BOTTOM (DARK BLUE COPYRIGHT & COMPANY INFO - 1:1 NASANI) */}
        <div className="nina-footer-bottom bg-[#0369C2] text-white py-8">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-8">
            <div className="flex flex-col lg:flex-row items-start justify-between gap-8">
              {/* Bên trái: Logo Nasani + 2 Huy hiệu Bộ Công Thương & DMCA + Copyright */}
              <div className="w-full lg:w-[25%] flex flex-col items-center lg:items-start text-center lg:text-left">
                <Link to="/" className="block mb-4">
                  <img
                    src="/assets/images/nasani.png"
                    alt="Nasani"
                    className="h-10 sm:h-12 w-auto object-contain brightness-0 invert"
                  />
                </Link>

                <div className="flex items-center gap-3 my-2">
                  <a
                    href="http://online.gov.vn/nen-tang/f1d85997-e012-426a-9282-c19110cb6276"
                    target="_blank"
                    rel="noreferrer"
                    title="Bộ Công Thương"
                  >
                    <img
                      src="/assets/images/bocongthuong.webp"
                      alt="Đã thông báo Bộ Công Thương"
                      className="h-9 w-auto object-contain"
                    />
                  </a>
                  <a
                    href="https://www.dmca.com/Protection/Status.aspx?ID=3941590e-df8c-4b6c-883a-948077f92099"
                    target="_blank"
                    rel="noreferrer"
                    title="DMCA Protection"
                  >
                    <img
                      src="https://images.dmca.com/Badges/dmca_protected_sml_120m.png?ID=3941590e-df8c-4b6c-883a-948077f92099"
                      alt="DMCA Protected"
                      className="h-7 w-auto object-contain"
                    />
                  </a>
                </div>

                <div className="nina-copyright mt-4 text-[13px] text-white/90 leading-tight">
                  <p>Copyright © 2026 by NASANI</p>
                  <p>All rights reserved</p>
                </div>
              </div>

              {/* Bên phải: Tên công ty, Trụ sở chính & Chi nhánh Cần Thơ */}
              <div className="w-full lg:w-[73%] text-white text-sm leading-relaxed">
                <div className="footer-title text-base sm:text-lg uppercase font-bold mb-2 tracking-wide">
                  CÔNG TY TNHH CÔNG NGHỆ PHẦN MỀM NASANI
                </div>

                <div className="space-y-3">
                  <div>
                    <h3 className="font-bold text-[13px] uppercase text-white/95">Trụ sở chính</h3>
                    <p className="text-[13px] text-blue-100">
                      Địa chỉ: Lầu 3 Tòa nhà Saigon ICT, Lô 46 Công viên phần mềm Quang Trung, Phường Trung Mỹ Tây, Thành phố Hồ Chí Minh, Việt Nam
                    </p>
                    <p className="text-[13px] text-blue-100">
                      Tel: 028.37154879 – Fax: 028.37154878 – Email: nasani@nasani.vn – Mã số thuế: 0319082906
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-[13px] uppercase text-white/95">Chi nhánh Cần Thơ</h3>
                    <p className="text-[13px] text-blue-100">
                      Địa chỉ: 295 Đường 30 tháng 4, Phường Ninh Kiều, Thành phố Cần Thơ, Việt Nam
                    </p>
                    <p className="text-[13px] text-blue-100">
                      Tel: 028.37154879 – Fax: 028.37154878 – Email: nasani@nasani.vn – Mã số thuế: 0319082906-001
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* 15. DẢI HOTLINE TƯ VẤN VIÊN CỐ ĐỊNH Ở ĐÁY MÀN HÌNH (STICKY FIXED BOTTOM - 1:1 NASANI) */}
      <aside className="fixed bottom-0 left-0 right-0 z-50 bg-[#0369C2] text-white shadow-2xl border-t border-blue-400/40">
        <div className="w-full">
          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 text-[11px] sm:text-[12px] divide-x divide-blue-400/30">
            {[
              { role: "CSKH", tel: "0938.848.248" },
              { role: "Kỹ thuật", tel: "028.3715.4878" },
              { role: "Ms.Dung", tel: "093.868.5275" },
              { role: "Mr.Hải", tel: "0903.177.419" },
              { role: "Mr.Tròn", tel: "0909.135.454" },
              { role: "Ms.Phí", tel: "0708.358.121" },
              { role: "Mr.Tèo", tel: "0931.332.359" },
              { role: "Ms.Trang", tel: "0898.65.65.66" },
              { role: "Mr.Cường", tel: "0935.088.573" },
              { role: "Mr.Trọng", tel: "0908.656.425" },
            ].map((contact, idx) => (
              <a
                key={idx}
                href={`tel:${contact.tel.replace(/\./g, "")}`}
                className="px-1.5 py-1.5 hover:bg-[#025298] transition-colors flex items-center justify-center gap-1.5"
              >
                <Phone size={12} className="text-white shrink-0" />
                <div className="leading-tight">
                  <div className="font-bold">{contact.role}</div>
                  <div className="text-[10px] text-blue-100 font-mono tracking-tight">{contact.tel}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
