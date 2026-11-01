import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { productWizardApi, type TemplateDetail } from "@/api/product-wizard";
import { CatalogHeader } from "@/pages/products/catalog-header";
import { Icon } from "@/pages/products/ui-icon";
import { getPrimaryImage } from "@/lib/image-utils";

type Selection = { attributeId: string; displayOrder: number; valueIds: string[] };

type PriceRow = {
  id: string;
  sku: string;
  barcode: string;
  attributeText: string;
  groupValue: string;
  cost: number;
  price: number;
  safety: number;
};

const vnd = (value: number) => new Intl.NumberFormat("vi-VN").format(Math.round(value || 0)) + " đ";
const roundThousand = (value: number) => Math.max(0, Math.round(value / 1000) * 1000);

function readSelections(templateId: string): Selection[] {
  try {
    const raw = sessionStorage.getItem(`abc:wizard:selections:${templateId}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Tránh gọi sinh biến thể hai lần khi React StrictMode chạy lại effect.
const pendingLoads = new Map<string, Promise<TemplateDetail>>();

function loadTemplateWithVariants(templateId: string, selections: Selection[]): Promise<TemplateDetail> {
  const key = `${templateId}|${selections.map((selection) => `${selection.attributeId}:${selection.valueIds.join(",")}`).join(";")}`;
  const existing = pendingLoads.get(key);
  if (existing) return existing;

  const promise = (async () => {
    let detail = await productWizardApi.getTemplate(templateId);
    if (detail.productVariants.length === 0) {
      if (selections.length === 0) {
        throw new Error("Thiếu cấu hình thuộc tính. Vui lòng quay lại Bước 2 và chọn giá trị thuộc tính.");
      }
      await productWizardApi.generateVariants(
        templateId,
        selections.map((selection) => ({ attributeId: selection.attributeId, attributeValueIds: selection.valueIds })),
        { costPrice: 75000, basePrice: 145000 },
      );
      detail = await productWizardApi.getTemplate(templateId);
    }
    return detail;
  })().catch((err) => {
    pendingLoads.delete(key);
    throw err;
  });

  pendingLoads.set(key, promise);
  return promise;
}

export function ProductVariantsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get("templateId") || "";

  const [keyword, setKeyword] = useState("");
  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [baseCost, setBaseCost] = useState(75000);
  const [margin, setMargin] = useState(48.5);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const mapRows = (detail: TemplateDetail, selections: Selection[]): PriceRow[] => {
    const order = selections.map((selection) => selection.attributeId);
    const firstAttributeId = order[0] || "";
    return detail.productVariants.map((variant) => {
      const values = [...(variant.variantAttributeValues || [])].sort(
        (a, b) => order.indexOf(a.attribute.id) - order.indexOf(b.attribute.id),
      );
      const cost = Number(variant.costPrice) || 0;
      const price = Number(variant.basePrice) || 0;
      return {
        id: variant.id,
        sku: variant.sku,
        barcode: variant.barcode || "",
        attributeText: values.map((value) => value.attributeValue.value).join(" • "),
        groupValue: values.find((value) => value.attribute.id === firstAttributeId)?.attributeValue.value || values[0]?.attributeValue.value || "Khác",
        cost,
        price,
        safety: variant.safetyStockQty || 0,
      };
    });
  };

  useEffect(() => {
    if (!templateId) {
      navigate("/products/new", { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const selections = readSelections(templateId);
        const detail = await loadTemplateWithVariants(templateId, selections);
        if (cancelled) return;
        setTemplate(detail);
        const mapped = mapRows(detail, selections);
        setRows(mapped);
        setSelectedIds(mapped.map((row) => row.id));
        const firstWithCost = mapped.find((row) => row.cost > 0);
        if (firstWithCost) {
          setBaseCost(firstWithCost.cost);
          const firstWithPrice = mapped.find((row) => row.price > 0 && row.cost > 0);
          if (firstWithPrice) setMargin(Math.round(((firstWithPrice.price - firstWithPrice.cost) / firstWithPrice.price) * 1000) / 10);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const totals = useMemo(
    () => ({
      cost: rows.reduce((sum, row) => sum + row.cost, 0),
      price: rows.reduce((sum, row) => sum + row.price, 0),
      safety: rows.reduce((sum, row) => sum + row.safety, 0),
    }),
    [rows],
  );
  const dimensionCount =
    readSelections(templateId).length || template?.productVariants[0]?.variantAttributeValues.length || 0;
  const totalMargin = totals.price > 0 ? ((totals.price - totals.cost) / totals.price) * 100 : 0;

  const updateRow = (id: string, patch: Partial<PriceRow>) => {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const applyPricing = () => {
    const target = selectedIds.length ? selectedIds : rows.map((row) => row.id);
    const nextCost = Math.max(0, Number(baseCost) || 0);
    const nextPrice = roundThousand(nextCost / Math.max(0.01, 1 - Math.min(95, Math.max(0, Number(margin) || 0)) / 100));
    setRows((current) => current.map((row) => (target.includes(row.id) ? { ...row, cost: nextCost, price: nextPrice } : row)));
    setNotice(`Đã áp dụng giá vốn ${vnd(nextCost)} và margin ${margin}% cho ${target.length} biến thể.`);
  };

  const persistPrices = async () => {
    if (!template) return;
    await productWizardApi.bulkUpdateVariants(
      template.id,
      rows.map((row) => ({ id: row.id, costPrice: row.cost, basePrice: row.price, safetyStockQty: row.safety })),
    );
  };

  const saveDraft = async () => {
    setBusy(true);
    setError("");
    try {
      await persistPrices();
      setNotice("Đã lưu giá vốn, giá bán và tồn an toàn cho toàn bộ biến thể.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const goNext = async () => {
    const invalid = rows.find((row) => row.price < row.cost || row.price <= 0);
    if (invalid) {
      setError(`Giá bán của SKU ${invalid.sku} phải lớn hơn hoặc bằng giá vốn và lớn hơn 0.`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await persistPrices();
      navigate(`/products/new/inventory?templateId=${templateId}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggleAll = () => {
    setSelectedIds((current) => (current.length === rows.length ? [] : rows.map((row) => row.id)));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f6fa]">
        <CatalogHeader active="products" keyword={keyword} onKeywordChange={setKeyword} />
        <div className="mx-auto max-w-[1560px] px-5 py-10 text-[13px] text-[#667085]">Đang sinh ma trận biến thể từ thuộc tính…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f6fa] pb-24 text-[#101828]">
      <CatalogHeader active="products" keyword={keyword} onKeywordChange={setKeyword} />
      <main className="mx-auto max-w-[1560px] px-5 py-3">
        {error && <div className="mb-3 rounded-lg border border-[#fecdca] bg-[#fef3f2] px-4 py-2.5 text-[12.5px] text-[#b42318]">{error}</div>}
        {notice && <div className="mb-3 rounded-lg border border-[#abefc6] bg-[#ecfdf3] px-4 py-2.5 text-[12.5px] text-[#067647]">{notice}</div>}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-bold">
              <span className="mr-2 rounded bg-[#4f46e5] px-2 py-1 text-[12px] text-white">BƯỚC 3 / 4</span>
              Sinh Biến thể SKU &amp; Định Giá Thương Mại
            </h1>
            <p className="mt-1 text-[11px] text-[#667085]">Quy trình Khởi tạo Hàng hóa &amp; Biến thể SKU Matrix • Chuẩn hóa dữ liệu ERP đa kênh</p>
          </div>
          <span className="rounded-lg bg-white px-4 py-2 text-[12px] font-semibold shadow-sm">
            <Icon name="verified_user" className="mr-1 align-middle text-[17px] text-[#067647]" />
            {template?.code || "TMP"} <span className="ml-2 text-[#98a2b3]">• {rows.length} SKU khả dụng</span>
          </span>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-3">
          {[
            ["✓", "BƯỚC 1 ✓", "Mẫu sản phẩm cha", template?.code || ""],
            ["✓", "BƯỚC 2 ✓", "Thiết lập Thuộc tính", `${dimensionCount} Thuộc tính • ${rows.length} Tổ hợp`],
            ["3", "BƯỚC 3 • ĐANG THỰC HIỆN", "Sinh biến thể SKU", "Mã SKU, Barcode, Giá vốn / Bán"],
            ["4", "BƯỚC 4 • SẮP TỚI", "Số dư tồn ban đầu", "inventory_balances & Phân kho"],
          ].map(([number, eyebrow, title, subtitle], index) => (
            <div key={title} className={["rounded-xl px-4 py-3", index === 2 ? "bg-[#4f46e5] text-white" : "bg-white"].join(" ")}>
              <div className="flex items-center gap-3">
                <span className={["grid h-9 w-9 place-items-center rounded-full text-[18px] font-bold", index === 2 ? "bg-white text-[#4f46e5]" : "bg-[#d1fadf] text-[#067647]"].join(" ")}>{number}</span>
                <div>
                  <p className={["text-[10px] font-semibold", index === 2 ? "text-white/80" : "text-[#667085]"].join(" ")}>{eyebrow}</p>
                  <p className="text-[14px] font-bold">{title}</p>
                  <p className={["text-[11px]", index === 2 ? "text-white/80" : "text-[#667085]"].join(" ")}>{subtitle}</p>
                </div>
                {index === 2 && <span className="ml-auto rounded bg-white px-2 py-1 text-[10px] font-bold text-[#4338ca]">75%</span>}
              </div>
            </div>
          ))}
        </div>

        <section className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center overflow-hidden rounded-lg bg-[#eef0ff] text-[#4338ca]">
              {template?.imageUrl ? <img alt={template.name} className="h-full w-full object-cover" src={getPrimaryImage(template.imageUrl)} /> : <Icon name="inventory_2" className="text-[25px]" />}
            </span>
            <div>
              <h2 className="text-[16px] font-bold">{template?.name}</h2>
              <p className="text-[11px] text-[#667085]">
                Mã mẫu cha: <b>{template?.code}</b>　•　ĐVT chính: <b>{template?.unitOfMeasure}</b>　•　Lô FEFO: <b>{template?.hasLotTracking ? "Bật" : "Tắt"}</b>
              </p>
              <p className="text-[11px] text-[#4338ca]">
                {rows.length} biến thể được sinh tự động từ {dimensionCount} chiều thuộc tính.
              </p>
            </div>
          </div>
          <div className="flex gap-2 text-center">
            <div className="rounded-lg bg-[#eef3ff] px-5 py-2">
              <p className="text-[10px] text-[#667085]">TỔNG GIÁ VỐN</p>
              <b>{vnd(totals.cost)}</b>
            </div>
            <div className="rounded-lg bg-[#eef3ff] px-5 py-2">
              <p className="text-[10px] text-[#667085]">BIÊN LỢI NHUẬN</p>
              <b className="text-[#067647]">+{totalMargin.toFixed(1)}%</b>
            </div>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-[1.05fr_1.2fr_1.15fr] items-end gap-3 rounded-xl bg-white p-4">
          <label className="text-[10px] font-bold uppercase">
            Quy tắc sinh mã SKU <span className="ml-8 font-mono text-[#4338ca]">[BRAND]-[CODE]-[VOL]-[VER]</span>
            <div className="mt-1 truncate rounded-lg bg-[#eef3ff] px-3 py-3 font-mono text-[13px] font-normal">
              <b># {rows[0]?.sku || "SKU"}</b>
            </div>
          </label>
          <div className="text-[10px] font-bold uppercase">
            Định giá cơ sở &amp; biên lợi nhuận (Margin)
            <div className="mt-1 flex items-center gap-2">
              <span className="flex-1 rounded-lg bg-[#eef3ff] px-3 py-3 text-[12px] font-normal">
                Vốn gốc:{" "}
                <input value={baseCost} onChange={(event) => setBaseCost(Number(event.target.value))} type="number" className="w-24 bg-transparent text-right text-[15px] outline-none" /> đ
              </span>
              <span className="flex-1 rounded-lg bg-[#eef3ff] px-3 py-3 text-[12px] font-normal">
                Margin:{" "}
                <input value={margin} onChange={(event) => setMargin(Number(event.target.value))} type="number" className="w-14 bg-transparent text-right text-[15px] text-[#067647] outline-none" /> %
              </span>
            </div>
          </div>
          <button onClick={applyPricing} className="h-12 rounded-lg bg-[#deebff] text-[14px] font-semibold text-[#344054]">
            <Icon name="payments" className="mr-2 align-middle text-[18px]" />
            Áp dụng cho {selectedIds.length || rows.length} Biến thể
          </button>
        </section>

        <section className="mt-4 overflow-hidden rounded-xl bg-white">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-[16px] font-bold">
              <span className="mr-2 text-[#067647]">●</span>Danh Sách Biến Thể Hàng Hóa
              <span className="ml-2 rounded bg-[#eef3ff] px-2 py-1 font-mono text-[11px] text-[#667085]">{rows.length} SKUs Generated</span>
            </h2>
            <div className="flex gap-2">
              <span className="rounded-lg bg-[#f2f4f7] px-3 py-2 text-[11px] text-[#667085]">
                <Icon name="filter_alt" className="mr-1 align-middle text-[15px]" />
                {dimensionCount} chiều thuộc tính
              </span>
              <button onClick={() => window.print()} className="rounded-lg bg-[#f2f4f7] px-3 py-2 text-[11px] text-[#667085]">
                <Icon name="print" className="mr-1 align-middle text-[15px]" />
                In tem mã vạch
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-[12px]">
              <thead className="bg-[#eef3ff] text-[10px] uppercase text-[#667085]">
                <tr>
                  <th className="w-12 px-4 py-3">
                    <input type="checkbox" checked={selectedIds.length === rows.length && rows.length > 0} onChange={toggleAll} />
                  </th>
                  <th className="px-2 py-3">Biến thể &amp; thuộc tính</th>
                  <th className="px-2 py-3">Mã SKU ERP</th>
                  <th className="px-2 py-3">Mã vạch barcode</th>
                  <th className="px-2 py-3">Giá vốn (cost)</th>
                  <th className="px-2 py-3">Giá bán lẻ (retail)</th>
                  <th className="px-2 py-3">Biên LN (%)</th>
                  <th className="px-2 py-3">Tồn an toàn</th>
                  <th className="px-2 py-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const rowMargin = row.price > 0 ? ((row.price - row.cost) / row.price) * 100 : 0;
                  return (
                    <tr key={row.id} className="border-b border-[#eaecf0]">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(row.id)}
                          onChange={(event) =>
                            setSelectedIds((current) => (event.target.checked ? [...current, row.id] : current.filter((id) => id !== row.id)))
                          }
                        />
                      </td>
                      <td className="px-2 py-3">
                        <b className="block text-[13px]">{template?.name}</b>
                        <span className="mt-1 inline-block rounded bg-[#eef3ff] px-2 py-1 text-[10px]">{row.attributeText}</span>
                      </td>
                      <td className="px-2">
                        <code className="rounded bg-[#eef3ff] px-2 py-2 font-semibold">{row.sku}</code>
                      </td>
                      <td className="px-2">
                        <code className="rounded bg-[#eef3ff] px-2 py-2">{row.barcode || "—"}</code>
                      </td>
                      <td className="px-2">
                        <input
                          value={row.cost}
                          min={0}
                          type="number"
                          onChange={(event) => updateRow(row.id, { cost: Math.max(0, Number(event.target.value)) })}
                          className="w-28 rounded bg-[#eef3ff] px-3 py-2 text-right outline-none focus:ring-2 focus:ring-[#c7cbff]"
                        />
                      </td>
                      <td className="px-2">
                        <input
                          value={row.price}
                          min={0}
                          type="number"
                          onChange={(event) => updateRow(row.id, { price: Math.max(0, Number(event.target.value)) })}
                          className="w-28 rounded bg-[#eef0ff] px-3 py-2 text-right font-semibold text-[#4338ca] outline-none focus:ring-2 focus:ring-[#c7cbff]"
                        />
                      </td>
                      <td className="px-2">
                        <span className={["rounded px-2 py-1", rowMargin >= 0 ? "bg-[#6ce7b7]" : "bg-[#fee4e2]"].join(" ")}>{rowMargin.toFixed(1)}%</span>
                      </td>
                      <td className="px-2">
                        <input
                          value={row.safety}
                          min={0}
                          type="number"
                          onChange={(event) => updateRow(row.id, { safety: Math.max(0, Math.trunc(Number(event.target.value))) })}
                          className="w-20 rounded bg-[#eef3ff] px-3 py-2 text-center outline-none focus:ring-2 focus:ring-[#c7cbff]"
                        />
                      </td>
                      <td className="px-2">
                        <span className="rounded-full bg-[#6ce7b7] px-2 py-1 text-[10px]">Active</span>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-[13px] text-[#667085]" colSpan={9}>
                      Chưa có biến thể nào. Quay lại Bước 2 và chọn ít nhất một giá trị thuộc tính.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-[#deebff] text-[13px] font-bold">
                <tr>
                  <td className="px-4 py-3" colSpan={4}>
                    TỔNG CỘNG {rows.length} BIẾN THỂ
                  </td>
                  <td className="px-4 py-3 text-right">{vnd(totals.cost)}</td>
                  <td className="px-4 py-3 text-right">{vnd(totals.price)}</td>
                  <td className="px-4 py-3">{totalMargin.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-center">{totals.safety}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-[#eaecf0] bg-white px-5 py-3">
        <div className="mx-auto flex max-w-[1560px] items-center justify-between">
          <button onClick={() => navigate(`/products/new/attributes?templateId=${templateId}`)} className="rounded-lg bg-[#eaf0ff] px-5 py-3 text-[14px] font-semibold text-[#344054]">
            ← Quay lại: Bước 2 - Thuộc tính
          </button>
          <div className="flex items-center gap-3">
            <button disabled={busy} onClick={() => void saveDraft()} className="rounded-lg px-4 py-3 text-[13px] font-semibold text-[#667085] disabled:opacity-60">
              <Icon name="bookmark_border" className="mr-1 align-middle text-[18px]" />
              Lưu nháp tiến trình
            </button>
            <button
              disabled={busy || rows.length === 0}
              onClick={() => void goNext()}
              className="rounded-lg bg-[#4f46e5] px-7 py-3 text-[15px] font-bold text-white shadow-[0_4px_12px_rgba(79,70,229,0.3)] disabled:opacity-60"
            >
              {busy ? "Đang lưu..." : "Tiếp tục: Bước 4 - Thiết lập Tồn kho Ban đầu"}
              <Icon name="arrow_forward" className="ml-2 align-middle text-[20px]" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
