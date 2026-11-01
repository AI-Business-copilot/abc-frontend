import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PermissionGate } from "@/components/common/permission-gate";
import { CatalogHeader } from "@/pages/products/catalog-header";
import type { ScrapStatus } from "@/types/scrap";
import { ScrapStatusBadge, formatDateTime, formatMoney } from "./components/scrap-ui";
import { useScrapOrders } from "./hooks/use-scrap-orders";

const tabs: { value: ScrapStatus; label: string }[] = [
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "COMPLETED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Bị từ chối" },
];

export function ScrapListPage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const { orders, total, statistics, status, page, totalPages, loading, error, changeStatus, goToPage } =
    useScrapOrders("PENDING");

  const needle = keyword.trim().toLowerCase();
  const visible = needle
    ? orders.filter((order) =>
        `${order.scrapCode} ${order.variant.template.name} ${order.variant.sku} ${order.lot?.lotNumber ?? ""}`
          .toLowerCase()
          .includes(needle))
    : orders;

  const cards = [
    { label: "Chờ duyệt", value: statistics?.pendingCount ?? 0, tone: "text-amber-700" },
    { label: "Đã duyệt", value: statistics?.completedCount ?? 0, tone: "text-emerald-700" },
    { label: "Bị từ chối", value: statistics?.rejectedCount ?? 0, tone: "text-rose-700" },
    { label: "Tổng giá trị tổn thất", value: formatMoney(statistics?.totalLossValue ?? 0), tone: "text-slate-900" },
  ];

  return (
    <div className="min-h-screen bg-[#f5f6fa] text-[#101828]">
      <CatalogHeader active="products" mode="inventory" keyword={keyword} onKeywordChange={setKeyword} />
      <main className="mx-auto max-w-[1580px] space-y-5 px-5 py-5">
        <PermissionGate permission="inventory.lot.read">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Phiếu hủy hàng</h1>
            <p className="mt-1 text-slate-600">Chủ cửa hàng xem ảnh bằng chứng rồi duyệt hoặc từ chối.</p>
          </div>

          {error && <Alert variant="destructive">{error}</Alert>}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
              <Card className="p-5" key={card.label}>
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className={`mt-2 text-2xl font-bold ${card.tone}`}>{card.value}</p>
              </Card>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <Button
                key={tab.value}
                onClick={() => changeStatus(tab.value)}
                size="sm"
                variant={status === tab.value ? "default" : "outline"}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          <Card className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#eef3ff] text-slate-500">
                <tr>
                  {["Mã phiếu", "Sản phẩm", "Lô", "Số lượng", "Người tạo", "Ảnh", "Trạng thái", "Ngày tạo"].map((head) => (
                    <th className="px-4 py-3 font-semibold" key={head}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={8}>Đang tải…</td></tr>
                ) : visible.length === 0 ? (
                  <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={8}>Chưa có phiếu hủy nào.</td></tr>
                ) : (
                  visible.map((order) => (
                    <tr
                      className="cursor-pointer border-t border-slate-100 hover:bg-violet-50/50"
                      key={order.id}
                      onClick={() => navigate(`/inventory/scrap/${order.id}`)}
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-violet-700">{order.scrapCode}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold">{order.variant.template.name}</div>
                        <div className="font-mono text-xs text-slate-500">{order.variant.sku}</div>
                      </td>
                      <td className="px-4 py-3 font-mono">{order.lot?.lotNumber ?? "—"}</td>
                      <td className="px-4 py-3 font-semibold">{order.scrapQty}</td>
                      <td className="px-4 py-3">{order.createdByUser?.fullName ?? "—"}</td>
                      <td className="px-4 py-3">{order._count.images}</td>
                      <td className="px-4 py-3"><ScrapStatusBadge status={order.status} /></td>
                      <td className="px-4 py-3">{formatDateTime(order.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{total} phiếu · trang {page}/{totalPages}</span>
              <div className="flex gap-2">
                <Button disabled={page <= 1} onClick={() => goToPage(page - 1)} size="sm" variant="outline">Trước</Button>
                <Button disabled={page >= totalPages} onClick={() => goToPage(page + 1)} size="sm" variant="outline">Sau</Button>
              </div>
            </div>
          )}
        </PermissionGate>
      </main>
    </div>
  );
}
