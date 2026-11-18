import { Link } from "react-router-dom";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link aria-label="ABC Copilot trang chủ" className="inline-flex items-center gap-2.5 group select-none" to="/">
      <div className="flex flex-col items-start leading-none">
        <span className="text-[22px] font-black tracking-tight text-[#c1121f] font-sans group-hover:scale-102 transition-transform">
          ABC
        </span>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="w-2 h-[1.5px] bg-[#0f4c3a]" />
          <span className="text-[7.5px] font-black text-[#0f4c3a] uppercase tracking-wider">
            AI BUSINESS COPILOT
          </span>
          <span className="w-2 h-[1.5px] bg-[#0f4c3a]" />
        </div>
      </div>
      {!compact && (
        <span className="hidden sm:inline-block pl-2 border-l border-emerald-950/20 text-[9.5px] font-semibold text-slate-500 uppercase tracking-wider">
          Kho FEFO & POS
        </span>
      )}
    </Link>
  );
}
