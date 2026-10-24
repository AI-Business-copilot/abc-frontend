import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link aria-label="ABC Copilot trang chủ" className="brand-lockup" to="/">
      <span className="brand-mark">
        <Sparkles size={17} strokeWidth={2.4} />
      </span>
      {!compact && (
        <span className="brand-wordmark">
          <strong>ABC Copilot</strong>
          <small>Quản lý cửa hàng</small>
        </span>
      )}
    </Link>
  );
}
