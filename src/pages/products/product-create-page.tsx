import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { categoriesApi, type CategoryListResponse } from "@/api/categories";
import { productWizardApi, type TemplateRecord } from "@/api/product-wizard";
import { getAllImages, serializeImages } from "@/lib/image-utils";
import { CatalogHeader } from "@/pages/products/catalog-header";
import { Icon } from "@/pages/products/ui-icon";

const steps = [
  { number: 1, title: "Mẫu sản phẩm cha", subtitle: "product_templates & Lô Date" },
  { number: 2, title: "Thiết lập Thuộc tính", subtitle: "Attributes & Values Matrix" },
  { number: 3, title: "Sinh biến thể SKU", subtitle: "Tự động hóa Giá vốn / Bán lẻ" },
  { number: 4, title: "Số dư tồn ban đầu", subtitle: "inventory_balances & Kho" },
];

const units = ["Chai (Bottle)", "Cái (Piece)", "Hộp (Box)", "Đôi (Pair)", "Gói (Pack)", "Tuýp (Tube)", "Lọ (Jar)", "ml"];

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Không thể đọc tệp ảnh."));
    reader.readAsDataURL(file);
  });

export function ProductCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get("templateId") || "";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [keyword, setKeyword] = useState("");
  const [categories, setCategories] = useState<CategoryListResponse | null>(null);
  const [template, setTemplate] = useState<TemplateRecord | null>(null);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [unit, setUnit] = useState("Chai (Bottle)");
  const [manageExpiry, setManageExpiry] = useState(true);
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeAfterCreate, setActiveAfterCreate] = useState(true);
  const [industry, setIndustry] = useState<"FASHION" | "BEAUTY">("BEAUTY");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    categoriesApi
      .list()
      .then((result) => !cancelled && setCategories(result))
      .catch((err: Error) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!templateId) return;
    let cancelled = false;
    productWizardApi
      .getTemplate(templateId)
      .then((result) => {
        if (cancelled) return;
        setTemplate(result);
        setName(result.name);
        setCategoryId(result.categoryId || "");
        setUnit(result.unitOfMeasure || "Cái");
        setManageExpiry(Boolean(result.hasLotTracking));
        setDescription(result.description || "");
        const parsedImages = getAllImages(result.imageUrl);
        setImages(parsedImages);
        setActiveImageIndex(0);
      })
      .catch((err: Error) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [templateId]);

  const categoryOptions = useMemo(() => {
    if (!categories) return [];
    return categories.items.flatMap((root) => {
      const node = { id: root.id, label: root.name, level: 1 };
      if (!root.children.length) return [node];
      return [node, ...root.children.map((child) => ({ id: child.id, label: `${root.name} › ${child.name}`, level: 2 }))];
    });
  }, [categories]);

  const rootName = useMemo(() => {
    if (!categories || !categoryId) return "";
    const root = categories.items.find((item) => item.id === categoryId || item.children.some((child) => child.id === categoryId));
    return root?.name || "";
  }, [categories, categoryId]);

  useEffect(() => {
    if (!rootName) return;
    setIndustry(/mỹ phẩm|chăm sóc|trang điểm|nước hoa|chống nắng|sức khỏe/i.test(rootName) ? "BEAUTY" : "FASHION");
  }, [rootName]);

  const formPayload = () => ({
    name: name.trim(),
    categoryId: categoryId || null,
    unitOfMeasure: unit,
    hasLotTracking: manageExpiry,
    description: description.trim() || null,
    imageUrl: serializeImages(images),
  });

  const validate = () => {
    if (!name.trim()) return "Vui lòng nhập tên mẫu sản phẩm.";
    if (!categoryId) return "Vui lòng chọn danh mục sản phẩm.";
    return "";
  };

  const save = async (nextStep: boolean) => {
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const record = template
        ? await productWizardApi.updateTemplate(template.id, formPayload())
        : await productWizardApi.createTemplate({ ...formPayload(), isActive: false });
      setTemplate(record);
      sessionStorage.setItem("abc:wizard:industry:" + record.id, industry);
      if (nextStep) {
        navigate(`/products/new/attributes?templateId=${record.id}`);
        return;
      }
      setNotice("Đã lưu bản nháp mẫu sản phẩm. Bạn có thể tiếp tục bất cứ lúc nào.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onPickImages = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const validFiles: File[] = [];
    for (const file of files) {
      if (file.size > 2_000_000) {
        setError(`Tệp "${file.name}" vượt quá 2MB. Vui lòng chọn ảnh dung lượng nhỏ hơn.`);
        return;
      }
      validFiles.push(file);
    }
    try {
      const dataUrls = await Promise.all(validFiles.map(readFileAsDataUrl));
      setImages((current) => [...current, ...dataUrls]);
      setError("");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const removeImageAt = (index: number) => {
    setImages((current) => current.filter((_, i) => i !== index));
    if (activeImageIndex >= index && activeImageIndex > 0) {
      setActiveImageIndex((i) => i - 1);
    }
  };

  const setAsPrimary = (index: number) => {
    if (index === 0 || index >= images.length) return;
    setImages((current) => {
      const updated = [...current];
      const [item] = updated.splice(index, 1);
      updated.unshift(item);
      return updated;
    });
    setActiveImageIndex(0);
    setNotice("Đã đặt ảnh làm ảnh đại diện chính của sản phẩm.");
  };

  const currentActiveImage = images[activeImageIndex] || images[0] || "";

  return (
    <div className="min-h-screen bg-[#f5f6fa] text-[#101828] pb-24">
      <CatalogHeader active="products" keyword={keyword} onKeywordChange={setKeyword} />

      <main className="mx-auto max-w-[1560px] px-5 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-[17px] font-bold">Quy trình Khởi tạo Hàng hóa &amp; Biến thể SKU Matrix</h1>
          <span className="text-[12px] text-[#667085]">
            Tiến độ tổng thể: <b className="text-[#4f46e5]">25%</b>
          </span>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className={[
                "flex items-center gap-3 rounded-xl border px-3 py-2.5",
                step.number === 1 ? "border-[#d7d2ff] bg-[#f8f7ff]" : "border-transparent bg-[#eef3fb]",
              ].join(" ")}
            >
              <span
                className={[
                  "grid h-11 w-11 shrink-0 place-items-center rounded-lg text-[20px] font-bold",
                  step.number === 1 ? "bg-[#4f46e5] text-white" : "bg-[#deebff] text-[#667085]",
                ].join(" ")}
              >
                {step.number}
              </span>
              <div>
                <p className={["text-[15px] font-bold", step.number === 1 ? "text-[#4338ca]" : "text-[#475467]"].join(" ")}>
                  {step.title} {step.number === 1 && <span className="text-[12px]">●</span>}
                </p>
                <p className="text-[11.5px] text-[#98a2b3]">{step.subtitle}</p>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-[#fecdca] bg-[#fef3f2] px-4 py-2.5 text-[12.5px] text-[#b42318]">{error}</div>
        )}
        {notice && (
          <div className="mt-4 rounded-lg border border-[#abefc6] bg-[#ecfdf3] px-4 py-2.5 text-[12.5px] text-[#067647]">{notice}</div>
        )}

        <div className="mt-4 grid grid-cols-[minmax(280px,0.65fr)_minmax(0,1.35fr)] gap-7">
          <section className="rounded-2xl border border-[#e8eaf0] bg-white p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-[17px] font-bold">
                  <Icon name="photo_library" className="text-[22px] text-[#4f46e5]" />
                  Hình ảnh Mẫu cha
                </h2>
                <span className="text-[12px] font-semibold text-[#667085]">
                  {images.length} ảnh
                </span>
              </div>

              {/* Main Image View */}
              <div className="relative mt-4 h-[380px] overflow-hidden rounded-xl bg-gradient-to-b from-[#e7e9e4] to-[#9ea4a5]">
                {currentActiveImage ? (
                  <img alt="Ảnh mẫu sản phẩm" className="h-full w-full object-contain" src={currentActiveImage} />
                ) : (
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="text-center text-[#f8fafc]">
                      <Icon name="add_photo_alternate" className="text-[64px] opacity-80" />
                      <p className="mt-2 text-[12px] font-semibold">Chưa có ảnh sản phẩm</p>
                      <p className="mt-1 text-[10.5px] opacity-80">Hỗ trợ tải nhiều ảnh (PNG, JPG, WebP)</p>
                    </div>
                  </div>
                )}

                {images.length > 0 && (
                  <span
                    className={[
                      "absolute right-3 top-3 rounded-md px-2.5 py-1 text-[11px] font-semibold shadow-sm",
                      activeImageIndex === 0
                        ? "bg-[#12b76a] text-white"
                        : "bg-white/95 text-[#344054]",
                    ].join(" ")}
                  >
                    {activeImageIndex === 0 ? "★ Đại diện (Primary)" : `Ảnh chi tiết #${activeImageIndex + 1}`}
                  </span>
                )}

                <div className="absolute inset-x-3 bottom-3 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-9 flex-1 rounded-lg bg-white/95 text-[12px] font-semibold text-[#344054] shadow-sm hover:bg-white"
                  >
                    <Icon name="add_photo_alternate" className="mr-1 align-middle text-[16px] text-[#4f46e5]" />
                    Thêm ảnh
                  </button>
                  {images.length > 0 && activeImageIndex !== 0 && (
                    <button
                      type="button"
                      onClick={() => setAsPrimary(activeImageIndex)}
                      title="Đặt ảnh này làm ảnh đại diện chính"
                      className="h-9 px-3 rounded-lg bg-white/95 text-[12px] font-semibold text-[#4338ca] shadow-sm hover:bg-white"
                    >
                      <Icon name="star" className="mr-1 align-middle text-[16px] text-[#f59e0b]" />
                      Đặt làm đại diện
                    </button>
                  )}
                  {images.length > 0 && (
                    <button
                      type="button"
                      aria-label="Xóa ảnh này"
                      title="Xóa ảnh này"
                      onClick={() => removeImageAt(activeImageIndex)}
                      className="w-10 h-9 grid place-items-center rounded-lg bg-white/95 text-[#d92d20] shadow-sm hover:bg-[#fef3f2]"
                    >
                      <Icon name="delete" className="text-[17px]" />
                    </button>
                  )}
                </div>
              </div>

              {/* Gallery Thumbnails */}
              {images.length > 0 && (
                <div className="mt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#667085] mb-1.5">
                    Danh sách ảnh đã tải ({images.length})
                  </p>
                  <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto p-1 bg-[#f9fafb] rounded-lg border border-[#eaecf0]">
                    {images.map((img, idx) => (
                      <div
                        key={idx}
                        onClick={() => setActiveImageIndex(idx)}
                        className={[
                          "group relative h-14 w-14 cursor-pointer overflow-hidden rounded-lg border-2 transition-all bg-white",
                          activeImageIndex === idx ? "border-[#4f46e5] ring-2 ring-[#c7cbff]" : "border-[#e4e7ec] hover:border-[#b2ccff]",
                        ].join(" ")}
                      >
                        <img src={img} alt={`Thumb ${idx + 1}`} className="h-full w-full object-cover" />
                        {idx === 0 && (
                          <span className="absolute bottom-0 inset-x-0 bg-[#12b76a] text-white text-[8px] font-bold text-center leading-3">
                            Cover
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImageAt(idx);
                          }}
                          className="absolute top-0.5 right-0.5 hidden group-hover:grid h-4 w-4 place-items-center rounded-full bg-black/70 text-white text-[10px]"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-14 w-14 grid place-items-center rounded-lg border-2 border-dashed border-[#cfd2ff] bg-[#f8f9ff] text-[#4f46e5] hover:bg-[#eef0ff]"
                      title="Tải thêm ảnh"
                    >
                      <Icon name="add" className="text-[20px]" />
                    </button>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                type="file"
                multiple
                onChange={(event) => void onPickImages(event.target.files)}
              />
            </div>

            {/* Information & Guidance */}
            <div className="mt-4 space-y-2.5">
              <div className="rounded-lg bg-[#eef4ff] p-3 text-[11.5px] leading-[1.5] text-[#475467]">
                <div className="flex items-start gap-1.5 font-semibold text-[#3538cd] mb-1">
                  <Icon name="lightbulb" className="text-[16px] shrink-0 text-[#f59e0b]" />
                  <span>Ảnh sản phẩm cha vs. Ảnh biến thể SKU:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[#475467] text-[11px]">
                  <li><b>Mẫu cha:</b> Chứa ảnh đại diện chính và album tổng quan giới thiệu sản phẩm.</li>
                  <li><b>Biến thể riêng:</b> Nếu từng mẫu mã (theo Màu sắc, Phiên bản...) có ảnh riêng, bạn sẽ gán ảnh trực tiếp cho từng biến thể ở <b>Bước 3 (Sinh biến thể SKU)</b> sau khi tạo xong.</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#e8eaf0] bg-white p-7">
            <div className="flex items-start justify-between border-b border-[#eaecf0] pb-3">
              <h2 className="text-[20px] font-bold">
                Thông tin Mẫu Sản Phẩm Cha{" "}
                <span className={["ml-1 rounded px-1.5 py-0.5 text-[11px]", template?.isActive ? "bg-[#6ce7b7]" : "bg-[#eef0ff] text-[#4338ca]"].join(" ")}>
                  {template?.isActive ? "ACTIVE" : "BẢN NHÁP"}
                </span>
              </h2>
              <span className="text-[12px] text-[#667085]">
                ID Mẫu:{" "}
                <b className="rounded bg-[#eef0ff] px-1.5 py-1 font-mono text-[#4338ca]">{template?.code || "Tự động cấp"}</b>
              </span>
            </div>

            <label className="mt-4 block text-[12px] font-semibold">
              Phân loại Ngành Hàng <span className="text-[#d92d20]">*</span>
            </label>
            <div className="mt-2 grid grid-cols-2 overflow-hidden rounded-lg bg-[#eef0ff] p-1">
              <button
                type="button"
                onClick={() => setIndustry("FASHION")}
                className={["rounded-md py-3 text-[14px] font-bold", industry === "FASHION" ? "bg-white text-[#4338ca] shadow-sm" : "text-[#667085]"].join(" ")}
              >
                <Icon name="checkroom" className="mr-2 align-middle text-[19px]" />
                Thời trang &amp; May mặc
              </button>
              <button
                type="button"
                onClick={() => setIndustry("BEAUTY")}
                className={["rounded-md py-3 text-[14px] font-bold", industry === "BEAUTY" ? "bg-white text-[#4338ca] shadow-sm" : "text-[#667085]"].join(" ")}
              >
                <Icon name="health_and_safety" className="mr-2 align-middle text-[19px]" />
                Mỹ phẩm &amp; Làm đẹp
              </button>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <label htmlFor="product-name" className="text-[12px] font-semibold">
                Tên Mẫu Sản Phẩm Đại Diện <span className="text-[#d92d20]">*</span>
              </label>
              <span className="text-[11px] text-[#667085]">{name.length} / 255 ký tự</span>
            </div>
            <input
              id="product-name"
              value={name}
              maxLength={255}
              placeholder="Ví dụ: Serum Dưỡng Ẩm Phục Hồi Da B5"
              onChange={(event) => setName(event.target.value)}
              className="mt-2 h-12 w-full rounded-lg border-0 bg-[#eef3ff] px-3 text-[15px] outline-none focus:ring-2 focus:ring-[#c7cbff]"
            />

            <div className="mt-4 grid grid-cols-[1.25fr_0.85fr] gap-3">
              <label className="text-[12px] font-semibold">
                Danh Mục Sản Phẩm <span className="text-[#d92d20]">*</span>
                <span className="float-right text-[#4338ca]">＋ Thêm nhanh</span>
                <select
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  className="mt-2 h-12 w-full rounded-lg border-0 bg-[#eef3ff] px-3 text-[13px] font-normal outline-none"
                >
                  <option value="">Chọn danh mục sản phẩm</option>
                  {categoryOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-[12px] font-semibold">
                Đơn Vị Tính Cơ Sở (UoM) <span className="text-[#d92d20]">*</span>
                <select
                  value={unit}
                  onChange={(event) => setUnit(event.target.value)}
                  className="mt-2 h-12 w-full rounded-lg border-0 bg-[#eef3ff] px-3 text-[13px] font-normal outline-none"
                >
                  {units.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
                <span className="mt-1 block text-[10.5px] font-normal text-[#98a2b3]">Đơn vị chuẩn nhỏ nhất dùng tính định lượng tồn kho.</span>
              </label>
            </div>

            <div className="mt-5 rounded-xl bg-[#eef4ff] p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#dff2ef] text-[#067647]">
                  <Icon name="verified_user" className="text-[22px]" />
                </span>
                <div className="flex-1">
                  <h3 className="text-[16px] font-bold">Quản Lý &amp; Theo Dõi Lô Hạn Dùng</h3>
                  <p className="mt-1 text-[12px] leading-[1.4] text-[#667085]">
                    <b>Quy chuẩn FEFO (First Expired, First Out):</b> Kích hoạt cờ này khi sản phẩm là mỹ phẩm, thực phẩm hoặc hóa phẩm có ngày hết hạn.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setManageExpiry((value) => !value)}
                  className={["relative h-8 w-16 rounded-full p-1 transition-colors", manageExpiry ? "bg-[#087f5b]" : "bg-[#98a2b3]"].join(" ")}
                  aria-label="Quản lý hạn dùng"
                >
                  <span className={["block h-6 w-6 rounded-full bg-white transition-transform", manageExpiry ? "translate-x-8" : ""].join(" ")} />
                </button>
              </div>
            </div>

            <label className="mt-5 block text-[12px] font-semibold">Mô Tả Tóm Tắt Dòng Sản Phẩm</label>
            <textarea
              value={description}
              maxLength={1000}
              placeholder="Mô tả công dụng, thành phần hoặc đặc điểm nổi bật của dòng sản phẩm..."
              onChange={(event) => setDescription(event.target.value)}
              className="mt-2 h-24 w-full resize-none rounded-lg border-0 bg-[#eef3ff] px-3 py-3 text-[13px] outline-none focus:ring-2 focus:ring-[#c7cbff]"
            />

            <div className="mt-4 flex items-center gap-3 rounded-lg bg-[#eef4ff] px-3 py-3">
              <Icon name="toggle_on" className="text-[23px] text-[#4338ca]" />
              <div className="flex-1">
                <b className="text-[14px]">Kích hoạt kinh doanh ngay sau khi tạo</b>
                <p className="text-[11px] text-[#667085]">Sản phẩm chỉ được publish sau khi hoàn tất bước 4.</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveAfterCreate((value) => !value)}
                className={["relative h-7 w-14 rounded-full p-1", activeAfterCreate ? "bg-[#4338ca]" : "bg-[#98a2b3]"].join(" ")}
                aria-label="Kích hoạt kinh doanh"
              >
                <span className={["block h-5 w-5 rounded-full bg-white", activeAfterCreate ? "translate-x-7" : ""].join(" ")} />
              </button>
            </div>
          </section>
        </div>
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-[#eaecf0] bg-white px-5 py-3">
        <div className="mx-auto flex max-w-[1560px] items-center gap-2">
          <button type="button" onClick={() => navigate("/products")} className="h-12 rounded-lg bg-[#eaf0ff] px-5 text-[14px] font-semibold text-[#344054]">
            Hủy &amp; Quay lại
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save(false)}
            className="h-12 rounded-lg bg-[#eef3ff] px-5 text-[14px] font-semibold text-[#344054] disabled:opacity-60"
          >
            <Icon name="save" className="mr-2 align-middle text-[17px]" />
            Lưu bản nháp
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save(true)}
            className="h-12 rounded-lg bg-[#4f46e5] px-8 text-[15px] font-bold text-white shadow-[0_4px_12px_rgba(79,70,229,0.3)] disabled:opacity-60"
          >
            {busy ? "Đang lưu..." : "Tiếp tục: Bước 2 - Thiết lập thuộc tính"}
            <Icon name="arrow_forward" className="ml-2 align-middle text-[20px]" />
          </button>
        </div>
      </footer>
    </div>
  );
}
