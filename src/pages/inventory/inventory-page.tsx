import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { CatalogHeader } from "@/pages/products/catalog-header";
import { Icon } from "@/pages/products/ui-icon";

const rows = [
  ["OSTK-2025-001", "Chủ Cửa Hàng", "18 items", "1,420", "184,500,000 đ", "APPLIED", "15/01/2025 09:30"],
  ["OSTK-2025-002", "Nguyễn Văn A", "42 items", "890", "92,400,000 đ", "APPLIED", "14/01/2025 15:40"],
  ["OSTK-2025-003", "Trần Thị B", "15 items", "340", "58,300,000 đ", "DRAFT", "16/01/2025 11:20"],
  ["OSTK-2025-004", "Chủ Cửa Hàng", "28 items", "520", "118,250,000 đ", "APPLIED", "12/01/2025 10:15"],
  ["OSTK-2025-005", "Nguyễn Văn A", "9 items", "115", "34,500,000 đ", "DRAFT", "16/01/2025 14:05"],
];

export function InventoryPage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const [expanded, setExpanded] = useState(true);
  const filtered = rows.filter((row) => row.join(" ").toLowerCase().includes(keyword.toLowerCase()));
  return (
    <div className="min-h-screen bg-[#f5f6fa] text-[#101828]">
      <CatalogHeader active="products" mode="inventory" keyword={keyword} onKeywordChange={setKeyword} />
      <main className="mx-auto max-w-[1580px] px-5 py-5">
        <div className="flex items-center justify-between"><h1 className="text-[30px] font-extrabold">Phiếu Nhập Kho Ban Đầu</h1><div className="flex gap-2"><button className="rounded-lg bg-white px-4 py-3 text-[13px] font-semibold"><Icon name="download" className="mr-2 align-middle text-[17px]" />Tải mẫu Excel</button><button className="rounded-lg bg-white px-4 py-3 text-[13px] font-semibold"><Icon name="upload_file" className="mr-2 align-middle text-[17px]" />Nhập từ file Excel / CSV</button><button onClick={() => navigate("/inventory/new")} className="rounded-lg bg-[#4f46e5] px-5 py-3 text-[14px] font-bold text-white">⊕ + Tạo phiếu nạp tồn mới</button></div></div>
        <div className="mt-5 grid grid-cols-4 gap-4">{[["receipt_long", "Tổng phiếu nạp tồn", "12", "phiếu"], ["category", "Tổng SKU đã nạp tồn", "485", "/526 SKUs"], ["account_balance_wallet", "Tổng giá trị vốn nạp ban đầu", "680,450,000", "đ"], ["pending_actions", "Cần hoàn tất", "02", "phiếu nháp"]].map(([icon, label, value, suffix], index) => <div key={label} className="rounded-xl bg-white p-5"><div className="flex justify-between text-[#667085]"><span>{label}</span><span className={index === 3 ? "rounded-lg bg-[#fee4e2] p-2 text-[#d92d20]" : "rounded-lg bg-[#e6efff] p-2 text-[#4338ca]"}><Icon name={icon} className="text-[20px]" /></span></div><p className={["mt-5 text-[30px] font-bold", index === 3 ? "text-[#d92d20]" : ""].join(" ")}>{value} <small className="text-[12px] font-normal text-[#667085]">{suffix}</small></p></div>)}</div>
        <section className="mt-5 rounded-xl bg-white p-4"><div className="flex gap-3"><div className="relative flex-1"><Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#98a2b3]" /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm kiếm mã phiếu (OSTK-...), SKU, người lập..." className="h-11 w-full rounded-lg border-0 bg-[#eef3ff] pl-10 text-[13px] outline-none" /></div><select className="rounded-lg border-0 bg-[#eef3ff] px-4 text-[13px]"><option>Đã áp dụng (APPLIED)</option><option>Bản nháp (DRAFT)</option></select><button className="rounded-lg bg-[#eef3ff] px-5 text-[13px]">Tháng này　⌄</button></div></section>
        <section className="mt-4 overflow-hidden rounded-xl bg-white"><table className="w-full text-left text-[13px]"><thead className="bg-[#eef3ff] text-[#667085]"><tr>{["Mã Phiếu", "Người lập (Created By)", "Dòng SKU", "Tổng SL tồn", "Tổng giá trị vốn (VNĐ)", "Trạng thái", "Thời gian ghi nhận", "Thao tác"].map((head) => <th key={head} className="px-4 py-4">{head}</th>)}</tr></thead><tbody>{filtered.map((row, index) => <tr key={row[0]} className="border-b border-[#eaecf0]"><td className="px-4 py-4"><Link to={index === 0 ? "/inventory/new" : "#"} className="font-mono font-bold text-[#4338ca]">▱ {row[0]}</Link><small className="block text-[#667085]">{index === 0 ? "Nạp tồn đầu kỳ Mỹ phẩm" : "Nạp tồn đầu kỳ Phụ kiện & Quà Tặng"}</small></td><td className="px-4"><span className="mr-2 inline-grid h-7 w-7 place-items-center rounded-full bg-[#e7e8ff] text-[10px]">CH</span>{row[1]}</td><td className="px-4"><span className="rounded-full bg-[#e4ebfb] px-3 py-1 font-mono">{row[2]}</span></td><td className="px-4 font-bold">{row[3]}</td><td className="px-4 font-bold text-[#4338ca]">{row[4]}</td><td className="px-4"><span className={["rounded-full px-3 py-1 text-[11px] font-semibold", row[5] === "DRAFT" ? "bg-[#dbe5f9] text-[#475467]" : "bg-[#6ce7b7] text-[#067647]"].join(" ")}>● {row[5]}</span></td><td className="px-4 font-mono text-[12px]">{row[6]}</td><td className="px-4"><button onClick={() => index === 0 && setExpanded((value) => !value)} className="rounded-lg bg-[#eef0ff] px-3 py-2 text-[#4338ca]">{row[5] === "DRAFT" ? "Chỉnh sửa" : "Xem chi tiết"}</button>　⋮</td></tr>)} </tbody></table>{expanded && <div className="m-4 rounded-xl border border-[#eef0ff] p-4"><h2 className="text-[18px] font-bold"><Icon name="receipt_long" className="mr-2 align-middle text-[#4338ca]" />Chi tiết phiếu OSTK-2025-001</h2><div className="mt-3 grid grid-cols-5 gap-2 bg-[#eef3ff] px-4 py-3 text-[11px] font-semibold text-[#667085]"><span>Sản phẩm & Mã SKU</span><span>Số lô / HSD</span><span>Số lượng nạp</span><span>Đơn giá vốn ban đầu</span><span>Thành tiền (VNĐ)</span></div>{[["Áo Polo Pima Cotton Cao Cấp", "50 cái", "180,000 đ", "9,000,000 đ"], ["Serum Phục Hồi B5 Hyaluronic", "100 hộp", "115,000 đ", "11,500,000 đ"], ["Giày Sneaker Retro Da Bò", "30 đôi", "420,000 đ", "12,600,000 đ"]].map((item) => <div key={item[0]} className="grid grid-cols-5 gap-2 border-b border-[#eaecf0] px-4 py-4 text-[12px]"><b>{item[0]}</b><span>LOT-202503-A</span><b>{item[1]}</b><span>{item[2]}</span><b>{item[3]}</b></div>)}</div>}</section>
      </main>
    </div>
  );
}
