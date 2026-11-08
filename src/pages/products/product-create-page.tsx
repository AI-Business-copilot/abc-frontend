import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { categoriesApi, type CategoryListResponse } from "@/api/categories";
import { productWizardApi, type TemplateRecord } from "@/api/product-wizard";
import { getAllImages, serializeImages, uploadImageToStorage } from "@/lib/image-utils";
import { CatalogHeader } from "@/pages/products/catalog-header";
import { Icon } from "@/pages/products/ui-icon";

const steps = [
  { number: 1, title: "Mẫu sản phẩm cha", subtitle: "product_templates & Lô Date" },
  { number: 2, title: "Thiết lập Thuộc tính", subtitle: "Attributes & Values Matrix" },
  { number: 3, title: "Sinh biến thể SKU", subtitle: "Tự động hóa Giá vốn / Bán lẻ" },
  { number: 4, title: "Số dư tồn ban đầu", subtitle: "inventory_balances & Kho" },
];

const units = ["Chai (Bottle)", "Cái (Piece)", "Hộp (Box)", "Đôi (Pair)", "Gói (Pack)", "Tuýp (Tube)", "Lọ (Jar)", "ml"];

type FormDraft = {
  code?: string;
  name: string;
  categoryId: string;
  unit: string;
  manageExpiry: boolean;
  description: string;
  images: string[];
  activeAfterCreate: boolean;
  industry: "FASHION" | "BEAUTY";
};

const getDraftKey = (tId: string) => (tId ? `abc:wizard:draft:${tId}` : "abc:wizard:draft:new");

