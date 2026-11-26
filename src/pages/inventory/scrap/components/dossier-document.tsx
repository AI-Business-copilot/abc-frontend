// The printable disposal dossier (F08). The layout follows the Vietnamese form the tax file
// expects: a header with the business, the six steps of the procedure, the bảng kê xuất nhập tồn
// and the signature blocks.
//
// The document is built once and used for both the preview and the download, so the two can never
// show different content.

import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import {
  disposalMethodLabel,
  lotStatusText,
  scrapCauseCodeLabel,
  type DisposalDossierReport,
  type ScrapCauseCode,
  type DisposalMethod,
} from "@/types/scrap";

// Noto Sans covers the Vietnamese diacritics. Without it they print as empty boxes.
// The sources can be replaced so the document can also be rendered outside the browser.
export const DOSSIER_FONT_SOURCES = {
  regular: "/fonts/NotoSans-Regular.ttf",
  bold: "/fonts/NotoSans-Bold.ttf",
};

Font.register({
  family: "Noto Sans",
  fonts: [
    { src: DOSSIER_FONT_SOURCES.regular, fontWeight: 400 },
    { src: DOSSIER_FONT_SOURCES.bold, fontWeight: 700 },
    // The muted style asks for an italic face. react-pdf resolves a font by matching
    // fontStyle AND fontWeight, so without this entry any "Chưa ghi nhận" cell throws
    // "Could not resolve font for Noto Sans". There is no italic cut in public/fonts,
    // so the regular face stands in for it.
    { src: DOSSIER_FONT_SOURCES.regular, fontStyle: "italic", fontWeight: 400 },
  ],
});

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
    fontFamily: "Noto Sans",
    fontSize: 10,
    color: "#111827",
    lineHeight: 1.45,
  },
  header: { alignItems: "center", marginBottom: 16 },
  nation: { fontSize: 11, fontWeight: 700, textTransform: "uppercase" },
  docTitle: { fontSize: 14, fontWeight: 700, marginTop: 6 },
  business: { marginTop: 6, textAlign: "center" },
  divider: { borderBottomWidth: 1, borderBottomColor: "#111827", marginVertical: 10 },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginTop: 14, marginBottom: 6 },
  paragraph: { marginBottom: 4 },
  table: { borderWidth: 1, borderColor: "#9ca3af", marginTop: 6 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#d1d5db" },
  rowLast: { flexDirection: "row" },
  cell: { flex: 1, padding: 5, borderRightWidth: 1, borderRightColor: "#d1d5db" },
  cellLabel: { flex: 2.2, padding: 5, borderRightWidth: 1, borderRightColor: "#d1d5db", backgroundColor: "#f3f4f6" },
  headerCell: {
    flex: 1,
    padding: 5,
    borderRightWidth: 1,
    borderRightColor: "#d1d5db",
    backgroundColor: "#f3f4f6",
    fontWeight: 700,
    fontSize: 9,
  },
  value: { fontWeight: 700 },
  muted: { color: "#6b7280", fontStyle: "italic" },
  signatures: { flexDirection: "row", marginTop: 22, justifyContent: "space-between" },
  signatureBlock: { width: "45%", alignItems: "center" },
  signatureRole: { fontWeight: 700, marginBottom: 2 },
  signatureLine: { marginTop: 42, fontSize: 9 },
  note: { marginTop: 18, fontSize: 9, color: "#4b5563" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#6b7280",
  },
});

/** A value that was never recorded says so, so a gap in the dossier is visible. */
function formatDate(value: string | null | undefined) {
  if (!value) return "Chưa ghi nhận";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa ghi nhận";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(date);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Chưa ghi nhận";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa ghi nhận";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatMoney(value: number) {
  return `${new Intl.NumberFormat("vi-VN").format(value)} đ`;
}

