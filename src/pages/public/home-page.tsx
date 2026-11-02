import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Barcode,
  CheckCircle2,
  Clock,
  Headphones,
  MapPin,
  Package,
  PhoneCall,
  Printer,
  QrCode,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  Zap,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";

export function HomePage() {
  const { session, profile } = useAuth();
  const destination = session ? (profile?.onboardingRequired ? "/onboarding" : "/app") : "/signup";

  const [activeTab, setActiveTab] = useState<"fashion" | "cosmetics">("fashion");

  return (
    <div className="min-h-screen bg-[#fafbfc] text-[#1e293b] font-sans antialiased selection:bg-[#ff5722] selection:text-white">
      {/* 1. TOP BAR THUẦN PHONG CÁCH DOANH NGHIỆP VIỆT NAM */}
      <div className="bg-[#1e293b] text-[#cbd5e1] text-[12px] border-b border-slate-700 py-1.5 px-4 sm:px-8">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 text-white font-medium">
              <Headphones size={13} className="text-[#ff7043]" />
              Hotline Kỹ thuật &amp; CSKH: <strong className="text-[#ff9800] tracking-wide">1900 6868</strong> - <strong>0909.123.456</strong> (Zalo 24/7)
            </span>
            <span className="hidden md:inline-flex items-center gap-1 text-slate-400">
              <Clock size={12} /> Giờ làm việc: 8:00 - 21:30 (Cả Thứ 7, CN &amp; Ngày lễ)
            </span>
          </div>
          <div className="flex items-center gap-3 text-slate-300">
            <span className="hidden sm:inline-flex items-center gap-1">
              <MapPin size={12} className="text-emerald-400" /> VP: Tầng 6, Số 18 Láng Hạ, Ba Đình, HN | 128 Hai Bà Trưng, Q1, TP.HCM
            </span>
          </div>
        </div>
      </div>

      {/* 2. HEADER CHÍNH PHONG CÁCH CÔNG TY DỊCH VỤ CÔNG NGHỆ VIỆT */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 h-20 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#e64a19] via-[#ff5722] to-[#ff9800] grid place-items-center text-white shadow-md shadow-orange-500/25 group-hover:scale-105 transition-transform">
              <Store size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[20px] font-black tracking-tight text-[#0f172a] uppercase font-mono">
                  ABC <span className="text-[#e64a19]">RETAIL</span>
                </span>
                <span className="bg-[#fff1f2] border border-[#fecdd3] text-[#e11d48] text-[9.5px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                  Bản Việt Nam
                </span>
              </div>
              <div className="text-[11px] font-semibold text-slate-500">
                Phần mềm Quản lý Kho &amp; Bán lẻ Hộ Kinh Doanh
              </div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-7 text-[13.5px] font-bold text-slate-700">
            <a href="#features" className="hover:text-[#e64a19] transition-colors">Tính năng chuyên biệt</a>
            <a href="#industries" className="hover:text-[#e64a19] transition-colors">Thời trang &amp; Mỹ phẩm</a>
            <a href="#workflow" className="hover:text-[#e64a19] transition-colors">Quy trình 4 bước</a>
            <a href="#pricing" className="hover:text-[#e64a19] transition-colors">Bảng giá gói cước</a>
            <a href="#compliance" className="hover:text-[#e64a19] transition-colors">Chuẩn TT 88/200 Bộ Tài chính</a>
          </nav>

          <div className="flex items-center gap-3">
            {session ? (
              <Link
                to={destination}
                className="rounded-lg bg-gradient-to-r from-[#e64a19] to-[#ff5722] px-5 py-2.5 text-[13.5px] font-extrabold text-white shadow-md shadow-orange-500/20 hover:brightness-110 transition-all flex items-center gap-1.5"
              >
                Vào Không Gian Làm Việc <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-[13px] font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/signup"
                  className="rounded-lg bg-gradient-to-r from-[#e64a19] to-[#ff5722] px-5 py-2.5 text-[13px] font-extrabold text-white shadow-md shadow-orange-500/20 hover:brightness-110 transition-all flex items-center gap-1.5"
                >
                  <Sparkles size={15} /> Dùng Thử 14 Ngày Miễn Phí
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 3. HERO BANNER CHUẨN DOANH NGHIỆP THỰC CHIẾN VIỆT NAM */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#fff7ed] via-white to-white pt-12 pb-16 border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-100 to-amber-100 border border-orange-200 px-3.5 py-1 text-[11.5px] font-bold text-orange-800 mb-4 shadow-2xs">
                <span className="flex h-2 w-2 rounded-full bg-[#e64a19] animate-ping" />
                GIẢI PHÁP SỐ HÓA KHO BÃI &amp; BÁN LẺ THỰC CHIẾN DÀNH CHO VIỆT NAM
              </div>

              <h1 className="text-[32px] sm:text-[42px] lg:text-[46px] font-black text-[#0f172a] leading-[1.2] tracking-tight">
                Quản lý kho hàng, in mã vạch &amp; xuất phiếu kiểm kê{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e64a19] via-[#f97316] to-[#f59e0b]">
                  chuẩn Thông tư Bộ Tài chính
                </span>
              </h1>

              <p className="mt-4 text-[15.5px] text-slate-600 leading-relaxed max-w-[640px]">
                Được thiết kế tinh gọn cho hộ kinh doanh, cửa hàng thời trang may mặc và shop mỹ phẩm. 
                Quét mã vạch thật bằng camera điện thoại/laptop, in tem nhiệt Decal dán quần áo, 
                tự sinh mã SKU chuẩn <strong className="text-slate-800">[BRAND]-[CODE]-[VOL]-[VER]</strong> và quản lý hạn sử dụng theo lô không lo hết hạn.
              </p>

              <div className="mt-7 flex items-center gap-3.5 flex-wrap">
                <Link
                  to={destination}
                  className="rounded-xl bg-gradient-to-r from-[#e64a19] via-[#f97316] to-[#ff5722] px-7 py-3.5 text-[15px] font-black text-white shadow-lg shadow-orange-500/30 hover:scale-[1.02] hover:brightness-105 transition-all flex items-center gap-2"
                >
                  <Zap size={18} className="fill-white" />
                  ĐĂNG KÝ TRẢI NGHIỆM MIỄN PHÍ
                  <ArrowRight size={17} />
                </Link>
                <a
                  href="#pricing"
                  className="rounded-xl border-2 border-slate-300 bg-white px-6 py-3.5 text-[14px] font-bold text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition-all flex items-center gap-2"
                >
                  <PhoneCall size={16} className="text-[#e64a19]" />
                  Xem Báo Giá Trọn Gói (VNĐ)
                </a>
              </div>

              {/* 3 Cam kết cốt lõi chuẩn tâm lý khách hàng Việt Nam */}
              <div className="mt-8 pt-6 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-[12.5px] font-bold text-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>Cài đặt sử dụng sau 5 phút</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-[#e64a19] shrink-0" />
                  <span>Dữ liệu lưu độc lập theo cửa hàng</span>
                </div>
                <div className="flex items-center gap-2">
                  <Printer size={16} className="text-blue-600 shrink-0" />
                  <span>Hỗ trợ máy in tem &amp; máy POS</span>
                </div>
              </div>
            </div>

            {/* Khung minh họa chức năng thực tế */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl border-2 border-slate-800 bg-[#0f172a] p-4 shadow-2xl text-white">
                <div className="flex items-center justify-between pb-3 border-b border-slate-700 text-[11px] text-slate-400 font-mono">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500" />
                    <span className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="ml-1 text-slate-300 font-bold">HỆ THỐNG VẬN HÀNH BÁN LẺ</span>
                  </div>
                  <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                    ONLINE: KHO TRUNG TÂM
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="rounded-xl bg-slate-800/80 p-3.5 border border-slate-700">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>CHỨNG TỪ KIỂM KÊ GẦN NHẤT</span>
                      <span className="font-mono text-amber-400 font-bold">Mẫu 01-VT (TT 88/200)</span>
                    </div>
                    <div className="text-[15px] font-bold text-white mt-1">
                      Phiếu kiểm kê nạp tồn kho #OSTK-2026-001
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/60 text-[12px]">
                      <span className="text-slate-300">Tổng giá trị vốn:</span>
                      <strong className="text-emerald-400 text-[14px]">184.500.000 đ</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-800/80 p-3 border border-slate-700">
                      <div className="flex items-center gap-1.5 text-orange-400 text-[11px] font-bold">
                        <Barcode size={14} /> QUÉT MÃ VẠCH EAN-13
                      </div>
                      <div className="text-[18px] font-black text-white mt-1 font-mono">
                        893500100018
                      </div>
                      <div className="text-[10.5px] text-emerald-400 mt-0.5">● Nhận diện tức thì &lt;15ms</div>
                    </div>

                    <div className="rounded-xl bg-slate-800/80 p-3 border border-slate-700">
                      <div className="flex items-center gap-1.5 text-blue-400 text-[11px] font-bold">
                        <Printer size={14} /> IN TEM NHÃN DECAL
                      </div>
                      <div className="text-[18px] font-black text-white mt-1">
                        50 × 30 mm
                      </div>
                      <div className="text-[10.5px] text-blue-300 mt-0.5">Xprinter / Zebra / A4</div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-gradient-to-r from-orange-950/60 to-slate-800/80 p-3.5 border border-orange-500/30 flex items-center justify-between">
                    <div>
                      <div className="text-[12px] font-bold text-orange-200">Shop Thời trang Vinaclothes</div>
                      <div className="text-[11px] text-slate-400">11 sản phẩm • 48 biến thể • Tồn kho sẵn sàng</div>
                    </div>
                    <Link
                      to={destination}
                      className="rounded-lg bg-[#e64a19] px-3 py-1.5 text-[11.5px] font-bold text-white hover:bg-orange-600 transition-colors"
                    >
                      Kiểm tra ngay →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CON SỐ ẤN TƯỢNG (TRUST METRICS) PHÙ HỢP THỊ TRƯỜNG BÁN LẺ VIỆT */}
      <section className="bg-white py-8 border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-3">
              <div className="text-[32px] sm:text-[38px] font-black text-[#e64a19]">12.500+</div>
              <div className="text-[13px] font-bold text-slate-700 mt-1">Hộ kinh doanh cá thể tin dùng</div>
              <div className="text-[11px] text-slate-500">Chợ Ninh Hiệp, Đồng Xuân, An Đông, Bến Thành...</div>
            </div>
            <div className="p-3">
              <div className="text-[32px] sm:text-[38px] font-black text-emerald-600">99.8%</div>
              <div className="text-[13px] font-bold text-slate-700 mt-1">Tỷ lệ khớp sổ sách &amp; kho thực tế</div>
              <div className="text-[11px] text-slate-500">Loại bỏ hoàn toàn thất thoát hàng hóa</div>
            </div>
            <div className="p-3">
              <div className="text-[32px] sm:text-[38px] font-black text-blue-600">&lt; 15ms</div>
              <div className="text-[13px] font-bold text-slate-700 mt-1">Tra cứu tồn kho tức thời</div>
              <div className="text-[11px] text-slate-500">Lọc ma trận SKU và quét mã không giật lag</div>
            </div>
            <div className="p-3">
              <div className="text-[32px] sm:text-[38px] font-black text-indigo-600">100%</div>
              <div className="text-[13px] font-bold text-slate-700 mt-1">Chuẩn chế độ kế toán Việt Nam</div>
              <div className="text-[11px] text-slate-500">Thông tư 88/2021 &amp; TT 200/2014 của Bộ Tài chính</div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. TÍNH NĂNG CHUYÊN SÂU 2 NGÀNH NÒNG CỐT: THỜI TRANG & MỸ PHẨM */}
      <section id="industries" className="py-16 bg-[#f8fafc] border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8">
          <div className="text-center max-w-[760px] mx-auto mb-12">
            <span className="text-[12px] font-extrabold uppercase tracking-widest text-[#e64a19] bg-orange-100 px-3 py-1 rounded-full">
              GIẢI PHÁP ĐẶC THÙ THEO NGÀNH HÀNG
            </span>
            <h2 className="text-[28px] sm:text-[36px] font-black text-[#0f172a] mt-3">
              Đáp ứng chuẩn xác bài toán của từng mô hình cửa hàng
            </h2>
            <p className="text-[14.5px] text-slate-600 mt-2">
              Không bắt bạn dùng một giao diện cứng nhắc. Cửa hàng thời trang có ma trận Size/Màu; cửa hàng mỹ phẩm có quản lý số Lô và Hạn sử dụng (FEFO).
            </p>

            <div className="mt-6 inline-flex rounded-xl bg-slate-200 p-1">
              <button
                type="button"
                onClick={() => setActiveTab("fashion")}
                className={`px-6 py-2.5 rounded-lg text-[13.5px] font-bold transition-all ${
                  activeTab === "fashion"
                    ? "bg-white text-[#e64a19] shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                👕 Ngành Thời trang &amp; Phụ kiện
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("cosmetics")}
                className={`px-6 py-2.5 rounded-lg text-[13.5px] font-bold transition-all ${
                  activeTab === "cosmetics"
                    ? "bg-white text-[#e64a19] shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                💄 Ngành Mỹ phẩm &amp; Làm đẹp (FEFO)
              </button>
            </div>
          </div>

          {activeTab === "fashion" ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-2xl bg-white p-7 border border-slate-200 shadow-xs hover:border-orange-300 transition-all">
                <div className="w-12 h-12 rounded-xl bg-orange-50 text-[#e64a19] grid place-items-center mb-5 font-bold">
                  <Tag size={24} />
                </div>
                <h3 className="text-[18px] font-black text-slate-900">Ma trận Biến thể Size / Màu</h3>
                <p className="text-[13.5px] text-slate-600 mt-2 leading-relaxed">
                  Tự động sinh ma trận tổ hợp biến thể (ví dụ 3 màu × 3 size = 9 SKU). Gán ảnh biến thể chuẩn xác theo từng màu sắc, hover chuyển động các góc chụp ngay trên danh mục.
                </p>
                <div className="mt-4 pt-4 border-t border-slate-100 text-[12px] font-mono font-bold text-slate-500">
                  SKU: VNC-HOODIE-BLK-M • VNC-JEAN-BLU-30
                </div>
              </div>

              <div className="rounded-2xl bg-white p-7 border border-slate-200 shadow-xs hover:border-orange-300 transition-all">
                <div className="w-12 h-12 rounded-xl bg-orange-50 text-[#e64a19] grid place-items-center mb-5 font-bold">
                  <Printer size={24} />
                </div>
                <h3 className="text-[18px] font-black text-slate-900">In tem Decal nhiệt dán mác</h3>
                <p className="text-[13.5px] text-slate-600 mt-2 leading-relaxed">
                  In hàng loạt tem mã vạch Decal (khổ 50×30mm, 35×22mm hoặc giấy A4 Tomy 145) để dán lên tag áo quần, hộp giày, balo. Tương thích mọi máy in nhiệt Xprinter, Zebra, Godex.
                </p>
                <div className="mt-4 pt-4 border-t border-slate-100 text-[12px] font-mono font-bold text-slate-500">
                  Mã vạch chuẩn EAN-13 kèm tên shop và giá bán
                </div>
              </div>

              <div className="rounded-2xl bg-white p-7 border border-slate-200 shadow-xs hover:border-orange-300 transition-all">
                <div className="w-12 h-12 rounded-xl bg-orange-50 text-[#e64a19] grid place-items-center mb-5 font-bold">
                  <Package size={24} />
                </div>
                <h3 className="text-[18px] font-black text-slate-900">Mở rộng phụ kiện đính kèm</h3>
                <p className="text-[13.5px] text-slate-600 mt-2 leading-relaxed">
                  Quản lý thuận tiện giày dép, sandal, túi xách, balo, thắt lưng, nón, kính mát, vớ tất trong cùng một shop thời trang với danh mục phân cấp rõ ràng.
                </p>
                <div className="mt-4 pt-4 border-t border-slate-100 text-[12px] font-mono font-bold text-slate-500">
                  Không lo bị lẫn lộn giữa quần áo và phụ kiện
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-2xl bg-white p-7 border border-slate-200 shadow-xs hover:border-emerald-300 transition-all">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center mb-5 font-bold">
                  <Clock size={24} />
                </div>
                <h3 className="text-[18px] font-black text-slate-900">Quản lý Số Lô &amp; Hạn Sử Dụng</h3>
                <p className="text-[13.5px] text-slate-600 mt-2 leading-relaxed">
                  Mỗi lô nhập đều ghi nhận Ngày sản xuất (NSX), Hạn sử dụng (HSD). Hệ thống tự động cảnh báo sản phẩm cận date trước 30/60/90 ngày để chủ shop xả hàng kịp thời.
                </p>
                <div className="mt-4 pt-4 border-t border-slate-100 text-[12px] font-mono font-bold text-slate-500">
                  Lô: LOT-2026-B5-01 • HSD: 31/12/2028
                </div>
              </div>

              <div className="rounded-2xl bg-white p-7 border border-slate-200 shadow-xs hover:border-emerald-300 transition-all">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center mb-5 font-bold">
                  <ShieldCheck size={24} />
                </div>
                <h3 className="text-[18px] font-black text-slate-900">Xuất kho FEFO chuẩn y tế</h3>
                <p className="text-[13.5px] text-slate-600 mt-2 leading-relaxed">
                  Áp dụng nguyên tắc First Expired - First Out: Lô nào hết hạn trước thì tự động ưu tiên xuất bán trước, ngăn chặn triệt để tình trạng mỹ phẩm hỏng trong kho.
                </p>
                <div className="mt-4 pt-4 border-t border-slate-100 text-[12px] font-mono font-bold text-slate-500">
                  Bảo vệ uy tín thương hiệu mỹ phẩm của bạn
                </div>
              </div>

              <div className="rounded-2xl bg-white p-7 border border-slate-200 shadow-xs hover:border-emerald-300 transition-all">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center mb-5 font-bold">
                  <QrCode size={24} />
                </div>
                <h3 className="text-[18px] font-black text-slate-900">Dung tích &amp; Tông màu chuẩn</h3>
                <p className="text-[13.5px] text-slate-600 mt-2 leading-relaxed">
                  Hỗ trợ thuộc tính Dung tích (30ml, 50ml, 400ml, 50g) và Tông màu son (Đỏ cam, Đỏ đất, Hồng đất), quản lý chi tiết từ serum, kem chống nắng đến son lì.
                </p>
                <div className="mt-4 pt-4 border-t border-slate-100 text-[12px] font-mono font-bold text-slate-500">
                  Tài khoản mẫu: normaluser2@gmail.com (Vinason)
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 6. QUY TRÌNH 4 BƯỚC VẬN HÀNH TINH GỌN */}
      <section id="workflow" className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8">
          <div className="text-center max-w-[760px] mx-auto mb-14">
            <span className="text-[12px] font-extrabold uppercase tracking-widest text-[#e64a19] bg-orange-100 px-3 py-1 rounded-full">
              ĐƠN GIẢN - DỄ DÙNG
            </span>
            <h2 className="text-[28px] sm:text-[36px] font-black text-[#0f172a] mt-3">
              Quy trình quản trị kho 4 bước trực quan
            </h2>
            <p className="text-[14.5px] text-slate-600 mt-2">
              Nhân viên bán hàng hay chủ shop không rành máy tính vẫn có thể thành thạo ngay trong ngày đầu tiên.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            <div className="rounded-2xl bg-slate-50 p-6 border border-slate-200 hover:shadow-md transition-shadow relative">
              <span className="w-9 h-9 rounded-full bg-[#e64a19] text-white font-black text-[15px] grid place-items-center mb-4">
                1
              </span>
              <h4 className="text-[16px] font-bold text-slate-900">Tạo thông tin chung</h4>
              <p className="text-[13px] text-slate-600 mt-2">
                Nhập tên hàng hóa, mã sản phẩm, danh mục và đơn vị tính (Cái, Đôi, Hộp, Chai). Thêm nhanh danh mục ngay tại chỗ.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-6 border border-slate-200 hover:shadow-md transition-shadow relative">
              <span className="w-9 h-9 rounded-full bg-[#f97316] text-white font-black text-[15px] grid place-items-center mb-4">
                2
              </span>
              <h4 className="text-[16px] font-bold text-slate-900">Cấu hình thuộc tính</h4>
              <p className="text-[13px] text-slate-600 mt-2">
                Chọn thuộc tính phân loại (Màu sắc, Size, Dung tích). Hệ thống tự tính toán số lượng biến thể SKU dự kiến rõ ràng.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-6 border border-slate-200 hover:shadow-md transition-shadow relative">
              <span className="w-9 h-9 rounded-full bg-[#ff9800] text-white font-black text-[15px] grid place-items-center mb-4">
                3
              </span>
              <h4 className="text-[16px] font-bold text-slate-900">Sinh SKU &amp; In tem Decal</h4>
              <p className="text-[13px] text-slate-600 mt-2">
                Sinh mã SKU chuẩn [BRAND]-[CODE]-[VOL]-[VER]. Tự động gán mã vạch EAN-13 thật và in tem nhãn dán lên hàng hóa.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-6 border border-slate-200 hover:shadow-md transition-shadow relative">
              <span className="w-9 h-9 rounded-full bg-emerald-600 text-white font-black text-[15px] grid place-items-center mb-4">
                4
              </span>
              <h4 className="text-[16px] font-bold text-slate-900">Nạp tồn &amp; In phiếu A4</h4>
              <p className="text-[13px] text-slate-600 mt-2">
                Nhập số lượng tồn đầu kỳ, giá vốn và hạn sử dụng. Xem trước &amp; in phiếu kiểm kê A4 lưu trữ chứng từ pháp lý.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. BẢNG BÁO GIÁ MINH BẠCH BẰNG VNĐ (PHONG CÁCH VIỆT NAM) */}
      <section id="pricing" className="py-16 bg-[#f8fafc] border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8">
          <div className="text-center max-w-[760px] mx-auto mb-14">
            <span className="text-[12px] font-extrabold uppercase tracking-widest text-[#e64a19] bg-orange-100 px-3 py-1 rounded-full">
              BẢNG GIÁ DỊCH VỤ MINH BẠCH
            </span>
            <h2 className="text-[28px] sm:text-[36px] font-black text-[#0f172a] mt-3">
              Chi phí tiết kiệm - Không phát sinh phụ phí ẩn
            </h2>
            <p className="text-[14.5px] text-slate-600 mt-2">
              Cam kết đồng hành lâu dài cùng hộ kinh doanh cá thể và doanh nghiệp vừa &amp; nhỏ tại Việt Nam.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {/* Gói Khởi nghiệp */}
            <div className="rounded-2xl bg-white p-8 border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[12px] font-bold uppercase text-slate-500">DÀNH CHO HỘ NHỎ / SHOP ONLINE</span>
                <h3 className="text-[22px] font-black text-slate-900 mt-1">Gói Khởi Nghiệp</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-[34px] font-black text-[#e64a19]">149.000</span>
                  <span className="text-[14px] text-slate-500 font-bold">đ / tháng</span>
                </div>
                <p className="text-[12.5px] text-slate-500 mt-1">Thanh toán theo năm (1.788.000 đ/năm)</p>

                <ul className="mt-6 space-y-3 text-[13px] text-slate-700">
                  <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-600" /> Quản lý tối đa 500 SKU hàng hóa</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-600" /> Quét mã vạch bằng camera laptop/phone</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-600" /> In tem mã vạch Decal (Xprinter/A4)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-600" /> Xuất phiếu kiểm kê A4 Thông tư 88</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-600" /> 1 Cửa hàng • 2 Tài khoản nhân viên</li>
                </ul>
              </div>

              <Link
                to={destination}
                className="mt-8 block w-full text-center rounded-xl border-2 border-[#e64a19] text-[#e64a19] hover:bg-orange-50 py-3 text-[14px] font-extrabold transition-colors"
              >
                Đăng Ký Gói Khởi Nghiệp
              </Link>
            </div>

            {/* Gói Chuyên Nghiệp - Bán chạy nhất */}
            <div className="rounded-2xl bg-white p-8 border-2 border-[#e64a19] shadow-xl relative flex flex-col justify-between scale-[1.03]">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#e64a19] to-[#ff5722] text-white text-[11px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-sm">
                ★ GÓI KHUYÊN DÙNG NHẤT
              </div>

              <div>
                <span className="text-[12px] font-bold uppercase text-[#e64a19]">SHOP THỜI TRANG &amp; MỸ PHẨM CHUYÊN NGHIỆP</span>
                <h3 className="text-[22px] font-black text-slate-900 mt-1">Gói Toàn Diện</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-[36px] font-black text-[#e64a19]">299.000</span>
                  <span className="text-[14px] text-slate-500 font-bold">đ / tháng</span>
                </div>
                <p className="text-[12.5px] text-slate-500 mt-1">Thanh toán theo năm (Tặng kèm 1 máy in tem nhiệt)</p>

                <ul className="mt-6 space-y-3 text-[13px] text-slate-700">
                  <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-600" /> Không giới hạn số lượng SKU sản phẩm</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-600" /> Quản lý ma trận Size / Màu đa ảnh góc chụp</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-600" /> Quản lý Số Lô, HSD &amp; Xuất kho FEFO</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-600" /> In phiếu A4 Thông tư 88/2021 &amp; TT 200/2014</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-600" /> Không giới hạn nhân viên phân quyền</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-600" /> Hỗ trợ kỹ thuật Ultraview / Zalo 24/7</li>
                </ul>
              </div>

              <Link
                to={destination}
                className="mt-8 block w-full text-center rounded-xl bg-gradient-to-r from-[#e64a19] to-[#ff5722] text-white py-3.5 text-[14px] font-black shadow-md shadow-orange-500/30 hover:brightness-110 transition-all"
              >
                CHỌN DÙNG THỬ GÓI TOÀN DIỆN
              </Link>
            </div>

            {/* Gói Chuỗi Doanh Nghiệp */}
            <div className="rounded-2xl bg-white p-8 border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[12px] font-bold uppercase text-slate-500">CHUỖI CỬA HÀNG &amp; KHO TỔNG</span>
                <h3 className="text-[22px] font-black text-slate-900 mt-1">Gói Doanh Nghiệp</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-[34px] font-black text-slate-900">599.000</span>
                  <span className="text-[14px] text-slate-500 font-bold">đ / tháng</span>
                </div>
                <p className="text-[12.5px] text-slate-500 mt-1">Triển khai cho chuỗi nhiều điểm bán</p>

                <ul className="mt-6 space-y-3 text-[13px] text-slate-700">
                  <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-600" /> Toàn bộ tính năng Gói Toàn Diện</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-600" /> Điều chuyển hàng hóa đa kho chi nhánh</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-600" /> Tích hợp API sàn Shopee / TikTok Shop</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-600" /> Tùy chỉnh mẫu in hóa đơn &amp; tem theo yêu cầu</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-600" /> Kỹ sư hỗ trợ tận nơi tại Hà Nội &amp; TP.HCM</li>
                </ul>
              </div>

              <Link
                to={destination}
                className="mt-8 block w-full text-center rounded-xl border-2 border-slate-700 text-slate-800 hover:bg-slate-100 py-3 text-[14px] font-extrabold transition-colors"
              >
                Liên Hệ Tư Vấn Chuỗi
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FOOTER CHUẨN PHÁP LÝ DOANH NGHIỆP VIỆT NAM (BỘ CÔNG THƯƠNG) */}
      <footer id="compliance" className="bg-[#0f172a] text-[#94a3b8] pt-14 pb-8 border-t border-slate-800 text-[13px]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-slate-800">
            {/* Cột 1: Thông tin pháp lý công ty */}
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center gap-2 text-white">
                <Store size={22} className="text-[#ff5722]" />
                <span className="text-[17px] font-black uppercase tracking-wider font-mono">
                  ABC RETAIL VIỆT NAM
                </span>
              </div>
              <p className="text-[12.5px] text-slate-400 leading-relaxed max-w-[460px]">
                Nền tảng chuyển đổi số quản trị kho hàng, quét mã vạch Barcode và in chứng từ kiểm kê A4 chuyên biệt cho hộ kinh doanh và doanh nghiệp bán lẻ tại Việt Nam.
              </p>
              <div className="pt-2 text-[12px] space-y-1 text-slate-400">
                <div>🏢 <strong>Đơn vị chủ quản:</strong> Công ty Cổ phần Công nghệ Bán Lẻ ABC Việt Nam</div>
                <div>📋 <strong>Giấy phép ĐKKD:</strong> Số 0318294829 do Sở KH&amp;ĐT TP.HCM cấp ngày 15/02/2024</div>
                <div>🔖 <strong>Mã số thuế:</strong> 0318294829 • Hotline: 1900 6868 - 0909.123.456</div>
                <div>📍 <strong>Trụ sở chính:</strong> Tầng 6, Tòa nhà Tân Hoàng Minh, 18 Láng Hạ, Ba Đình, Hà Nội</div>
                <div>📍 <strong>Chi nhánh miền Nam:</strong> 128 Hai Bà Trưng, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh</div>
              </div>
            </div>

            {/* Cột 2: Hỗ trợ & Tài liệu */}
            <div>
              <div className="text-[14px] font-bold text-white mb-3 uppercase tracking-wider">Hỗ Trợ Khách Hàng</div>
              <ul className="space-y-2 text-[12.5px]">
                <li><a href="#workflow" className="hover:text-white transition-colors">Hướng dẫn tạo mã SKU [BRAND]-[CODE]</a></li>
                <li><a href="#industries" className="hover:text-white transition-colors">Cấu hình in tem Decal 50×30mm</a></li>
                <li><a href="#compliance" className="hover:text-white transition-colors">Biểu mẫu kiểm kê Thông tư 88/200</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">Khắc phục camera quét mã vạch</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Chính sách bảo mật &amp; sao lưu kho</a></li>
              </ul>
            </div>

            {/* Cột 3: Chứng nhận & Thanh toán */}
            <div className="space-y-4">
              <div className="text-[14px] font-bold text-white uppercase tracking-wider">Chứng Nhận Bộ Công Thương</div>
              {/* Huy hiệu Bộ công thương chuẩn */}
              <div className="inline-flex items-center gap-2 rounded-lg bg-slate-800/80 p-2.5 border border-slate-700">
                <div className="w-8 h-8 rounded-full bg-blue-600 grid place-items-center text-white text-[10px] font-bold">
                  ✓
                </div>
                <div className="text-[10.5px] leading-tight">
                  <div className="font-extrabold text-white uppercase">ĐÃ THÔNG BÁO</div>
                  <div className="text-red-400 font-bold uppercase">BỘ CÔNG THƯƠNG</div>
                </div>
              </div>

              <div className="pt-2">
                <div className="text-[12px] font-bold text-slate-300 mb-2">Chấp nhận thanh toán:</div>
                <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono text-slate-300">
                  <span className="bg-slate-800 px-2 py-1 rounded border border-slate-700">VietQR (Napas 24/7)</span>
                  <span className="bg-slate-800 px-2 py-1 rounded border border-slate-700">MoMo</span>
                  <span className="bg-slate-800 px-2 py-1 rounded border border-slate-700">ZaloPay</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 flex items-center justify-between flex-wrap gap-4 text-[11.5px] text-slate-500">
            <div>© 2026 ABC RETAIL COPILOT VIETNAM. Bản quyền thuộc về Công ty CP Công nghệ Bán lẻ ABC.</div>
            <div className="flex gap-4">
              <Link to="/login" className="hover:text-slate-300">Đăng nhập tài khoản</Link>
              <Link to="/signup" className="hover:text-slate-300">Đăng ký cửa hàng mới</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