export function ProductCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get("templateId") || "";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const draftKey = getDraftKey(templateId);

  // Đọc bản nháp đã lưu tạm từ sessionStorage nếu có (tránh mất thông tin khi reload)
  const initialDraft = useMemo((): Partial<FormDraft> => {
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  }, [draftKey]);

  const [keyword, setKeyword] = useState("");
  const [categories, setCategories] = useState<CategoryListResponse | null>(null);
  const [template, setTemplate] = useState<TemplateRecord | null>(null);
  const [customCode, setCustomCode] = useState(initialDraft.code || "");
  const [name, setName] = useState(initialDraft.name || "");
  const [categoryId, setCategoryId] = useState(initialDraft.categoryId || "");
  const [unit, setUnit] = useState(initialDraft.unit || "Chai (Bottle)");
  const [manageExpiry, setManageExpiry] = useState(initialDraft.manageExpiry ?? true);
  const [description, setDescription] = useState(initialDraft.description || "");
  const [images, setImages] = useState<string[]>(initialDraft.images || []);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showQuickCat, setShowQuickCat] = useState(false);
  const [quickCatName, setQuickCatName] = useState("");
  const [quickCatParentId, setQuickCatParentId] = useState("");
  const [quickCatBusy, setQuickCatBusy] = useState(false);
  const [activeAfterCreate, setActiveAfterCreate] = useState(initialDraft.activeAfterCreate ?? true);
  const [industry, setIndustry] = useState<"FASHION" | "BEAUTY">(initialDraft.industry || "BEAUTY");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Tự động lưu bản nháp vào sessionStorage mỗi khi thông tin thay đổi
  useEffect(() => {
    const draft: FormDraft = {
      code: customCode,
      name,
      categoryId,
      unit,
      manageExpiry,
      description,
      images,
      activeAfterCreate,
      industry,
    };
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {}
  }, [draftKey, customCode, name, categoryId, unit, manageExpiry, description, images, activeAfterCreate, industry]);

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

  // Khi có templateId (quay lại từ Bước 2 hoặc sửa mẫu cha): khôi phục thông tin đầy đủ
  useEffect(() => {
    if (!templateId) return;
    let cancelled = false;
    productWizardApi
      .getTemplate(templateId)
      .then((result) => {
        if (cancelled) return;
        setTemplate(result);

        // Khôi phục bản nháp sessionStorage nếu có sửa đổi trước đó
        const savedDraft = sessionStorage.getItem(`abc:wizard:draft:${templateId}`);
        if (savedDraft) {
          try {
            const parsed = JSON.parse(savedDraft);
            setCustomCode(parsed.code ?? (result.code || ""));
            setName(parsed.name ?? result.name);
            setCategoryId(parsed.categoryId ?? (result.categoryId || ""));
            setUnit(parsed.unit ?? (result.unitOfMeasure || "Cái"));
            setManageExpiry(parsed.manageExpiry ?? Boolean(result.hasLotTracking));
            setDescription(parsed.description ?? (result.description || ""));
            setImages(parsed.images && parsed.images.length > 0 ? parsed.images : getAllImages(result.imageUrl));
            if (parsed.industry) setIndustry(parsed.industry);
            return;
          } catch {}
        }

        // Nếu chưa có nháp, nạp dữ liệu chuẩn từ database
        setCustomCode(result.code || "");
        setName(result.name);
        setCategoryId(result.categoryId || "");
        setUnit(result.unitOfMeasure || "Cái");
        setManageExpiry(Boolean(result.hasLotTracking));
        setDescription(result.description || "");
        const parsedImages = getAllImages(result.imageUrl);
        setImages(parsedImages);

        // Khôi phục ngành hàng đã lưu
        const storedIndustry = sessionStorage.getItem("abc:wizard:industry:" + templateId);
        if (storedIndustry === "FASHION" || storedIndustry === "BEAUTY") {
          setIndustry(storedIndustry);
        }
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

  // Chuyển đổi ngành hàng: Thời trang -> tắt quản lý lô, Mỹ phẩm -> bật quản lý lô
  const selectIndustry = (type: "FASHION" | "BEAUTY") => {
    setIndustry(type);
    if (type === "FASHION") {
      setManageExpiry(false);
    } else {
      setManageExpiry(true);
    }
  };

  const handleCategoryChange = (newCatId: string) => {
    setCategoryId(newCatId);
    if (!newCatId || !categories) return;
    const cat = categories.items.find(
      (item) => item.id === newCatId || item.children.some((child) => child.id === newCatId),
    );
    const catName = cat?.name || "";
    if (/mỹ phẩm|chăm sóc|trang điểm|nước hoa|chống nắng|sức khỏe/i.test(catName)) {
      selectIndustry("BEAUTY");
    } else if (/thời trang|may mặc|quần|áo|váy|đầm|giày|dép|túi/i.test(catName)) {
      selectIndustry("FASHION");
    }
  };

  const formPayload = () => ({
    code: customCode.trim() ? customCode.trim().toUpperCase() : null,
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

  const resetAllProgress = () => {
    sessionStorage.removeItem("abc:wizard:draft:new");
    if (templateId) {
      sessionStorage.removeItem(`abc:wizard:draft:${templateId}`);
      sessionStorage.removeItem(`abc:wizard:industry:${templateId}`);
      sessionStorage.removeItem(`abc:wizard:selections:${templateId}`);
      sessionStorage.removeItem(`abc:wizard:active_variants:${templateId}`);
      sessionStorage.removeItem(`abc:wizard:prefix:${templateId}`);
    }
    sessionStorage.removeItem("abc:wizard:active_template_id");
    sessionStorage.removeItem("abc:wizard:active_template_name");
    setCustomCode("");
    setName("");
    setCategoryId("");
    setDescription("");
    setImages([]);
    setTemplate(null);
    setNotice("Đã làm mới form và xóa toàn bộ bản nháp dở dang.");
    navigate("/products/new", { replace: true });
  };

  const handleCreateQuickCategory = async () => {
    const trimmed = quickCatName.trim();
    if (!trimmed) {
      setError("Vui lòng nhập tên danh mục.");
      return;
    }
    setQuickCatBusy(true);
    setError("");
    try {
      const created = await productWizardApi.createCategory({
        name: trimmed,
        parentId: quickCatParentId || null,
      });
      const updatedCats = await categoriesApi.list();
      setCategories(updatedCats);
      setCategoryId(created.id);
      setShowQuickCat(false);
      setQuickCatName("");
      setQuickCatParentId("");
      setNotice(`Đã tạo danh mục “${created.name}” và tự động chọn.`);
    } catch (err: any) {
      setError(err?.message || "Không tạo được danh mục.");
    } finally {
      setQuickCatBusy(false);
    }
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
      const targetId = template?.id || templateId;
      const record = targetId
        ? await productWizardApi.updateTemplate(targetId, formPayload())
        : await productWizardApi.createTemplate({ ...formPayload(), isActive: false });
      if (!templateId && record?.id) {
        window.history.replaceState(null, "", `/products/new?templateId=${record.id}`);
      }
      setTemplate(record);
      sessionStorage.setItem("abc:wizard:industry:" + record.id, industry);
      sessionStorage.setItem(`abc:wizard:draft:${record.id}`, JSON.stringify({
        code: record.code || customCode,
        name: name.trim(),
        categoryId,
        unit,
        manageExpiry,
        description,
        images,
        activeAfterCreate,
        industry,
      }));
      if (!templateId) {
        sessionStorage.removeItem("abc:wizard:draft:new");
      }
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
      const uploadedUrls = await Promise.all(validFiles.map(uploadImageToStorage));
      setImages((current) => [...current, ...uploadedUrls]);
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
          <div>
            <h1 className="text-[17px] font-bold">Quy trình Khởi tạo Hàng hóa &amp; Biến thể SKU Matrix</h1>
            <p className="text-[11.5px] text-[#667085]">Bước 1: Thiết lập thông tin Mẫu Sản Phẩm Cha</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={resetAllProgress}
              className="flex items-center gap-1.5 rounded-lg border border-[#e4e7ec] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#667085] hover:bg-[#fef3f2] hover:text-[#d92d20] shadow-sm transition-colors"
              title="Xóa bản nháp và làm mới toàn bộ form Bước 1"
            >
              <Icon name="restart_alt" className="text-[16px]" />
              Bỏ lưu tiến trình Bước 1
            </button>
            <span className="text-[12px] text-[#667085]">
              Tiến độ: <b className="text-[#0f4c3a]">25%</b>
            </span>
          </div>
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
                  step.number === 1 ? "bg-[#0f4c3a] text-white" : "bg-[#e2f6ed] text-[#667085]",
                ].join(" ")}
              >
                {step.number}
              </span>
              <div>
                <p className={["text-[15px] font-bold", step.number === 1 ? "text-[#0a3528]" : "text-[#475467]"].join(" ")}>
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
                  <Icon name="photo_library" className="text-[22px] text-[#0f4c3a]" />
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
                    <Icon name="add_photo_alternate" className="mr-1 align-middle text-[16px] text-[#0f4c3a]" />
                    Thêm ảnh
                  </button>
                  {images.length > 0 && activeImageIndex !== 0 && (
                    <button
                      type="button"
                      onClick={() => setAsPrimary(activeImageIndex)}
                      title="Đặt ảnh này làm ảnh đại diện chính"
                      className="h-9 px-3 rounded-lg bg-white/95 text-[12px] font-semibold text-[#0a3528] shadow-sm hover:bg-white"
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
                          activeImageIndex === idx ? "border-[#0f4c3a] ring-2 ring-[#a7f3d0]" : "border-[#e4e7ec] hover:border-[#b2ccff]",
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
                      className="h-14 w-14 grid place-items-center rounded-lg border-2 border-dashed border-[#a7f3d0] bg-[#f8f9ff] text-[#0f4c3a] hover:bg-[#ecfdf5]"
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
              <div className="rounded-lg bg-[#ecfdf5] p-3 text-[11.5px] leading-[1.5] text-[#475467]">
                <div className="flex items-start gap-1.5 font-semibold text-[#0f4c3a] mb-1">
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
                <span className={["ml-1 rounded px-1.5 py-0.5 text-[11px]", template?.isActive ? "bg-[#6ce7b7]" : "bg-[#ecfdf5] text-[#0a3528]"].join(" ")}>
                  {template?.isActive ? "ACTIVE" : "BẢN NHÁP"}
                </span>
              </h2>
              <span className="text-[12px] text-[#667085]">
                Mã hiện tại:{" "}
                <b className="rounded bg-[#ecfdf5] px-1.5 py-1 font-mono text-[#0a3528]">{customCode || template?.code || "Tự động cấp"}</b>
              </span>
            </div>

            {/* Mã định danh Template Code (Người dùng có thể tự đặt hoặc để tự sinh) */}
            <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3.5">
              <div className="flex items-center justify-between">
                <label htmlFor="product-code" className="text-[12px] font-bold text-gray-800 flex items-center gap-1.5">
                  <Icon name="tag" className="text-[16px] text-[#0f4c3a]" />
                  <span>Mã Mẫu Sản Phẩm (Template Code)</span>
                </label>
                <span className="text-[11px] text-gray-500">Tùy chỉnh mã gợi nhớ cho kho</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  id="product-code"
                  value={customCode}
                  placeholder="Ví dụ: AOHOODIE-NU-02 (để trống hệ thống sẽ tự sinh TMP-...)"
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                  className="h-10 flex-1 rounded-lg border border-gray-300 bg-white px-3 font-mono text-[13px] font-bold text-[#0a3528] uppercase outline-none focus:border-[#0f4c3a] focus:ring-1 focus:ring-[#0f4c3a]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const year = new Date().getFullYear();
                    const rand = Math.floor(1000 + Math.random() * 9000);
                    setCustomCode(`TMP-${year}-${rand}`);
                  }}
                  className="h-10 px-3 inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white text-[12px] font-semibold text-[#0f4c3a] hover:bg-emerald-50 shadow-xs"
                >
                  <Icon name="autorenew" className="text-[16px]" />
                  Tự sinh mã
                </button>
                {customCode && (
                  <button
                    type="button"
                    onClick={() => setCustomCode("")}
                    title="Xóa mã tùy chỉnh để hệ thống tự sinh mã tuần tự"
                    className="h-10 px-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 text-[12px]"
                  >
                    Mặc định
                  </button>
                )}
              </div>
            </div>

            <label className="mt-4 block text-[12px] font-semibold">
              Phân loại Ngành Hàng <span className="text-[#d92d20]">*</span>
            </label>
            <div className="mt-2 grid grid-cols-2 overflow-hidden rounded-lg bg-[#ecfdf5] p-1">
              <button
                type="button"
                onClick={() => selectIndustry("FASHION")}
                className={["rounded-md py-3 text-[14px] font-bold", industry === "FASHION" ? "bg-white text-[#0a3528] shadow-sm" : "text-[#667085]"].join(" ")}
              >
                <Icon name="checkroom" className="mr-2 align-middle text-[19px]" />
                Thời trang &amp; May mặc
              </button>
              <button
                type="button"
                onClick={() => selectIndustry("BEAUTY")}
                className={["rounded-md py-3 text-[14px] font-bold", industry === "BEAUTY" ? "bg-white text-[#0a3528] shadow-sm" : "text-[#667085]"].join(" ")}
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
              className="mt-2 h-12 w-full rounded-lg border-0 bg-[#ecfdf5] px-3 text-[15px] outline-none focus:ring-2 focus:ring-[#a7f3d0]"
            />

            <div className="mt-4 grid grid-cols-[1.25fr_0.85fr] gap-3">
              <label className="text-[12px] font-semibold">
                Danh Mục Sản Phẩm <span className="text-[#d92d20]">*</span>
                <button type="button" onClick={() => setShowQuickCat(true)} className="float-right text-[#0a3528] hover:underline font-semibold">＋ Thêm nhanh danh mục</button>
                <select
                  value={categoryId}
                  onChange={(event) => handleCategoryChange(event.target.value)}
                  className="mt-2 h-12 w-full rounded-lg border-0 bg-[#ecfdf5] px-3 text-[13px] font-normal outline-none"
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
                  className="mt-2 h-12 w-full rounded-lg border-0 bg-[#ecfdf5] px-3 text-[13px] font-normal outline-none"
                >
                  {units.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
                <span className="mt-1 block text-[10.5px] font-normal text-[#98a2b3]">Đơn vị chuẩn nhỏ nhất dùng tính định lượng tồn kho.</span>
              </label>
            </div>

            <div className="mt-5 rounded-xl bg-[#ecfdf5] p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#dff2ef] text-[#067647]">
                  <Icon name="verified_user" className="text-[22px]" />
                </span>
                <div className="flex-1">
                  <h3 className="text-[16px] font-bold">Quản Lý &amp; Theo Dõi Lô Hạn Dùng</h3>
                  <p className="mt-1 text-[12px] leading-[1.4] text-[#667085]">
                    <b>Quy chuẩn FEFO (First Expired, First Out):</b> Tự động tắt với Thời trang và bật với Mỹ phẩm có ngày hết hạn.
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
              className="mt-2 h-24 w-full resize-none rounded-lg border-0 bg-[#ecfdf5] px-3 py-3 text-[13px] outline-none focus:ring-2 focus:ring-[#a7f3d0]"
            />

            <div className="mt-4 flex items-center gap-3 rounded-lg bg-[#ecfdf5] px-3 py-3">
              <Icon name="toggle_on" className="text-[23px] text-[#0a3528]" />
              <div className="flex-1">
                <b className="text-[14px]">Kích hoạt kinh doanh ngay sau khi tạo</b>
                <p className="text-[11px] text-[#667085]">Sản phẩm chỉ được publish sau khi hoàn tất bước 4.</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveAfterCreate((value) => !value)}
                className={["relative h-7 w-14 rounded-full p-1", activeAfterCreate ? "bg-[#0a3528]" : "bg-[#98a2b3]"].join(" ")}
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
          <button
            type="button"
            onClick={() => {
              if (!templateId) {
                sessionStorage.removeItem("abc:wizard:draft:new");
              }
              navigate("/products");
            }}
            className="h-12 rounded-lg bg-[#eaf0ff] px-5 text-[14px] font-semibold text-[#344054]"
          >
            Hủy &amp; Quay lại
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save(false)}
            className="h-12 rounded-lg bg-[#ecfdf5] px-5 text-[14px] font-semibold text-[#344054] disabled:opacity-60"
          >
            <Icon name="save" className="mr-2 align-middle text-[17px]" />
            Lưu bản nháp
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save(true)}
            className="h-12 rounded-lg bg-[#0f4c3a] px-8 text-[15px] font-bold text-white shadow-[0_4px_12px_rgba(79,70,229,0.3)] disabled:opacity-60"
          >
            {busy ? "Đang lưu..." : "Tiếp tục: Bước 2 - Thiết lập thuộc tính"}
            <Icon name="arrow_forward" className="ml-2 align-middle text-[20px]" />
          </button>
        </div>
      </footer>

      {/* MODAL THÊM NHANH DANH MỤC */}
      {showQuickCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-[17px] font-bold text-gray-900 flex items-center gap-2">
                <Icon name="category" className="text-[22px] text-[#0f4c3a]" />
                Thêm nhanh danh mục sản phẩm
              </h3>
              <button
                type="button"
                onClick={() => setShowQuickCat(false)}
                className="rounded-lg p-1 text-gray-400 hover:text-gray-600"
              >
                <Icon name="close" className="text-[20px]" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[13px] font-semibold text-gray-700">
                  Tên danh mục mới <span className="text-red-500">*</span>
                </label>
                <input
                  autoFocus
                  type="text"
                  value={quickCatName}
                  onChange={(e) => setQuickCatName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void handleCreateQuickCategory()}
                  placeholder="Ví dụ: Áo hoodie, Giày sneaker, Túi xách, Serum..."
                  className="mt-1.5 h-11 w-full rounded-xl border border-gray-300 bg-white px-3.5 text-[14px] outline-none focus:border-[#0f4c3a] focus:ring-2 focus:ring-[#0f4c3a]/20"
                />
              </div>

              <div>
                <label className="text-[13px] font-semibold text-gray-700">
                  Danh mục cha (Tùy chọn)
                </label>
                <select
                  value={quickCatParentId}
                  onChange={(e) => setQuickCatParentId(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-[13px] outline-none focus:border-[#0f4c3a]"
                >
                  <option value="">(Không có - Tạo làm danh mục gốc)</option>
                  {categories?.items.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={quickCatBusy}
                onClick={() => setShowQuickCat(false)}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={quickCatBusy || !quickCatName.trim()}
                onClick={() => void handleCreateQuickCategory()}
                className="rounded-xl bg-[#0f4c3a] px-5 py-2.5 text-[13px] font-bold text-white hover:bg-[#0a3528] disabled:opacity-60"
              >
                {quickCatBusy ? "Đang tạo..." : "Tạo danh mục ngay"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
