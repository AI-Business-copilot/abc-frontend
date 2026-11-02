import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeSvgProps {
  value: string;
  format?: "CODE128" | "EAN13";
  width?: number;
  height?: number;
  fontSize?: number;
  displayValue?: boolean;
  className?: string;
}

export function BarcodeSvg({
  value,
  format = "CODE128",
  width = 1.6,
  height = 42,
  fontSize = 12,
  displayValue = true,
  className = "",
}: BarcodeSvgProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;

    try {
      // Tự động kiểm tra format: nếu định dạng EAN13 nhưng giá trị không đúng 12 hoặc 13 chữ số thì fallback về CODE128
      let actualFormat = format;
      const cleanVal = String(value).trim();

      if (format === "EAN13") {
        if (!/^\d{12,13}$/.test(cleanVal)) {
          actualFormat = "CODE128";
        }
      }

      JsBarcode(svgRef.current, cleanVal, {
        format: actualFormat,
        width,
        height,
        displayValue,
        fontSize,
        textMargin: 2,
        margin: 2,
        font: "monospace",
        fontOptions: "bold",
        lineColor: "#000000",
        background: "#ffffff",
      });
    } catch {
      // Fallback về CODE128 nếu có lỗi format
      try {
        if (svgRef.current) {
          JsBarcode(svgRef.current, String(value).trim(), {
            format: "CODE128",
            width,
            height,
            displayValue,
            fontSize,
            font: "monospace",
            lineColor: "#000000",
            background: "#ffffff",
          });
        }
      } catch {
        // ignore
      }
    }
  }, [value, format, width, height, fontSize, displayValue]);

  if (!value) {
    return <span className="text-[11px] text-gray-400 italic">Chưa có mã</span>;
  }

  return <svg ref={svgRef} className={className} />;
}
