import { useEffect, useRef, useState } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, CircleDollarSign, Search } from "lucide-react";

import {
  calculateProfitSimulation, getSimulationBasis, searchSimulationVariants,
  type SimulationBasis, type SimulationInputs, type SimulationResult, type SimulationVariant,
} from "@/api/profit-simulation";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";
import { FilterField, displayDate } from "@/pages/business-data/shared";
import { ErrorBox, useLoad } from "@/pages/purchases/shared";
import { dayOffset, posMoney } from "./pos-format";
import "@/pages/purchases/purchases.css";
import "@/pages/business-data/business-data.css";
import "./profit-simulation.css";

type Horizon = 7 | 14 | 28;
type Draft = Omit<SimulationInputs, "operatingExpense"> & { operatingExpense: string };
type FieldName = keyof Draft;
const fields: { key: FieldName; label: string; max: string; limit: bigint; optional?: boolean }[] = [
  { key: "quantity", label: "Số lượng bán giả định", max: "1.000.000", limit: 1000000n },
  { key: "price", label: "Giá bán/đơn vị (đ)", max: "10.000.000.000", limit: 10000000000n },
  { key: "discountPercent", label: "Giảm giá (%)", max: "100", limit: 100n },
  { key: "unitCost", label: "Giá vốn/đơn vị (đ)", max: "10.000.000.000", limit: 10000000000n },
  { key: "operatingExpense", label: "Chi phí vận hành cả kỳ (đ)", max: "1.000.000.000.000", limit: 1000000000000n, optional: true },
];

