import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { productWizardApi, type TemplateDetail } from "@/api/product-wizard";
import { CatalogHeader } from "@/pages/products/catalog-header";
import { Icon } from "@/pages/products/ui-icon";
import { getPrimaryImage } from "@/lib/image-utils";
import { useAuth } from "@/hooks/use-auth";
import { OpeningStockVoucherModal, type VoucherItem } from "./opening-stock-voucher-modal";
import { BarcodePrintModal, type PrintableVariant } from "./barcode-print-modal";

type StockRow = {
  id: string;
  sku: string;
  attributeText: string;
  groupValue: string;
  cost: number;
  safety: number;
  quantity: number;
  lotNumber: string;
  manufacturingDate: string;
  expirationDate: string;
};

const vnd = (value: number) => new Intl.NumberFormat("vi-VN").format(Math.round(value || 0)) + " đ";
const palette = ["#0f4c3a", "#12b76a", "#f79009", "#0ba5ec", "#9e77ed", "#f04438"];

const displayUnit = (unit: string | null | undefined) => (unit || "Cái").split(" (")[0];

export function ProductInventoryPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get("templateId") || "";

  const [keyword, setKeyword] = useState("");
  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [rows, setRows] = useState<StockRow[]>([]);
  const [lotNumber, setLotNumber] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [manufacturingDate, setManufacturingDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Modal xem trước chứng từ & in ấn
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [showBarcodePrintModal, setShowBarcodePrintModal] = useState(false);

  // Cấu hình biểu đồ Donut phân tích tồn kho
  const [chartBreakdown, setChartBreakdown] = useState<"attribute" | "sku">("attribute");
  const [chartMetric, setChartMetric] = useState<"quantity" | "value">("quantity");

  useEffect(() => {
    if (!templateId) {
      navigate("/products/new", { replace: true });
      return;
    }
    let cancelled = false;
    productWizardApi
      .getTemplate(templateId)
      .then((detail) => {
        if (cancelled) return;
        if (detail.productVariants.length === 0) {
          navigate(`/products/new/variants?templateId=${templateId}`, { replace: true });
          return;
        }
        setTemplate(detail);

        // Lọc danh sách biến thể được tích chọn ở Bước 3 (Bỏ tích ở Bước 3 thì KHÔNG hiển thị ở Bước 4)
        const savedActive = sessionStorage.getItem(`abc:wizard:active_variants:${templateId}`);
        let activeVariantIds: string[] | null = null;
        if (savedActive) {
          try {
            const parsed = JSON.parse(savedActive);
            if (Array.isArray(parsed) && parsed.length > 0) {
              activeVariantIds = parsed;
            }
          } catch {}
        }

        const filteredVariants = activeVariantIds
          ? detail.productVariants.filter((v) => activeVariantIds.includes(v.id))
          : detail.productVariants;

        setRows(
          filteredVariants.map((variant) => {
            const values = variant.variantAttributeValues || [];
            // Lấy số lượng tồn kho thực tế đã có trong CSDL nếu đang cập nhật sản phẩm cũ
            const existingOnHand = ((variant as any).inventoryBalances || []).reduce(
              (sum: number, b: any) => sum + (Number(b.quantityOnHand) || 0),
              0,
            );
            return {
              id: variant.id,
              sku: variant.sku,
              attributeText: values.map((value) => value.attributeValue.value).join(" • "),
              groupValue: values[0]?.attributeValue.value || "Khác",
              cost: Number(variant.costPrice) || 0,
              safety: variant.safetyStockQty || 0,
              quantity: existingOnHand,
              lotNumber: "",
              manufacturingDate: "",
              expirationDate: "",
            };
          }),
        );
      })
      .catch((err: Error) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [templateId, navigate]);

  const totals = useMemo(
    () => ({
      quantity: rows.reduce((sum, row) => sum + row.quantity, 0),
      value: rows.reduce((sum, row) => sum + row.quantity * row.cost, 0),
    }),
    [rows],
  );

  const groups = useMemo(() => {
    const map = new Map<string, { quantity: number; value: number }>();
    for (const row of rows) {
      const key = chartBreakdown === "sku" ? row.sku : row.groupValue;
      const current = map.get(key) || { quantity: 0, value: 0 };
      current.quantity += row.quantity;
      current.value += row.quantity * row.cost;
      map.set(key, current);
    }
    return [...map.entries()]
      .filter(([, group]) => (chartMetric === "value" ? group.value > 0 : group.quantity > 0))
      .map(([label, group], index) => ({ label, ...group, color: palette[index % palette.length] }));
  }, [rows, chartBreakdown, chartMetric]);

  const voucherItems: VoucherItem[] = useMemo(() => {
    if (!template) return [];
    return rows
      .filter((r) => r.quantity > 0)
      .map((r) => {
        const v = template.productVariants.find((pv) => pv.id === r.id);
        return {
          id: r.id,
          sku: r.sku,
          barcode: v?.barcode || undefined,
          name: template.name,
          attributeText: r.attributeText,
          unit: displayUnit(template.unitOfMeasure),
          quantity: r.quantity,
          cost: r.cost,
          lotNumber: r.lotNumber,
          expirationDate: r.expirationDate,
          manufacturingDate: r.manufacturingDate,
        };
      });
  }, [template, rows]);

  const printableVariants: PrintableVariant[] = useMemo(() => {
    if (!template) return [];
    return rows.map((r) => {
      const v = template.productVariants.find((pv) => pv.id === r.id);
      return {
        id: r.id,
        sku: r.sku,
        barcode: v?.barcode || r.sku,
        templateName: template.name,
        attributeText: r.attributeText,
        price: Number(v?.basePrice) || 0,
      };
    });
  }, [template, rows]);

  const gradient = useMemo(() => {
    const total = chartMetric === "value" ? totals.value : totals.quantity;
    if (total <= 0) return "#eef2f7";
    let cursor = 0;
    const parts = groups.map((group) => {
      const metricVal = chartMetric === "value" ? group.value : group.quantity;
      const start = cursor;
      cursor += (metricVal / total) * 100;
      return `${group.color} ${start}% ${cursor}%`;
    });
    return `conic-gradient(${parts.join(", ")})`;
  }, [groups, totals, chartMetric]);

  const updateRow = (id: string, patch: Partial<StockRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const assignLotToAll = () => {
    if (!lotNumber.trim() && !expirationDate && !manufacturingDate) {
      setError("Nhập ít nhất mã lô hoặc hạn sử dụng trước khi gán cho toàn bộ SKU.");
      return;
    }
    setRows((current) =>
      current.map((row) => ({
        ...row,
        lotNumber: lotNumber.trim(),
        manufacturingDate,
        expirationDate,
      })),
    );
    setError("");
  };

  const publish = async (skipStock: boolean) => {
    if (!template) return;
    const items = rows.filter((row) => row.quantity > 0);
    if (!skipStock && items.length === 0) {
      setError("Nhập số lượng tồn đầu kỳ cho ít nhất một biến thể, hoặc chọn “Bỏ qua & Để tồn kho = 0”.");
      return;
    }
    if (!skipStock && template.hasLotTracking) {
      const missing = items.filter((row) => !row.lotNumber.trim() || !row.expirationDate);
      if (missing.length) {
        setError(`Có ${missing.length} SKU chưa có mã lô hoặc hạn sử dụng. Dùng “Gán toàn bộ SKU” hoặc nhập trực tiếp từng dòng.`);
        return;
      }
    }

    setBusy(true);
    setError("");
    try {
      if (!skipStock && items.length > 0) {
        await productWizardApi.createOpeningStock({
          note: `Tồn đầu kỳ khi tạo sản phẩm ${template.name}`,
          apply: true,
          items: items.map((row) => ({
            variantId: row.id,
            quantity: row.quantity,
            unitCost: row.cost,
            ...(template.hasLotTracking
              ? {
                  lotNumber: row.lotNumber.trim(),
                  manufacturingDate: row.manufacturingDate || undefined,
                  expirationDate: row.expirationDate,
                }
              : {}),
          })),
        });
      }
      await productWizardApi.updateTemplate(template.id, { isActive: true });
      sessionStorage.removeItem(`abc:wizard:selections:${template.id}`);
      sessionStorage.removeItem(`abc:wizard:industry:${template.id}`);
      navigate("/products", {
        state: {
          notice: skipStock
            ? `Đã đưa “${template.name}” vào kinh doanh với tồn kho ban đầu bằng 0.`
            : `Đã tạo “${template.name}” với ${rows.length} SKU và ${totals.quantity} ${displayUnit(template.unitOfMeasure)} tồn đầu kỳ.`,
        },
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f6fa]">
        <CatalogHeader active="products" keyword={keyword} onKeywordChange={setKeyword} />
        <div className="mx-auto max-w-[1560px] px-5 py-10 text-[13px] text-[#667085]">Đang tải sổ dư tồn kho đầu kỳ…</div>
      </div>
    );
  }

  const unit = displayUnit(template?.unitOfMeasure);

  return (
    <div className="min-h-screen bg-[#f5f6fa] pb-24 text-[#101828]">
      <CatalogHeader active="products" keyword={keyword} onKeywordChange={setKeyword} />
      <main className="mx-auto max-w-[1560px] px-5 py-3">
        {error && <div className="mb-3 rounded-lg border border-[#fecdca] bg-[#fef3f2] px-4 py-2.5 text-[12.5px] text-[#b42318]">{error}</div>}

        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#0a3528]">QUY TRÌNH KHỞI TẠO HÀNG HÓA CHUẨN ERP RETAIL</p>
            <div className="mt-1 flex items-center gap-2">
              <h1 className="text-[19px] font-bold">Bước 4: Tồn kho &amp; Phân bổ</h1>
            </div>
          </div>
          <span className="font-mono text-[12px] text-[#667085]">ID Mẫu: {template?.code}</span>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-3">
          {[
            ["✓", "BƯỚC 1 • ĐÃ DUYỆT", `Mẫu cha - ${template?.name || ""}`],
            ["✓", "BƯỚC 2 • HOÀN THÀNH", "Thuộc tính & tổ hợp"],
            ["✓", "BƯỚC 3 • ĐÃ TẠO MÃ", `${rows.length} SKU, Barcode & Giá vốn`],
            ["4", "BƯỚC 4 • CHỐT SỔ 100%", "Số dư tồn đầu kỳ (Kho hàng)"],
          ].map(([number, label, title], index) => (
            <div key={label} className={["rounded-xl px-4 py-3", index === 3 ? "bg-[#0f4c3a] text-white" : "bg-white"].join(" ")}>
              <span className={["mr-2 inline-grid h-7 w-7 place-items-center rounded-full font-bold", index === 3 ? "bg-white text-[#0a3528]" : "bg-[#d1fadf] text-[#067647]"].join(" ")}>{number}</span>
              <span className="text-[10px] font-semibold">{label}</span>
              <p className="ml-9 text-[13px] font-bold">{title}</p>
            </div>
          ))}
        </div>

        <section className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-lg bg-[#ecfdf5] text-[#0a3528]">
              {template?.imageUrl ? <img alt={template.name} className="h-full w-full object-cover" src={getPrimaryImage(template.imageUrl)} /> : <Icon name="inventory_2" className="text-[28px]" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-[#ecfdf5] px-2 py-1 font-mono text-[11px] font-bold text-[#0a3528]">{template?.code}</span>
                <span className="rounded bg-[#ecfdf5] px-2 py-1 text-[11px]">{template?.category?.name || "Chưa phân loại"}</span>
                <span className={["rounded-full px-2 py-1 text-[11px] font-semibold", template?.hasLotTracking ? "bg-[#6ce7b7] text-[#067647]" : "bg-[#f2f4f7] text-[#667085]"].join(" ")}>
                  ⚙ FEFO Date Lô: {template?.hasLotTracking ? "ĐANG BẬT" : "ĐANG TẮT"}
                </span>
              </div>
              <h2 className="mt-1 text-[21px] font-bold">{template?.name}</h2>
            </div>
          </div>
          <div className="flex gap-3 text-center">
            <div className="rounded-lg bg-[#ecfdf5] px-5 py-2">
              <p className="text-[10px] text-[#667085]">TỔNG BIẾN THỂ</p>
              <b>{rows.length} SKU</b>
              <small className="block text-[#667085]">{rows[0]?.attributeText || ""}</small>
            </div>
            <div className="rounded-lg bg-[#ecfdf5] px-5 py-2">
              <p className="text-[10px] text-[#667085]">TỔNG TỒN BAN ĐẦU</p>
              <b className="text-[#0a3528]">{totals.quantity} {unit}</b>
            </div>
            <div className="rounded-lg bg-[#ecfdf5] px-5 py-2">
              <p className="text-[10px] text-[#667085]">GIÁ TRỊ TÀI SẢN KHO</p>
              <b>{vnd(totals.value)}</b>
              <small className="block text-[#667085]">Theo đơn giá vốn net</small>
            </div>
          </div>
        </section>

        {template?.hasLotTracking ? (
          <section className="mt-4 rounded-xl border border-[#e1e7f2] bg-white p-4">
            <h2 className="text-[16px] font-bold">
              <Icon name="qr_code_2" className="mr-2 align-middle text-[21px] text-[#0a3528]" />
              Thiết Lập Lô &amp; Hạn Sử Dụng Mặc Định (FEFO Tracking)
              <span className="ml-2 rounded-full bg-[#6ce7b7] px-2 py-1 text-[10px] text-[#067647]">⚙ Quản lý Date: Đang Bật</span>
            </h2>
            <p className="text-[11px] text-[#667085]">Cấu hình thông tin lô sản xuất và hạn sử dụng khởi tạo cho tất cả {rows.length} biến thể</p>
            <div className="mt-3 grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-3">
              <label className="text-[10px] font-bold uppercase">
                Mã số lô (Lot Number)
                <input value={lotNumber} onChange={(event) => setLotNumber(event.target.value)} placeholder="VD: LOT-2026-B5" className="mt-1 h-10 w-full rounded-lg border-0 bg-[#ecfdf5] px-3 font-mono text-[13px] outline-none" />
              </label>
              <label className="text-[10px] font-bold uppercase">
                Hạn sử dụng (EXP Date)
                <input value={expirationDate} onChange={(event) => setExpirationDate(event.target.value)} type="date" className="mt-1 h-10 w-full rounded-lg border-0 bg-[#ecfdf5] px-3 text-[13px] outline-none" />
                {expirationDate && <span className="mt-1 block text-[10px] font-normal text-[#067647]">Hạn dùng: {expirationDate}</span>}
              </label>
              <label className="text-[10px] font-bold uppercase">
                Ngày sản xuất (MFG)
                <input value={manufacturingDate} onChange={(event) => setManufacturingDate(event.target.value)} type="date" className="mt-1 h-10 w-full rounded-lg border-0 bg-[#ecfdf5] px-3 text-[13px] outline-none" />
              </label>
              <button onClick={assignLotToAll} className="h-10 rounded-lg bg-[#0f4c3a] px-7 text-[14px] font-bold text-white">
                Gán toàn bộ SKU
              </button>
            </div>
          </section>
        ) : (
          <section className="mt-4 rounded-xl border border-[#e1e7f2] bg-white p-4 text-[12px] text-[#667085]">
            Sản phẩm này không bật quản lý lô/hạn dùng. Hệ thống sẽ ghi sổ tồn kho theo biến thể và kho mặc định.
          </section>
        )}

        <section className="mt-4 overflow-hidden rounded-xl bg-white">
          <div className="px-4 py-4">
            <h2 className="text-[16px] font-bold">
              Thiết Lập Số Dư Tồn Đầu Kỳ (Kho Cửa Hàng Chính)
              <span className="ml-2 rounded-full bg-[#ecfdf5] px-2 py-1 text-[11px] font-semibold text-[#0a3528]">▣ Địa điểm: Kho Cửa Hàng Chính (Mặc định)</span>
            </h2>
            <p className="text-[11px] text-[#667085]">Mô hình đơn kho tập trung: Nhập số lượng tồn đầu kỳ cho từng biến thể để ghi sổ cái.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-[12px]">
              <thead className="bg-[#ecfdf5] text-[10px] uppercase text-[#667085]">
                <tr>
                  <th className="px-4 py-3">Thông tin biến thể &amp; giá vốn</th>
                  <th className="w-72 px-4 py-3">Số lượng tồn đầu kỳ</th>
                  <th className="w-56 px-4 py-3">Thành tiền vốn</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-[#eaecf0]">
                    <td className="px-4 py-3">
                      <b className="block text-[14px]">
                        {template?.name} <span className="rounded bg-[#ecfdf5] px-1.5 py-1 text-[10px]">{row.attributeText}</span>
                      </b>
                      <code className="font-semibold text-[#0a3528]">{row.sku}</code>　
                      <span className="font-mono text-[#667085]">• Vốn: {vnd(row.cost)}　• An toàn: {row.safety}</span>
                      {template?.hasLotTracking && (
                        <small className="block text-[#667085]">
                          ♢ Lô: {row.lotNumber || "Chưa gán"}　{row.expirationDate ? `• HSD: ${row.expirationDate}` : ""}
                        </small>
                      )}
                    </td>
                    <td className="px-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          value={row.quantity}
                          onChange={(event) => updateRow(row.id, { quantity: Math.max(0, Math.trunc(Number(event.target.value) || 0)) })}
                          className="h-10 w-36 rounded-lg border-0 bg-[#ecfdf5] px-3 text-center text-[15px] outline-none focus:ring-2 focus:ring-[#a7f3d0]"
                        />
                        <span className="text-[#667085]">{unit}</span>
                      </div>
                    </td>
                    <td className="px-4 text-right text-[15px] font-bold">{vnd(row.quantity * row.cost)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#e2f6ed]">
                <tr>
                  <td className="px-4 py-3 text-[16px] font-bold">▥ TỔNG CỘNG HỆ THỐNG KHO</td>
                  <td className="px-4 py-3 text-[16px] font-bold">{totals.quantity} {unit}</td>
                  <td className="px-4 py-3 text-right text-[16px] font-bold">{vnd(totals.value)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <div className="mt-4 grid grid-cols-[0.8fr_1.5fr] gap-4">
          <section className="rounded-xl bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-[14px]">◉ Cơ Cấu Tồn Kho</h2>
              <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-[10px]">
                <button
                  type="button"
                  onClick={() => setChartMetric("quantity")}
                  className={["px-2 py-0.5 rounded font-bold transition-all", chartMetric === "quantity" ? "bg-white text-[#0f4c3a] shadow-xs" : "text-gray-500"].join(" ")}
                >
                  Số lượng
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric("value")}
                  className={["px-2 py-0.5 rounded font-bold transition-all", chartMetric === "value" ? "bg-white text-[#0f4c3a] shadow-xs" : "text-gray-500"].join(" ")}
                >
                  Giá trị
                </button>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-[10px] uppercase font-bold text-[#667085]">Phân nhóm:</span>
              <div className="flex items-center gap-2 text-[11px]">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="breakdown"
                    checked={chartBreakdown === "attribute"}
                    onChange={() => setChartBreakdown("attribute")}
                    className="accent-[#0f4c3a]"
                  />
                  <span>Thuộc tính</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="breakdown"
                    checked={chartBreakdown === "sku"}
                    onChange={() => setChartBreakdown("sku")}
                    className="accent-[#0f4c3a]"
                  />
                  <span>Từng SKU</span>
                </label>
              </div>
            </div>

            <div className="mx-auto my-4 grid h-36 w-36 place-items-center rounded-full" style={{ background: gradient }}>
              <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-center text-[10px] leading-tight px-1">
                <span className="text-gray-400 font-bold uppercase">{chartMetric === "value" ? "GIÁ TRỊ VỐN" : "TỔNG TỒN"}</span>
                <b className="text-[14px] text-gray-900 mt-0.5">
                  {chartMetric === "value" ? vnd(totals.value) : totals.quantity.toLocaleString("vi-VN")}
                </b>
                <span className="text-gray-500">{chartMetric === "value" ? "Net" : unit}</span>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {groups.map((group) => {
                const total = chartMetric === "value" ? totals.value : totals.quantity;
                const metricVal = chartMetric === "value" ? group.value : group.quantity;
                const pct = total > 0 ? ((metricVal / total) * 100).toFixed(1) : "0.0";
                return (
                  <p key={group.label} className="flex items-center justify-between text-[11px] text-[#667085]">
                    <span className="truncate pr-2">
                      <span className="mr-1.5 inline-block h-2 w-2 rounded-sm shrink-0" style={{ background: group.color }} />
                      <span className="font-medium text-gray-700">{group.label}</span>
                      <span className="text-gray-400 text-[10px] ml-1">
                        ({chartMetric === "value" ? vnd(group.value) : `${group.quantity} ${unit}`})
                      </span>
                    </span>
                    <b className="text-gray-900 shrink-0 font-mono">{pct}%</b>
                  </p>
                );
              })}
              {groups.length === 0 && <p className="text-[11px] text-[#98a2b3]">Nhập số lượng tồn đầu kỳ để xem cơ cấu giá trị.</p>}
            </div>
          </section>

          <section className="rounded-xl bg-white p-4">
            <h2 className="font-bold flex items-center justify-between">
              <span className="flex items-center">
                <Icon name="print" className="mr-2 text-[19px] text-[#0a3528]" />
                Tùy chọn Xuất phiếu &amp; Tài liệu Đính kèm
              </span>
              <span className="rounded bg-[#6ce7b7] px-2 py-0.5 text-[10px] font-bold text-[#067647]">
                Sẵn sàng in A4 / Decal
              </span>
            </h2>
            <p className="mt-1 text-[11px] text-[#667085]">
              Xem trước chứng từ kiểm kê kho chuẩn A4 hoặc in tem mã vạch barcode trước khi đưa vào kinh doanh.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-left flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <b className="text-[13px] text-gray-900">Phiếu kiểm kê F02</b>
                    <span className="text-[10px] font-bold text-[#0f4c3a] bg-white px-2 py-0.5 rounded border border-emerald-100">Khổ A4</span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-[#667085] leading-relaxed">
                    Bao gồm chữ ký thủ kho, kế toán &amp; chủ shop, xuất file PDF A4 chuẩn ISO.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (voucherItems.length === 0) {
                      setError("Hãy nhập số lượng tồn > 0 cho ít nhất một biến thể để xem trước phiếu kiểm kê.");
                      return;
                    }
                    setError("");
                    setShowVoucherModal(true);
                  }}
                  className="mt-4 w-full rounded-lg bg-[#0f4c3a] py-2 text-[12px] font-bold text-white shadow-sm hover:bg-[#0a3528] transition-colors flex items-center justify-center gap-1.5"
                >
                  <Icon name="visibility" className="text-[16px]" />
                  Xem trước Phiếu kiểm kê A4
                </button>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 text-left flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <b className="text-[13px] text-gray-900">Tem Barcode dán kệ</b>
                    <span className="text-[10px] font-bold text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-200">Decal nhiệt</span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-[#667085] leading-relaxed">
                    Tạo file in {rows.length} SKU (khổ Decal 50×30mm hoặc 35×22mm cho máy in Xprinter/Zebra/Godex).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBarcodePrintModal(true)}
                  className="mt-4 w-full rounded-lg border border-gray-300 bg-white py-2 text-[12px] font-bold text-gray-800 shadow-sm hover:bg-gray-100 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Icon name="qr_code_2" className="text-[16px] text-[#0f4c3a]" />
                  In Tem Mã Vạch (Decal)
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-[#eaecf0] bg-white px-5 py-3">
        <div className="mx-auto flex max-w-[1560px] items-center justify-between">
          <button onClick={() => navigate(`/products/new/variants?templateId=${templateId}`)} className="rounded-lg bg-[#eaf0ff] px-5 py-3 text-[14px] font-semibold text-[#344054]">
            ← Bước 3: Sinh biến thể SKU
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (voucherItems.length === 0) {
                  setError("Hãy nhập số lượng tồn > 0 cho ít nhất một biến thể để xem trước phiếu kiểm kê.");
                  return;
                }
                setError("");
                setShowVoucherModal(true);
              }}
              className="rounded-lg border border-[#a7f3d0] bg-white px-4 py-2.5 text-[13px] font-bold text-[#0f4c3a] hover:bg-[#ecfdf5] shadow-sm transition-colors inline-flex items-center gap-1.5"
            >
              <Icon name="receipt_long" className="text-[18px]" />
              Xem trước Phiếu kiểm kê (A4)
            </button>
            <button disabled={busy} onClick={() => void publish(true)} className="text-[13px] font-semibold text-[#667085] disabled:opacity-60 px-2">
              Bỏ qua &amp; Để tồn kho = 0
            </button>
            <button
              disabled={busy}
              onClick={() => void publish(false)}
              className="rounded-lg bg-[#0f4c3a] px-7 py-3 text-[14px] font-bold text-white shadow-[0_4px_12px_rgba(79,70,229,0.3)] disabled:opacity-60"
            >
              {busy ? "Đang hoàn tất..." : "🚀 Hoàn tất & Đưa vào Kinh doanh (Publish)"}
            </button>
          </div>
        </div>
      </footer>

      {/* MODAL XEM TRƯỚC PHIẾU KIỂM KÊ KHO A4 */}
      {showVoucherModal && (
        <OpeningStockVoucherModal
          voucherCode={(() => {
            const year = new Date().getFullYear();
            const rawDigits = (template?.code || "").replace(/^TMP-/, "").replace(/^\d{4}-/, "").replace(/[^0-9]/g, "");
            return `PKK-${year}-${rawDigits ? rawDigits.padStart(4, "0") : "0001"}`;
          })()}
          businessName={profile?.business?.name || "CỬA HÀNG ERP"}
          businessAddress={profile?.business?.address || "Việt Nam"}
          businessPhone={profile?.business?.phone || "0900000000"}
          creatorName={profile?.user?.fullName || "Quản trị viên"}
          note={`Kiểm kê nạp tồn kho ban đầu khi tạo sản phẩm ${template?.name || ""}`}
          items={voucherItems}
          hasLotTracking={Boolean(template?.hasLotTracking)}
          onClose={() => setShowVoucherModal(false)}
          onConfirmPublish={() => {
            setShowVoucherModal(false);
            void publish(false);
          }}
          isPublishing={busy}
        />
      )}

      {/* MODAL IN TEM MÃ VẠCH */}
      {showBarcodePrintModal && (
        <BarcodePrintModal
          shopName={profile?.business?.name || "CỬA HÀNG ERP"}
          variants={printableVariants}
          onClose={() => setShowBarcodePrintModal(false)}
        />
      )}
    </div>
  );
}
