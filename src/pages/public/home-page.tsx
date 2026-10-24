import {
  ArrowRight,
  BarChart3,
  Boxes,
  Check,
  ChevronRight,
  CircleHelp,
  LockKeyhole,
  PackageSearch,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Brand } from "@/components/layout/brand";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

const highlights = [
  { icon: Boxes, title: "Quản lý cửa hàng", description: "Sản phẩm, hàng hóa và đơn hàng sẽ được kết nối trong cùng một nơi." },
  { icon: BarChart3, title: "Theo dõi kinh doanh", description: "Nắm bắt doanh thu, chi phí và hoạt động cửa hàng theo thời gian." },
  { icon: Sparkles, title: "Trợ lý kinh doanh", description: "Nhận gợi ý hữu ích dựa trên thông tin và nhu cầu của cửa hàng." },
];

export function HomePage() {
  const { session, profile } = useAuth();
  const destination = session ? (profile?.onboardingRequired ? "/onboarding" : "/app") : "/signup";

  return (
    <main className="landing-page">
      <header className="landing-nav">
        <Brand />
        <nav aria-label="Điều hướng trang giới thiệu">
          <a href="#features">Nền tảng</a>
          <a href="#how-it-works">Cách hoạt động</a>
        </nav>
        <div className="landing-actions">
          {session ? (
            <Button asChild><Link to={destination}>Vào không gian làm việc <ArrowRight size={16} /></Link></Button>
          ) : (
            <>
              <Button asChild variant="ghost"><Link to="/login">Đăng nhập</Link></Button>
              <Button asChild><Link to="/signup">Tạo tài khoản <ArrowRight size={16} /></Link></Button>
            </>
          )}
        </div>
      </header>
      <section className="hero-section">
        <div className="hero-copy">
          <span className="eyebrow hero-eyebrow"><span className="pulse-dot" /> GIẢI PHÁP QUẢN LÝ CỬA HÀNG</span>
          <h1>Điều hành cửa hàng<br />với <span>nhiều tự tin hơn.</span></h1>
          <p className="hero-description">
            Theo dõi cửa hàng, quản lý đội ngũ và hiểu rõ hơn những việc cần ưu tiên
            trong hoạt động kinh doanh hằng ngày.
          </p>
          <div className="hero-actions">
            <Button asChild size="lg"><Link to={destination}>Bắt đầu quản lý cửa hàng <ArrowRight size={17} /></Link></Button>
            <a className="text-link" href="#features">Khám phá ABC Copilot <ChevronRight size={16} /></a>
          </div>
          <div className="hero-trust"><span><Check size={14} /> Dễ dàng bắt đầu</span><span><LockKeyhole size={14} /> Tài khoản an toàn</span><span><CircleHelp size={14} /> Hỗ trợ vận hành</span></div>
        </div>
        <div className="hero-art" aria-label="Minh họa bảng điều khiển kinh doanh">
          <div className="art-glow" />
          <div className="mock-window">
            <div className="mock-top"><Brand compact /><span className="mock-store"><span className="context-dot" /> Cửa hàng của bạn</span><span className="mock-avatar">A</span></div>
            <div className="mock-body">
              <div className="mock-side"><span className="mock-nav active" /><span className="mock-nav" /><span className="mock-nav" /><span className="mock-nav" /><span className="mock-nav" /></div>
              <div className="mock-main">
                <span className="mock-kicker">TỔNG QUAN DOANH NGHIỆP</span>
                <div className="mock-title">Chào buổi sáng 👋</div>
                <div className="mock-subtitle">Tình hình cửa hàng của bạn hôm nay.</div>
                <div className="mock-cards">
                  <div className="mock-card"><span>DOANH THU</span><strong>— ₫</strong><small><TrendingUp size={12} /> Theo dõi bán hàng</small></div>
                  <div className="mock-card"><span>TỒN KHO</span><strong>Sản phẩm</strong><small><Boxes size={12} /> Nắm bắt hàng hóa</small></div>
                </div>
                <div className="mock-chart-card"><span>HIỆU SUẤT KINH DOANH</span><div className="chart-bars">{[32, 48, 41, 66, 52, 82, 64, 90, 70, 98, 76, 87].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div><div className="chart-labels"><span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span></div></div>
              </div>
            </div>
          </div>
          <div className="float-card float-ai"><span className="float-icon"><Sparkles size={17} /></span><span><strong>Trợ lý kinh doanh</strong><small>Hỗ trợ bạn ra quyết định</small></span><span className="float-online" /></div>
          <div className="float-card float-stock"><span className="float-icon green"><PackageSearch size={17} /></span><span><strong>Quản lý hàng hóa</strong><small>Theo dõi tình trạng tồn kho</small></span></div>
        </div>
        <div className="hero-bottom-label"><span>01</span> NỀN TẢNG CHO NHÀ BÁN LẺ HIỆN ĐẠI</div>
      </section>
      <section className="features-section" id="features">
        <div className="section-heading"><div><span className="eyebrow">MỌI VIỆC QUAN TRỌNG, TRONG TẦM TAY</span><h2>Quản lý cửa hàng<br /><span>đơn giản và chủ động hơn.</span></h2></div><p>Tập trung thông tin doanh nghiệp và đội ngũ trong một nơi. Các công cụ quản lý bán hàng, hàng hóa và phân tích sẽ được bổ sung theo từng giai đoạn.</p></div>
        <div className="feature-grid">{highlights.map(({ icon: Icon, title, description }, index) => <article className="feature-card" key={title}><div className="feature-number">0{index + 1}</div><span className="feature-icon"><Icon size={21} /></span><h3>{title}</h3><p>{description}</p><Link to={destination}>Khám phá <ArrowRight size={14} /></Link></article>)}</div>
      </section>
      <section className="landing-cta" id="how-it-works">
        <div><span className="eyebrow light"><Sparkles size={14} /> BẮT ĐẦU NGAY HÔM NAY</span><h2>Sẵn sàng quản lý<br />cửa hàng hiệu quả hơn?</h2><p>Tạo tài khoản và thiết lập không gian làm việc cho doanh nghiệp của bạn.</p></div>
        <Button asChild size="lg" variant="outline"><Link to={destination}>Tạo tài khoản <ArrowRight size={17} /></Link></Button>
      </section>
      <footer className="landing-footer"><Brand /><span>© 2026 ABC Copilot · Đồng hành cùng cửa hàng bán lẻ</span><Link to="/login">Đăng nhập <ArrowRight size={14} /></Link></footer>
    </main>
  );
}