function validateDraft(draft: Draft, title: string) {
  for (const field of fields) {
    const value = draft[field.key];
    if (field.optional && value === "") continue;
    if (!/^\d{1,13}(?:\.\d{1,2})?$/.test(value)) return `${title}: ${field.label} phải là số không âm, tối đa 2 chữ số thập phân.`;
    const [whole, fraction = ""] = value.split(".");
    if (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0")) > field.limit * 100n) return `${title}: ${field.label} không được vượt ${field.max}.`;
  }
  return "";
}

function formatQuantity(value: string) {
  const [whole, fraction = ""] = value.split(".");
  const decimal = fraction.replace(/0+$/, "");
  return `${BigInt(whole).toLocaleString("vi-VN")}${decimal ? `,${decimal}` : ""}`;
}

function ScenarioFields({ title, value, onChange }: { title: string; value: Draft; onChange: (field: FieldName, value: string) => void }) {
  return <section className="ps-card"><h3>{title}</h3>
    <p>{title === "Kịch bản cơ sở" ? "Tình huống bạn muốn dùng làm mốc so sánh." : "Thử thay đổi các con số và so sánh với cơ sở."}</p>
    <div className="ps-fields">{fields.map((field) => <FilterField key={field.key} label={`${field.label}${field.optional ? " — không bắt buộc" : ""}`}>
      <input type="text" inputMode="decimal" required={!field.optional} maxLength={16} placeholder={field.optional ? "Chưa có giả định" : "Ví dụ: 100.00"}
        aria-label={`${title}: ${field.label}`} value={value[field.key]} onChange={(event) => onChange(field.key, event.target.value)} />
      {field.key === "operatingExpense" && <small>Để trống nếu chưa biết chi phí của kỳ này.</small>}
      {(field.key === "price" || field.key === "unitCost" || field.key === "operatingExpense") && /^\d{1,13}(?:\.\d{1,2})?$/.test(value[field.key]) && (() => {
        const [whole, fraction = ""] = value[field.key].split(".");
        return <small>Đang nhập: {posMoney(`${whole}.${fraction.padEnd(2, "0")}`)}</small>;
      })()}
    </FilterField>)}</div>
  </section>;
}

function ResultTable({ result }: { result: SimulationResult }) {
  const difference = result.changes.grossProfit.difference;
  const amount = BigInt(difference.replace(".", ""));
  const positive = amount > 0n;
  const negative = amount < 0n;
  const direction = positive ? "tăng" : negative ? "giảm" : "không đổi";
  const absolute = negative ? difference.slice(1) : difference;
  const scenarioLoss = BigInt(result.scenario.grossProfit.replace(".", "")) < 0n;
  const Trend = positive ? ArrowUpRight : negative ? ArrowDownRight : ArrowRight;
  const rows = [
    { label: "Tiền hàng", key: "grossSales" },
    { label: "Giảm giá", key: "discountAmount" },
    { label: "Doanh thu sau giảm giá", key: "revenue" },
    { label: "Giá vốn", key: "cogs" },
    { label: "Lợi nhuận gộp", key: "grossProfit" },
    { label: "Sau chi phí giả định", key: "afterExpense" },
  ] as const;
  return <section className="ps-section ps-results" aria-live="polite"><div className="ps-section-heading"><div><span className="ps-kicker">KẾT QUẢ GIẢ ĐỊNH</span><h2>Kết quả mô phỏng</h2>
    <p>{result.variant.name} · {result.variant.sku} · {displayDate(result.period.start)} – {displayDate(result.period.end)} ({result.period.days} ngày)</p></div></div>
    <div className={`ps-result-highlight ${scenarioLoss ? "loss" : positive ? "increase" : negative ? "decrease" : "unchanged"}`}>
      <div className="ps-result-icon"><Trend size={21} aria-hidden="true" /></div>
      <div><span>So với kịch bản cơ sở</span><h3>Lợi nhuận gộp {direction}{amount !== 0n && ` ${posMoney(absolute)}`}</h3>
        <p>Với các con số đã nhập, kịch bản thay đổi {scenarioLoss ? `ước tính lỗ gộp ${posMoney(result.scenario.grossProfit.slice(1))}` : `có lợi nhuận gộp ${posMoney(result.scenario.grossProfit)}`}. Đây không phải lợi nhuận thực tế.</p>
      </div>
    </div>
    <div className="ps-result-cards">
      <div><span>Doanh thu sau giảm giá</span><strong>{posMoney(result.scenario.revenue)}</strong><small>Kịch bản thay đổi</small></div>
      <div><span>Lợi nhuận gộp cơ sở</span><strong>{posMoney(result.baseline.grossProfit)}</strong><small>Trước chi phí vận hành</small></div>
      <div><span>Sau chi phí giả định</span><strong>{result.scenario.afterExpense === null ? "Chưa tính" : posMoney(result.scenario.afterExpense)}</strong><small>{result.scenario.afterExpense === null ? "Chưa nhập chi phí kỳ này" : "Không phải lợi nhuận ròng"}</small></div>
    </div>
    <details className="ps-details"><summary>Xem bảng so sánh và cách tính</summary>
    <div className="bd-table-wrap"><table className="bd-table">
      <thead><tr><th>Chỉ số</th><th>Cơ sở</th><th>Kịch bản thay đổi</th><th>Chênh lệch</th></tr></thead>
      <tbody>{rows.map(({ label, key }) => {
        const base = result.baseline[key];
        const alternative = result.scenario[key];
        const change = key === "revenue" || key === "cogs" || key === "grossProfit" || key === "afterExpense" ? result.changes[key] : null;
        return <tr key={key}><td>{label}</td><td>{base === null ? "Chưa có giả định" : posMoney(base)}</td>
          <td>{alternative === null ? "Chưa có giả định" : posMoney(alternative)}</td>
          <td>{change ? `${posMoney(change.difference)} (${change.percent === null ? "không có tỷ lệ so sánh" : `${change.percent}%`})` : "—"}</td></tr>;
      })}</tbody>
    </table></div>
    <p>Doanh thu sau giảm giá = tiền hàng − giảm giá. Lợi nhuận gộp = doanh thu sau giảm giá − giá vốn. Không bao gồm trả hàng, thuế và các chi phí chưa nhập. “Sau chi phí giả định” không phải lợi nhuận ròng.</p></details>
    <p className="ps-caveat">Kết quả phụ thuộc vào giả định; giá thay đổi không tự làm thay đổi lượng bán.</p>
  </section>;
}

function SimulationForm({ basis }: { basis: SimulationBasis }) {
  const initial: Draft = { quantity: "", price: basis.variant.basePrice, unitCost: basis.variant.costPrice, discountPercent: "0", operatingExpense: "" };
  const [baseline, setBaseline] = useState(initial);
  const [scenario, setScenario] = useState(initial);
  const [days, setDays] = useState<Horizon>(7);
  const [confirmed, setConfirmed] = useState(false);
  const [quantitySource, setQuantitySource] = useState("Nhập thủ công");
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [result]);
  const start = dayOffset(basis.today, 1);
  const end = dayOffset(start, days - 1);
  const forecastQuantity = basis.forecast.status === "READY"
    ? days === 7 ? basis.forecast.totals.d7 : days === 14 ? basis.forecast.totals.d14 : basis.forecast.totals.d28
    : null;
  const forecastTooLarge = forecastQuantity !== null && BigInt(forecastQuantity.replace(".", "")) > 100000000n;
  const change = (side: "baseline" | "scenario", field: FieldName, value: string) => {
    if (side === "baseline") {
      setBaseline((previous) => ({ ...previous, [field]: value }));
      if (field === "quantity") setQuantitySource("Nhập thủ công hoặc đã chỉnh sửa");
    } else setScenario((previous) => ({ ...previous, [field]: value }));
    setConfirmed(false); setResult(null); setError("");
  };
  const toInputs = (draft: Draft): SimulationInputs => ({ ...draft, operatingExpense: draft.operatingExpense === "" ? null : draft.operatingExpense });
  return <div className="ps-workspace">
    {result && <div ref={resultRef}><ResultTable result={result} /></div>}
    {basis.variant.sku.startsWith("DEMO-") && <div className="bd-notice warning">SKU demo dùng dữ liệu giả lập, không phản ánh cửa hàng thực tế.</div>}
    {basis.variant.isActive !== true && <div className="bd-notice warning">SKU hiện không được đánh dấu đang hoạt động. Kiểm tra trước khi sử dụng giả định.</div>}
    <section className="ps-section"><div><span className="ps-kicker">BƯỚC 2 · CHỌN KỲ VÀ SỐ LƯỢNG</span><h2>{basis.variant.name} · {basis.variant.sku}</h2></div>
      <p>Giá tham khảo hiện tại: bán {posMoney(basis.variant.basePrice)} · giá vốn {posMoney(basis.variant.costPrice)}. Hãy kiểm tra trước khi tính; giá vốn 0 có thể do chưa cấu hình.</p>
      <FilterField label="Kỳ mô phỏng"><select value={days} disabled={busy} onChange={(event) => {
        const value = Number(event.target.value);
        if (value !== 7 && value !== 14 && value !== 28) throw new Error("Kỳ mô phỏng không hợp lệ.");
        setDays(value); setBaseline((previous) => ({ ...previous, quantity: "" })); setScenario((previous) => ({ ...previous, quantity: "" }));
        setQuantitySource("Nhập thủ công"); setConfirmed(false); setResult(null); setError("");
      }}><option value={7}>7 ngày</option><option value={14}>14 ngày</option><option value={28}>28 ngày</option></select></FilterField>
      <p>Kỳ từ {displayDate(start)} đến {displayDate(end)}; bắt đầu ngày mai theo giờ Việt Nam. Khi đổi kỳ cần kiểm tra và nhập lại số lượng.</p>
      {basis.forecast.status === "READY" ? <>
        <p>Hệ thống ước tính bán <strong>{forecastQuantity === null ? "—" : formatQuantity(forecastQuantity)} đơn vị</strong> trong {days} ngày. Bạn có thể dùng số này hoặc tự nhập.</p>
        {basis.forecast.datasetKind === "synthetic" && <div className="bd-notice warning">Mô hình dùng dữ liệu giả lập; chưa chứng minh độ chính xác cho cửa hàng thực tế.</div>}
        <p>Dự báo là số bán kỳ vọng trước trả hàng, không đảm bảo đủ hàng hoặc bán được. Thay đổi giá không tự thay đổi số lượng bán.</p>
        {forecastTooLarge && <div className="bd-notice warning">Dự báo vượt giới hạn số lượng mô phỏng; hãy nhập số lượng thủ công.</div>}
        <Button type="button" variant="outline" disabled={busy || forecastTooLarge} onClick={() => {
          if (forecastQuantity === null) return;
          setBaseline((previous) => ({ ...previous, quantity: forecastQuantity }));
          setQuantitySource(`Dự báo ${days} ngày, làm tròn 2 chữ số thập phân`); setConfirmed(false); setResult(null); setError("");
        }}>Dùng dự báo cho cơ sở</Button>
        <details className="ps-details"><summary>Thông tin dự báo và giá tham khảo</summary><p>Dữ liệu bán đến hết {displayDate(basis.forecast.dataAsOf)}; phân tích hoàn tất {new Date(basis.forecast.finishedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}. Phương pháp: {basis.forecast.model ?? "không rõ"}; phiên bản: {basis.forecast.modelVersion ?? "không rõ"}. Giá tham khảo tải lúc {new Date(basis.asOf).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}.</p></details>
      </> : <div className="bd-notice warning">{basis.forecast.reason} Bạn vẫn có thể nhập số lượng thủ công.</div>}
      <p>Nguồn số lượng cơ sở: {quantitySource}.</p>
    </section>
    <form className="ps-section" onSubmit={(event) => {
      event.preventDefault();
      if (!confirmed || busy) return;
      const validationError = validateDraft(baseline, "Kịch bản cơ sở") || validateDraft(scenario, "Kịch bản thay đổi");
      if (validationError) { setError(validationError); setResult(null); return; }
      setBusy(true); setError(""); setResult(null);
      calculateProfitSimulation({ variantId: basis.variant.id, days, start, baseline: toInputs(baseline), scenario: toInputs(scenario) })
        .then(setResult).catch((err: unknown) => setError(err instanceof Error ? err.message : "Không thể tính mô phỏng."))
        .finally(() => setBusy(false));
    }}>
      <div><span className="ps-kicker">BƯỚC 3 · NHẬP GIẢ ĐỊNH</span><h2>So sánh hai kịch bản</h2>
        <p>Điền cơ sở, sao chép sang kịch bản thay đổi rồi sửa những gì bạn muốn thử. Nhập số không có dấu phân cách hàng nghìn; dùng dấu chấm cho phần thập phân.</p></div>
      <fieldset disabled={busy} className="ps-form">
        <div className="ps-columns">
          <ScenarioFields title="Kịch bản cơ sở" value={baseline} onChange={(field, value) => change("baseline", field, value)} />
          <ScenarioFields title="Kịch bản thay đổi" value={scenario} onChange={(field, value) => change("scenario", field, value)} />
        </div>
        <Button type="button" variant="outline" onClick={() => { setScenario({ ...baseline }); setConfirmed(false); setResult(null); setError(""); }}>Sao chép cơ sở sang kịch bản thay đổi</Button>
        <label className="ps-confirm"><input type="checkbox" required checked={confirmed} onChange={(event) => { setConfirmed(event.target.checked); setResult(null); }} />
          Tôi đã kiểm tra giá bán, giá vốn và các giả định cho SKU và kỳ đã chọn.</label>
        <Button type="submit">{busy ? "Đang tính…" : "Tính mô phỏng"}</Button>
      </fieldset>
      <ErrorBox error={error} />
    </form>
    <p className="ps-caveat">Chỉ là phép thử: không cập nhật giá, tồn kho hay đơn hàng. Kịch bản sẽ mất khi tải lại trang.</p>
  </div>;
}

function SelectedVariant({ id }: { id: string }) {
  const result = useLoad(() => getSimulationBasis(id), [id]);
  return <>
    {result.loading && <div role="status" className="bd-notice">Đang tải thông tin SKU…</div>}
    <ErrorBox error={result.error} />
    {result.error && <Button type="button" variant="outline" onClick={result.reload}>Thử lại</Button>}
    {result.data && <SimulationForm key={`${id}-${result.data.asOf}`} basis={result.data} />}
  </>;
}

function SimulationWorkspace() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SimulationVariant | null>(null);
  const [pickerOpen, setPickerOpen] = useState(true);
  const [page, setPage] = useState(1);
  const result = useLoad(() => searchSimulationVariants(search, page), [search, page]);
  return <main className="bd-page">
    <header className="bd-hero-copy"><span className="bd-eyebrow"><CircleDollarSign size={15} /> KỊCH BẢN GIẢ ĐỊNH</span>
      <h1>Mô phỏng lợi nhuận</h1><p>Thử thay đổi lượng bán, giá và chi phí để so sánh hai kịch bản cho một SKU.</p>
    </header>
    <section className="bd-data-workspace ps-section"><div className="ps-picker-header"><div><span className="ps-kicker">BƯỚC 1 · CHỌN SẢN PHẨM</span><h2>Chọn SKU</h2>
      <p>{selected ? <>Đang mô phỏng: <strong>{selected.name} · {selected.sku}</strong></> : "Chọn một mã hàng để bắt đầu mô phỏng."}</p></div>
      {selected && <Button type="button" variant="outline" aria-expanded={pickerOpen} onClick={() => setPickerOpen(!pickerOpen)}>{pickerOpen ? "Thu gọn" : "Đổi SKU"}</Button>}</div>
      {pickerOpen && <><form className="bd-filters" onSubmit={(event) => { event.preventDefault(); if (search === searchInput.trim() && page === 1) result.reload(); else { setPage(1); setSearch(searchInput.trim()); } }}>
        <label className="bd-search"><Search size={17} /><input aria-label="Tìm sản phẩm hoặc SKU" maxLength={100} placeholder="Tìm sản phẩm hoặc SKU…" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} /></label>
        <Button type="submit" variant="outline">Tìm</Button>
      </form>
      {result.loading && <div role="status">Đang tìm SKU…</div>}
      <ErrorBox error={result.error} />
      {result.error && <Button type="button" variant="outline" onClick={result.reload}>Thử lại</Button>}
      {result.data && <>
        {result.data.items.length === 0 ? <p>Không tìm thấy SKU phù hợp.</p> : <div className="ps-picker">{result.data.items.map((item) =>
          <button type="button" className={`ps-pick${selected?.id === item.id ? " selected" : ""}`} key={item.id} onClick={() => { setSelected(item); setPickerOpen(false); }}>
            <span><strong>{item.name}</strong><small>{item.sku}{item.isActive !== true ? " · Không hoạt động" : ""}</small></span><b>{selected?.id === item.id ? "Đã chọn" : "Chọn"}</b>
          </button>)}</div>}
        <nav className="ps-picker-pagination" aria-label="Phân trang SKU">
          <span>Trang {result.data.page}</span>
          <div><Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Trước</Button>
            <Button type="button" size="sm" variant="outline" disabled={!result.data.hasMore} onClick={() => setPage((value) => value + 1)}>Tiếp</Button></div>
        </nav>
      </>}
      {selected && <p>Chọn SKU khác sẽ bắt đầu lại giả định và kết quả mô phỏng.</p>}</>}
    </section>
    {selected && <SelectedVariant key={selected.id} id={selected.id} />}
  </main>;
}

export function ProfitSimulationPage() {
  const { can } = usePermissions();
  return <AppLayout>{can("analytics.read") && can("finance.read")
    ? <SimulationWorkspace />
    : <main className="bd-page"><div role="alert" className="bd-notice warning">Bạn cần quyền xem phân tích và tài chính để mô phỏng lợi nhuận.</div></main>}
  </AppLayout>;
}
