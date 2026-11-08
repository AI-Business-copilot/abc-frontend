import { useRef, useState } from "react";
import { type CategoryOption, type ProductItem } from "@/api/products-list";
import { productWizardApi } from "@/api/product-wizard";
import { getAllImages, serializeImages, uploadImageToStorage } from "@/lib/image-utils";
import { Icon } from "@/pages/products/ui-icon";

interface ProductEditModalProps {
  product: ProductItem;
  categories: CategoryOption[];
  onClose: () => void;
  onSaved: () => void;
}

const units = ["Cái (Piece)", "Chai (Bottle)", "Hộp (Box)", "Đôi (Pair)", "Gói (Pack)", "Tuýp (Tube)", "Lọ (Jar)", "ml"];

export function ProductEditModal({
  product,
  categories,
  onClose,
  onSaved,
}: ProductEditModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"general" | "variants">("general");

  // Thông tin chung
  const [name, setName] = useState(product.name);
  const [code, setCode] = useState(product.code || "");
  const [categoryId, setCategoryId] = useState(product.categoryId || "");
  const [unitOfMeasure, setUnitOfMeasure] = useState(product.unitOfMeasure || "Cái");
  const [description, setDescription] = useState(product.description || "");
  const [hasLotTracking, setHasLotTracking] = useState(product.hasLotTracking ?? false);
  const [isActive, setIsActive] = useState(product.isActive ?? true);
  const [images, setImages] = useState<string[]>(() => getAllImages(product.imageUrl));

  // Biến thể SKU
  const [skus, setSkus] = useState<
    Array<{
      id: string;
      sku: string;
      barcode: string;
      basePrice: number;
      costPrice: number;
      safetyStockQty: number;
      stockQty: number;
      image: string;
    }>
  >(() => {
    return product.skus.map((s) => {
      const savedImg = localStorage.getItem(`variant_img_${s.id}`) || localStorage.getItem(`variant_img_${s.sku}`) || "";
      return {
        id: s.id,
        sku: s.sku,
        barcode: s.barcode || "",
        basePrice: s.basePrice || 0,
        costPrice: s.costPrice || 0,
        safetyStockQty: s.safetyStockQty || 0,
        stockQty: s.stockQty || 0,
        image: savedImg,
      };
    });
  });

  const [assigningSkuIndex, setAssigningSkuIndex] = useState<number | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successNotice, setSuccessNotice] = useState("");

  const handlePickImages = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setUploadingImage(true);
    setError("");
    try {
      const uploadPromises = Array.from(files).map((file) => uploadImageToStorage(file));
      const newUrls = await Promise.all(uploadPromises);
      setImages((prev) => [...prev, ...newUrls]);
    } catch (err: any) {
      setError("Không thể tải ảnh lên kho lưu trữ: " + (err?.message || ""));
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const makePrimaryImage = (index: number) => {
    setImages((prev) => {
      const next = [...prev];
      const [chosen] = next.splice(index, 1);
      return [chosen, ...next];
    });
  };

  const updateSku = (index: number, patch: Partial<(typeof skus)[0]>) => {
    setSkus((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Tên sản phẩm không được để trống.");
      setActiveTab("general");
      return;
    }
    setSaving(true);
    setError("");
    setSuccessNotice("");

    try {
      // 1. Cập nhật thông tin ProductTemplate
      await productWizardApi.updateTemplate(product.id, {
        name: name.trim(),
        code: code.trim() || null,
        categoryId: categoryId || null,
        unitOfMeasure: unitOfMeasure.trim() || "Cái",
        description: description.trim() || null,
        hasLotTracking,
        isActive,
        imageUrl: serializeImages(images),
      });

      // 2. Cập nhật thông tin các biến thể SKU
      if (skus.length > 0) {
        await productWizardApi.bulkUpdateVariants(
          product.id,
          skus.map((s) => ({
            id: s.id,
            sku: s.sku.trim(),
            barcode: s.barcode.trim() || undefined,
            basePrice: Number(s.basePrice) || 0,
            costPrice: Number(s.costPrice) || 0,
            safetyStockQty: Number(s.safetyStockQty) || 0,
          })),
        );

        // Lưu ảnh biến thể vào localStorage
        for (const s of skus) {
          if (s.image) {
            localStorage.setItem(`variant_img_${s.id}`, s.image);
            localStorage.setItem(`variant_img_${s.sku}`, s.image);
          }
        }
      }

      setSuccessNotice("Cập nhật sản phẩm và biến thể thành công!");
      setTimeout(() => {
        onSaved();
      }, 600);
    } catch (err: any) {
      setError(err?.message || "Lỗi khi lưu thông tin sản phẩm.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="flex h-[92vh] max-h-[850px] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-gray-100">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gray-50/70">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0f4c3a] text-white">
              <Icon name="edit" className="text-[20px]" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-bold text-[#0f4c3a] uppercase bg-emerald-50 px-2 py-0.5 rounded">
                  {code || product.code || "SẢN PHẨM"}
                </span>
                <span className="text-[12px] text-gray-500">Chỉnh sửa nhanh sản phẩm</span>
              </div>
              <h2 className="text-[18px] font-extrabold text-gray-900 mt-0.5">{name || "Chưa đặt tên"}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-gray-200/70 p-1 text-[12.5px] font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("general")}
                className={["px-3.5 py-1.5 rounded-md transition-all flex items-center gap-1.5", activeTab === "general" ? "bg-white text-[#0f4c3a] shadow-xs" : "text-gray-600 hover:text-gray-900"].join(" ")}
              >
                <Icon name="info" className="text-[16px]" />
                Thông tin chung
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("variants")}
                className={["px-3.5 py-1.5 rounded-md transition-all flex items-center gap-1.5", activeTab === "variants" ? "bg-white text-[#0f4c3a] shadow-xs" : "text-gray-600 hover:text-gray-900"].join(" ")}
              >
                <Icon name="category" className="text-[16px]" />
                Biến thể &amp; Giá ({skus.length} SKU)
              </button>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-700 ml-2"
            >
              <Icon name="close" className="text-[22px]" />
            </button>
          </div>
        </div>

        {/* Thông báo lỗi / thành công */}
        {error && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-2.5 text-[13px] font-semibold text-red-700 flex items-center gap-2">
            <Icon name="error" className="text-[18px]" />
            {error}
          </div>
        )}
        {successNotice && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 text-[13px] font-semibold text-emerald-700 flex items-center gap-2">
            <Icon name="check_circle" className="text-[18px]" />
            {successNotice}
          </div>
        )}

        {/* Nội dung theo Tab */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#f9fafb]">
          {activeTab === "general" ? (
            <div className="max-w-3xl mx-auto space-y-5 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[12.5px] font-bold text-gray-700 uppercase">
                    Tên sản phẩm cha <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: Áo Hoodie Nữ Form Rộng Nỉ Bông"
                    className="mt-1.5 h-10 w-full rounded-lg border border-gray-300 px-3.5 text-[13.5px] font-semibold outline-none focus:border-[#0f4c3a] focus:ring-1 focus:ring-[#0f4c3a]"
                  />
                </div>

                <div>
                  <label className="text-[12.5px] font-bold text-gray-700 uppercase">
                    Mã sản phẩm (Code)
                  </label>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="VD: HOODIE-NU-01 hoặc TMP-2026-..."
                    className="mt-1.5 h-10 w-full rounded-lg border border-gray-300 px-3.5 font-mono text-[13px] font-bold outline-none focus:border-[#0f4c3a] focus:ring-1 focus:ring-[#0f4c3a]"
                  />
                  <span className="text-[11px] text-gray-400 mt-0.5 block">
                    Có thể tùy chỉnh theo quy tắc nội bộ doanh nghiệp.
                  </span>
                </div>

                <div>
                  <label className="text-[12.5px] font-bold text-gray-700 uppercase">
                    Danh mục hàng hóa
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-lg border border-gray-300 px-3.5 text-[13px] outline-none focus:border-[#0f4c3a]"
                  >
                    <option value="">-- Chưa phân loại --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[12.5px] font-bold text-gray-700 uppercase">
                    Đơn vị tính (UoM)
                  </label>
                  <select
                    value={unitOfMeasure}
                    onChange={(e) => setUnitOfMeasure(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-lg border border-gray-300 px-3.5 text-[13px] outline-none focus:border-[#0f4c3a]"
                  >
                    {units.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[12.5px] font-bold text-gray-700 uppercase">
                    Chế độ quản lý &amp; Trạng thái
                  </label>
                  <div className="mt-2 space-y-2 text-[13px]">
                    <label className="flex items-center gap-2 cursor-pointer font-medium">
                      <input
                        type="checkbox"
                        checked={hasLotTracking}
                        onChange={(e) => setHasLotTracking(e.target.checked)}
                        className="rounded accent-[#0f4c3a] w-4 h-4"
                      />
                      <span>Bật quản lý Số lô &amp; Hạn sử dụng (Mỹ phẩm / FEFO)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-medium">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="rounded accent-[#0f4c3a] w-4 h-4"
                      />
                      <span>Đang kích hoạt kinh doanh (Active)</span>
                    </label>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="text-[12.5px] font-bold text-gray-700 uppercase">Mô tả sản phẩm</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mô tả chất liệu, đặc tính, hướng dẫn bảo quản..."
                    className="mt-1.5 w-full rounded-lg border border-gray-300 p-3 text-[13px] outline-none focus:border-[#0f4c3a]"
                  />
                </div>
              </div>

              {/* Quản lý ảnh & thư viện góc chụp */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[12.5px] font-bold text-gray-700 uppercase">
                      Ảnh sản phẩm &amp; Thư viện góc chụp ({images.length} ảnh)
                    </label>
                    <p className="text-[11.5px] text-gray-500">
                      Tự động tải lên Supabase Storage bucket SEP (URL trực tiếp, không lưu chuỗi base64 nặng CSDL).
                    </p>
                  </div>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePickImages}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={uploadingImage}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f4c3a] px-3.5 py-2 text-[12.5px] font-bold text-white shadow-xs hover:bg-[#0a3528] transition-colors disabled:opacity-50"
                    >
                      {uploadingImage ? (
                        <>
                          <Icon name="progress_activity" className="animate-spin text-[16px]" />
                          Đang tải lên...
                        </>
                      ) : (
                        <>
                          <Icon name="add_photo_alternate" className="text-[18px]" />
                          Tải thêm ảnh
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-3">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative h-20 w-20 rounded-xl border border-gray-200 overflow-hidden group shadow-xs bg-gray-50"
                    >
                      <img src={img} alt={`Ảnh #${idx + 1}`} className="w-full h-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute top-1 left-1 bg-[#0f4c3a] text-white text-[8.5px] font-bold px-1 rounded shadow-xs">
                          Chính
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                        {idx !== 0 && (
                          <button
                            type="button"
                            onClick={() => makePrimaryImage(idx)}
                            className="p-1 rounded bg-white text-gray-800 hover:text-[#0f4c3a]"
                            title="Đặt làm ảnh chính"
                          >
                            <Icon name="star" className="text-[14px]" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="p-1 rounded bg-white text-red-600 hover:bg-red-50"
                          title="Xóa ảnh"
                        >
                          <Icon name="delete" className="text-[14px]" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {images.length === 0 && (
                    <div className="w-full py-8 text-center text-gray-400 border border-dashed border-gray-300 rounded-xl text-[12px]">
                      Chưa có hình ảnh nào. Bấm "Tải thêm ảnh" để thêm góc chụp.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: BIẾN THỂ SKU VÀ GIÁ */
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-[15px] font-bold text-gray-900">
                    Danh Sách Biến Thể SKU ({skus.length} SKU)
                  </h3>
                  <p className="text-[12px] text-gray-500">
                    Cập nhật mã SKU, mã vạch barcode, đơn giá vốn net, giá bán lẻ niêm yết và mức tồn tối thiểu an toàn.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-left text-[12.5px]">
                  <thead className="bg-gray-50 border-b border-gray-200 text-[#475467] font-semibold text-[11.5px]">
                    <tr>
                      <th className="px-3 py-2.5 w-16">Ảnh</th>
                      <th className="px-3 py-2.5">Mã SKU</th>
                      <th className="px-3 py-2.5">Mã Barcode</th>
                      <th className="px-3 py-2.5 text-right">Giá vốn (VNĐ)</th>
                      <th className="px-3 py-2.5 text-right">Giá bán lẻ (VNĐ)</th>
                      <th className="px-3 py-2.5 text-center">Tồn an toàn</th>
                      <th className="px-3 py-2.5 text-right">Tồn hiện tại</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {skus.map((s, index) => {
                      const displayImg = s.image || images[0] || "";
                      const safetyLimit = typeof s.safetyStockQty === "number" ? s.safetyStockQty : 0;
                      const isLowStock = safetyLimit > 0 && s.stockQty <= safetyLimit;
                      return (
                        <tr key={s.id} className="hover:bg-gray-50/50">
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => setAssigningSkuIndex(index)}
                              className="relative h-10 w-10 rounded-lg border border-gray-200 overflow-hidden group block hover:border-[#0f4c3a]"
                              title="Bấm để chọn/gán ảnh đúng góc chụp cho SKU này"
                            >
                              {displayImg ? (
                                <img src={displayImg} alt={s.sku} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gray-100 grid place-items-center text-gray-400">
                                  <Icon name="image" className="text-[16px]" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px]">
                                <Icon name="photo_camera" className="text-[14px]" />
                              </div>
                            </button>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={s.sku}
                              onChange={(e) => updateSku(index, { sku: e.target.value })}
                              className="h-8 w-36 rounded border border-gray-300 px-2 font-mono text-[11.5px] font-bold text-gray-900 outline-none focus:border-[#0f4c3a]"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={s.barcode}
                              onChange={(e) => updateSku(index, { barcode: e.target.value })}
                              placeholder="Barcode EAN/Code128"
                              className="h-8 w-36 rounded border border-gray-300 px-2 font-mono text-[11.5px] text-[#0f4c3a] font-semibold outline-none focus:border-[#0f4c3a]"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              min={0}
                              value={s.costPrice}
                              onChange={(e) => updateSku(index, { costPrice: Number(e.target.value) })}
                              className="h-8 w-28 rounded border border-gray-300 px-2 text-right font-medium text-gray-800 outline-none focus:border-[#0f4c3a]"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <input
                              type="number"
                              min={0}
                              value={s.basePrice}
                              onChange={(e) => updateSku(index, { basePrice: Number(e.target.value) })}
                              className="h-8 w-28 rounded border border-gray-300 px-2 text-right font-bold text-[#0f4c3a] outline-none focus:border-[#0f4c3a]"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number"
                              min={0}
                              value={s.safetyStockQty}
                              onChange={(e) => updateSku(index, { safetyStockQty: Number(e.target.value) })}
                              className="h-8 w-16 rounded border border-gray-300 px-2 text-center text-[12px] font-bold outline-none focus:border-[#0f4c3a]"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className={["font-bold", isLowStock ? "text-red-600 bg-red-50 px-2 py-0.5 rounded text-[11px]" : "text-gray-900"].join(" ")}>
                              {s.stockQty} {unitOfMeasure}
                            </span>
                            {isLowStock && <span className="block text-[10px] text-red-500 font-semibold">Dưới mức an toàn</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal con chọn ảnh cho từng SKU */}
        {assigningSkuIndex !== null && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-gray-100">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-[15px] font-bold text-gray-900">
                  Gán ảnh cho SKU: <span className="font-mono text-[#0f4c3a]">{skus[assigningSkuIndex]?.sku}</span>
                </h3>
                <button
                  onClick={() => setAssigningSkuIndex(null)}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100"
                >
                  <Icon name="close" className="text-[20px]" />
                </button>
              </div>

              <div className="mt-3">
                <p className="text-[12px] text-gray-600">Chọn góc chụp đại diện cho màu sắc / kích cỡ biến thể này:</p>
                <div className="mt-2.5 grid grid-cols-4 gap-2.5 max-h-56 overflow-y-auto p-1">
                  {images.map((img, i) => {
                    const isSelected = skus[assigningSkuIndex]?.image === img;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          updateSku(assigningSkuIndex, { image: img });
                          setAssigningSkuIndex(null);
                        }}
                        className={["relative h-18 w-full rounded-xl border-2 overflow-hidden hover:scale-105 transition-all", isSelected ? "border-[#0f4c3a] shadow-md ring-2 ring-emerald-200" : "border-gray-200"].join(" ")}
                      >
                        <img src={img} alt={`Góc #${i + 1}`} className="w-full h-full object-cover" />
                        {isSelected && (
                          <span className="absolute top-1 right-1 bg-[#0f4c3a] text-white rounded-full p-0.5">
                            <Icon name="check" className="text-[12px]" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t pt-3">
                <button
                  type="button"
                  onClick={() => {
                    updateSku(assigningSkuIndex, { image: "" });
                    setAssigningSkuIndex(null);
                  }}
                  className="text-[12px] text-gray-500 hover:text-gray-800"
                >
                  Dùng ảnh mặc định của sản phẩm
                </button>
                <button
                  type="button"
                  onClick={() => setAssigningSkuIndex(null)}
                  className="rounded-lg bg-gray-200 px-3.5 py-1.5 text-[12px] font-bold text-gray-700 hover:bg-gray-300"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Modal */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3.5 bg-gray-50/70">
          <div className="text-[12px] text-gray-500 flex items-center gap-1.5">
            <Icon name="tips_and_updates" className="text-[16px] text-amber-500" />
            <span>Chỉnh sửa trực tiếp không tái tạo SKU hoặc làm mất số dư tồn kho.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-[13px] font-semibold text-gray-700 hover:bg-gray-50"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0f4c3a] px-5 py-2 text-[13.5px] font-bold text-white shadow-sm hover:bg-[#0a3528] disabled:opacity-50 transition-all cursor-pointer"
            >
              {saving ? (
                <>
                  <Icon name="progress_activity" className="animate-spin text-[16px]" />
                  Đang lưu thay đổi...
                </>
              ) : (
                <>
                  <Icon name="save" className="text-[18px]" />
                  Lưu thay đổi
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