const transactionTypeLabel: Record<string, string> = {
  OPENING_STOCK: "Nhập tồn đầu kỳ",
  PURCHASE_RECEIPT: "Nhập từ nhà cung cấp",
  POS_SALE: "Bán tại quầy",
  CUSTOMER_RETURN: "Khách trả lại",
  VENDOR_RETURN: "Trả lại nhà cung cấp",
  STOCK_ADJUSTMENT_IN: "Điều chỉnh tăng",
  STOCK_ADJUSTMENT_OUT: "Điều chỉnh giảm",
  SCRAP_DISPOSAL: "Xuất hủy hàng",
  SCRAP_PHYSICALLY_DISPOSED: "Xác nhận đã tiêu hủy",
};

/** One label/value line of the form. */
function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  const missing = value === null || value === undefined || value === "";
  return (
    <View style={styles.row}>
      <Text style={styles.cellLabel}>{label}</Text>
      <Text style={styles.cell}>
        {missing ? <Text style={styles.muted}>Chưa ghi nhận</Text> : <Text style={styles.value}>{String(value)}</Text>}
      </Text>
    </View>
  );
}

export function DisposalDossierDocument({ report }: { report: DisposalDossierReport }) {
  const causeLabel = report.step3_decision.causeCode
    ? scrapCauseCodeLabel[report.step3_decision.causeCode as ScrapCauseCode]
    : null;
  const methodLabel = report.step3_decision.disposalMethod
    ? disposalMethodLabel[report.step3_decision.disposalMethod as DisposalMethod]
    : null;

  return (
    <Document title={`Biên bản tiêu hủy ${report.scrapCode}`} author={report.businessName}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.nation}>Cộng hòa xã hội chủ nghĩa Việt Nam</Text>
          <Text style={styles.nation}>Độc lập – Tự do – Hạnh phúc</Text>
          <Text style={styles.docTitle}>HỒ SƠ TIÊU HỦY HÀNG HÓA</Text>
          <Text style={styles.business}>
            Doanh nghiệp: {report.businessName}
            {report.businessAddress ? ` — ${report.businessAddress}` : ""}
          </Text>
          <Text style={styles.business}>Số phiếu: {report.scrapCode}</Text>
        </View>
        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Thành lập hội đồng kiểm kê</Text>
        <View style={styles.table}>
          <Field label="Trưởng hội đồng" value={report.step1_council.leader} />
          <Field label="Kế toán" value={report.step1_council.accountant} />
          <Field label="Ngày lập biên bản" value={formatDateTime(report.step1_council.createdDate)} />
        </View>

        <Text style={styles.sectionTitle}>Biên bản kiểm kê hàng hóa hư hỏng, quá hạn sử dụng</Text>
        <View style={styles.table}>
          <Field label="Tên hàng hóa" value={report.step2_inspection.productName} />
          <Field label="Mã sản phẩm (SKU)" value={report.step2_inspection.sku} />
          <Field label="Số lô" value={report.step2_inspection.lotNumber} />
          <Field label="Hạn sử dụng" value={formatDate(report.step2_inspection.expiryDate)} />
          <Field label="Số lượng" value={report.step2_inspection.quantity} />
          <Field label="Giá vốn đơn vị" value={formatMoney(report.step2_inspection.unitCost)} />
          <Field label="Tổng giá trị" value={formatMoney(report.step2_inspection.totalValue)} />
          <Field label="Tình trạng hàng hóa" value={lotStatusText(report.step2_inspection.condition)} />
          <Field label="Ngày kiểm kê" value={formatDateTime(report.step2_inspection.createdDate)} />
        </View>

        <Text style={styles.sectionTitle}>Quyết định tiêu hủy</Text>
        <View style={styles.table}>
          <Field label="Nguyên nhân (mã)" value={causeLabel} />
          <Field label="Phương thức tiêu hủy" value={methodLabel} />
          <Field label="Địa điểm tiêu hủy" value={report.step3_decision.disposalLocation} />
          <Field label="Thành viên hội đồng" value={report.step3_decision.witnesses.join(", ")} />
          <Field label="Người quyết định" value={report.step3_decision.approvedBy} />
          <Field label="Ngày quyết định" value={formatDateTime(report.step3_decision.approvedDate)} />
        </View>

        <Text style={styles.sectionTitle}>Thực hiện tiêu hủy</Text>
        <Text style={styles.paragraph}>{report.step4_execution.status}</Text>

        <Text style={styles.sectionTitle}>Biên bản tiêu hủy</Text>
        <View style={styles.table}>
          <Field label="Ngày tiêu hủy thực tế" value={formatDate(report.step5_disposal.actualDate)} />
          <Field label="Người xác nhận" value={report.step5_disposal.confirmedBy} />
        </View>

        <Text style={styles.sectionTitle}>Bảng kê xuất nhập tồn</Text>
        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={[styles.headerCell, { flex: 1.6 }]}>Ngày</Text>
            <Text style={[styles.headerCell, { flex: 2.2 }]}>Loại giao dịch</Text>
            <Text style={[styles.headerCell, { flex: 1 }]}>Số lượng</Text>
            <Text style={[styles.headerCell, { flex: 1.4 }]}>Đơn giá</Text>
            <Text style={[styles.headerCell, { flex: 1.6 }]}>Thành tiền</Text>
          </View>
          {report.step6_archive_bangke.bangKeXuatNhapTon.length === 0 ? (
            <View style={styles.rowLast}>
              <Text style={[styles.cell, { flex: 8.4 }]}>
                <Text style={styles.muted}>Chưa có phát sinh xuất nhập tồn.</Text>
              </Text>
            </View>
          ) : (
            report.step6_archive_bangke.bangKeXuatNhapTon.map((line, index) => (
              <View
                key={`${line.date}-${index}`}
                style={index === report.step6_archive_bangke.bangKeXuatNhapTon.length - 1 ? styles.rowLast : styles.row}
              >
                <Text style={[styles.cell, { flex: 1.6 }]}>{formatDate(line.date)}</Text>
                <Text style={[styles.cell, { flex: 2.2 }]}>
                  {transactionTypeLabel[line.transactionType] ?? line.transactionType}
                </Text>
                <Text style={[styles.cell, { flex: 1 }]}>{line.quantity}</Text>
                <Text style={[styles.cell, { flex: 1.4 }]}>{formatMoney(line.unitCost)}</Text>
                <Text style={[styles.cell, { flex: 1.6 }]}>{formatMoney(line.totalValue)}</Text>
              </View>
            ))
          )}
        </View>

        <Text style={styles.sectionTitle}>Thông tin thuế</Text>
        <View style={styles.table}>
          <Field label="Tổng giá trị tổn thất" value={formatMoney(report.tax_fields.totalLossValue)} />
          <Field label="Số đã được bồi thường" value={formatMoney(report.tax_fields.compensatedAmount)} />
          <Field label="Tổn thất được trừ" value={formatMoney(report.tax_fields.deductibleLoss)} />
          <Field label="Căn cứ" value={report.tax_fields.taxLegislation} />
        </View>

        <Text style={styles.note}>
          Hồ sơ này được lập theo Thông tư 78/2014/TT-BTC ngày 02/09/2014 của Bộ Tài chính, được sửa đổi,
          bổ sung bởi Thông tư 96/2015/TT-BTC ngày 25/12/2015. Bảng kê xuất nhập tồn phải được người
          đại diện theo pháp luật của doanh nghiệp ký.
        </Text>

        {/* The signature block is not fixed: a fixed block is repeated on every page, and the
            minutes carry exactly one set of signatures. */}
        <View style={styles.signatures}>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureRole}>NGƯỜI LẬP BIÊN BẢN</Text>
            <Text style={styles.signatureLine}>(Ký, ghi rõ họ tên)</Text>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureRole}>NGƯỜI ĐẠI DIỆN THEO PHÁP LUẬT</Text>
            <Text style={styles.signatureLine}>(Ký, ghi rõ họ tên, đóng dấu)</Text>
          </View>
        </View>

        <Text style={styles.footer} fixed>
          {report.scrapCode} — {report.businessName}
        </Text>
      </Page>
    </Document>
  );
}
