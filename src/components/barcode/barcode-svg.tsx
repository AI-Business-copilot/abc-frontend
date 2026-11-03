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
  format,
  width = 1.6,
  height = 42,
  fontSize = 12,
  displayValue = true,
  className = "",
}: BarcodeSvgProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;

    const cleanVal = String(value).trim();
    // Tự động nhận diện định dạng tối ưu:
    // Nếu là 12 hoặc 13 số -> ưu tiên chuẩn EAN13 bán lẻ hàng hóa
    // Nếu có chữ hoặc định dạng SKU nội bộ -> dùng chuẩn CODE128
    let actualFormat = format || (/^\d{12,13}$/.test(cleanVal) ? "EAN13" : "CODE128");

    try {
      JsBarcode(svgRef.current, cleanVal, {
        format: actualFormat,
        width,
        height,
        displayValue,
        fontSize,
        textMargin: 3,
        margin: 6,
        font: "monospace",
        fontOptions: "bold",
        lineColor: "#000000",
        background: "#ffffff",
      });
    } catch {
      // Fallback về CODE128 nếu có lỗi check digit EAN13
      try {
        if (svgRef.current) {
          JsBarcode(svgRef.current, cleanVal, {
            format: "CODE128",
            width,
            height,
            displayValue,
            fontSize,
            textMargin: 3,
            margin: 6,
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

  return (
    <svg
      ref={svgRef}
      className={className}
      style={{
        maxWidth: "100%",
        height: "auto",
        display: "block",
        shapeRendering: "crispEdges",
      }}
    />
  );
}
