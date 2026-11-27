// Renders the disposal dossier PDF once, to prove the document builds and the Vietnamese text
// comes out right. Run with: npm run check:dossier
import { renderToBuffer, Font } from "@react-pdf/renderer";
import React from "react";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

// The document module registers the fonts from /fonts, which only a browser can fetch.
// Here they are read from disk, and the registration below comes first so it wins.
// The italic source is needed as well: the muted style asks for an italic face, and
// react-pdf matches a font on fontStyle AND fontWeight.
Font.register({
  family: "Noto Sans",
  fonts: [
    { src: path.join(root, "public/fonts/NotoSans-Regular.ttf"), fontWeight: 400 },
    { src: path.join(root, "public/fonts/NotoSans-Bold.ttf"), fontWeight: 700 },
    { src: path.join(root, "public/fonts/NotoSans-Regular.ttf"), fontStyle: "italic", fontWeight: 400 },
  ],
});

const { DisposalDossierDocument } = await import(
  "../src/pages/inventory/scrap/components/dossier-document.tsx"
);

const report = {
  scrapCode: "SCRAP-2026-00001",
  businessName: "Cong ty TNHH My pham Viet Huong",
  businessAddress: "123 Le Loi, Quan 1, TP. Ho Chi Minh",
  step1_council: { leader: "Nguyen Van An", accountant: "Tran Thi Bich", createdDate: "2026-11-20T08:00:00Z" },
  step2_inspection: {
    productName: "Sua rua mat duong da nhat cam",
    sku: "SKU-1",
    lotNumber: "LOT-2026-01",
    expiryDate: "2026-10-15T00:00:00Z",
    quantity: 100,
    unitCost: 50000,
    totalValue: 5000000,
    condition: "QUARANTINED",
    createdDate: "2026-11-20T08:00:00Z",
  },
  step3_decision: {
    causeCode: "EXPIRED",
    disposalMethod: "CONTRACTOR",
    disposalLocation: "Cong ty CP Xu ly moi truong Tan Phu",
    approvedBy: "Le Thi Cuong",
    approvedDate: "2026-11-21T14:00:00Z",
    witnesses: ["Nguyen Van An", "Tran Thi Bich"],
  },
  step4_execution: { status: "Da ghi nhan phuong thuc tieu huy: CONTRACTOR" },
  step5_disposal: { actualDate: "2026-11-22T10:30:00Z", confirmedBy: "Le Thi Cuong" },
  step6_archive_bangke: {
    bangKeXuatNhapTon: [
      { date: "2026-11-15T00:00:00Z", transactionType: "PURCHASE_RECEIPT", quantity: 100, unitCost: 50000, totalValue: 5000000, note: "PURCHASE_RECEIPT:pr-1" },
      { date: "2026-11-22T00:00:00Z", transactionType: "SCRAP_DISPOSAL", quantity: -100, unitCost: 50000, totalValue: -5000000, note: "SCRAP_ORDER:so-1" },
    ],
  },
  tax_fields: {
    totalLossValue: 5000000,
    compensatedAmount: 1000000,
    deductibleLoss: 4000000,
    taxLegislation: "Thong tu 96/2015 sua doi Thong tu 78/2014/TT-BTC",
  },
};

const buffer = await renderToBuffer(React.createElement(DisposalDossierDocument, { report }));
const out = path.join(root, "dossier-check.pdf");
fs.writeFileSync(out, buffer);
console.log("PDF written:", out, buffer.length, "bytes");
console.log("Header:", buffer.subarray(0, 8).toString());

// The dossier of a freshly approved order has no recorded cause, no disposal method and no
// witnesses yet, so every one of those cells falls back to the muted "Chưa ghi nhận" text.
// That fallback uses an italic face, which used to throw "Could not resolve font for Noto Sans"
// and made the PDF fail for every approved scrap order. Rendering the cleared report here
// keeps that path covered.
const clearedReport = {
  ...report,
  step1_council: { ...report.step1_council, accountant: null },
  step3_decision: {
    ...report.step3_decision,
    causeCode: null,
    disposalMethod: null,
    disposalLocation: null,
    witnesses: [],
  },
  step5_disposal: { ...report.step5_disposal, actualDate: null },
  step6_archive_bangke: { bangKeXuatNhapTon: [] },
};

const clearedBuffer = await renderToBuffer(
  React.createElement(DisposalDossierDocument, { report: clearedReport }),
);
console.log("PDF with missing dossier fields:", clearedBuffer.length, "bytes");
console.log("Header:", clearedBuffer.subarray(0, 8).toString());

// The document is checked on the element tree rather than on the PDF bytes: no PDF text
// extractor is available here, and the tree is what decides what gets printed.
// A function component is called so its own markup is part of the tree; the react-pdf
// primitives are left alone because their children already carry the text.
function collectText(node, out = []) {
  if (node === null || node === undefined || typeof node === "boolean") return out;
  if (typeof node === "string" || typeof node === "number") {
    out.push(String(node));
    return out;
  }
  if (Array.isArray(node)) {
    for (const child of node) collectText(child, out);
    return out;
  }
  if (typeof node.type === "function") {
    try {
      collectText(node.type(node.props), out);
    } catch {
      // A component that cannot run outside the renderer simply contributes no text.
    }
    return out;
  }
  if (node.props) {
    collectText(node.props.children, out);
  }
  return out;
}

const text = collectText(React.createElement(DisposalDossierDocument, { report })).join("\n");

// The cause, the method, the location and the council members are all part of the dossier, so the
// tax file carries the whole of step 3.
for (const label of [
  "Nguyên nhân (mã)",
  "Phương thức tiêu hủy",
  "Địa điểm tiêu hủy",
  "Thành viên hội đồng",
]) {
  assert.ok(text.includes(label), `The dossier must print "${label}".`);
}
// Step 2 states the condition of the goods. The cause of the loss is printed once, in step 3,
// so the old label must not come back and print the same thing a second time.
assert.ok(text.includes("Tình trạng hàng hóa"), 'The dossier must print "Tình trạng hàng hóa".');
assert.ok(
  !text.includes("Nguyên nhân hư hỏng"),
  'The dossier must not print "Nguyên nhân hư hỏng" in step 2.',
);
// The free-text reason said the same thing as the cause code, so it is gone: the dossier states
// the cause once, and nowhere else repeats it.
assert.ok(!text.includes("Lý do hủy hàng"), 'The dossier must not print "Lý do hủy hàng" any more.');
console.log(
  "The dossier prints the cause, the method, the location and the council members, and the condition of the goods only once.",
);
