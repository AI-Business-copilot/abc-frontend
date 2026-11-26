// Preview and download of the disposal dossier (F08).
//
// The document is generated once and used for both the preview and the download, so what the
// user sees is exactly what is saved.

import { useEffect, useState } from "react";
import { PDFViewer, pdf } from "@react-pdf/renderer";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { scrapApi } from "@/api/scrap";
import type { DisposalDossierReport } from "@/types/scrap";
import { DisposalDossierDocument } from "./dossier-document";

export function DisposalDossierPreviewModal({
  orderId,
  onClose,
}: {
  orderId: string;
  onClose: () => void;
}) {
  const [report, setReport] = useState<DisposalDossierReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    scrapApi
      .getScrapDossierReport(orderId)
      .then((data) => {
        if (!cancelled) setReport(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Không thể tải hồ sơ tiêu hủy.");
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const download = async () => {
    if (!report) return;
    setDownloading(true);
    try {
      const blob = await pdf(<DisposalDossierDocument report={report} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `bien-ban-tieu-huy-${report.scrapCode}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Không thể tạo file PDF: ${err.message}`
          : "Không thể tạo file PDF. Hãy thử lại.",
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-900/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Hồ sơ tiêu hủy hàng hóa</h2>
            {report && <p className="text-sm text-slate-600">Phiếu {report.scrapCode}</p>}
          </div>
          <div className="flex gap-2">
            <Button disabled={!report || downloading} onClick={() => void download()} type="button">
              {downloading && <Spinner className="h-4 w-4" />}
              Tải PDF
            </Button>
            <Button onClick={onClose} type="button" variant="outline">Đóng</Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-slate-100 p-4">
          {error ? (
            <Alert variant="destructive">{error}</Alert>
          ) : report ? (
            <PDFViewer className="h-full w-full" showToolbar>
              <DisposalDossierDocument report={report} />
            </PDFViewer>
          ) : (
            <div className="flex justify-center py-16">
              <Spinner className="h-8 w-8 text-[#0f4c3a]" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
