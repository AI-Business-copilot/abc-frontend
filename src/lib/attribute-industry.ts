export type AttributeIndustry = "fashion" | "beauty" | "other";

export interface IndustryOption {
  value: AttributeIndustry;
  label: string;
  badgeClass: string;
}

export const INDUSTRY_OPTIONS: IndustryOption[] = [
  {
    value: "fashion",
    label: "Thời trang & May mặc",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  {
    value: "beauty",
    label: "Mỹ phẩm & Làm đẹp",
    badgeClass: "bg-pink-50 text-pink-700 border-pink-200",
  },
  {
    value: "other",
    label: "Đa ngành / Chung",
    badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
  },
];

const STORAGE_PREFIX = "abc:attr_industry:";

/**
 * Suy đoán ngành tự động dựa trên tên thuộc tính nếu người dùng chưa thiết lập thủ công
 */
export function detectIndustry(name: string): AttributeIndustry {
  const n = (name || "").toLowerCase().trim();
  if (
    n.includes("màu") ||
    n.includes("size") ||
    n.includes("kích") ||
    n.includes("chất liệu") ||
    n.includes("kiểu") ||
    n.includes("dáng") ||
    n.includes("vải")
  ) {
    return "fashion";
  }
  if (
    n.includes("dung tích") ||
    n.includes("mùi") ||
    n.includes("hương") ||
    n.includes("tone") ||
    n.includes("spf") ||
    n.includes("loại da") ||
    n.includes("hạn") ||
    n.includes("ml") ||
    n.includes("thể tích")
  ) {
    return "beauty";
  }
  return "other";
}

/**
 * Lấy ngành của thuộc tính: ưu tiên giá trị người dùng lưu trong localStorage, nếu chưa có thì dùng hàm đoán tự động
 */
export function getAttributeIndustry(attributeId: string, attributeName: string): AttributeIndustry {
  if (typeof window === "undefined") return detectIndustry(attributeName);
  try {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}${attributeId}`);
    if (saved === "fashion" || saved === "beauty" || saved === "other") {
      return saved;
    }
  } catch {
    // ignore
  }
  return detectIndustry(attributeName);
}

/**
 * Lưu thiết lập ngành cho thuộc tính
 */
export function setAttributeIndustry(attributeId: string, industry: AttributeIndustry): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${attributeId}`, industry);
  } catch {
    // ignore
  }
}

