import { useRef, useState } from "react";

import { scrapApi } from "@/api/scrap";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  ALLOWED_SCRAP_IMAGE_TYPES,
  MAX_SCRAP_IMAGES,
  MAX_SCRAP_IMAGE_BYTES,
  type ScrapImage,
} from "@/types/scrap";
import { formatDateTime } from "./scrap-ui";

/**
 * Evidence photos of one scrap order. The creating staff member can add, annotate and delete
 * photos while the order is PENDING (canEdit). Everyone else, including the Owner, only views.
 */
export function ScrapGallery({
  orderId,
  images,
  canEdit,
  onChanged,
  onImageError,
}: {
  orderId: string;
  images: ScrapImage[];
  canEdit: boolean;
  /** Called after an upload, note change or delete so the page can reload the order. */
  onChanged: () => Promise<void> | void;
  /** Called when a signed link fails to load (most likely expired) so the page can fetch fresh links. */
  onImageError: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState("");
  const [zoom, setZoom] = useState<ScrapImage | null>(null);

  const full = images.length >= MAX_SCRAP_IMAGES;

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);

    const chosen = Array.from(files);
    const room = MAX_SCRAP_IMAGES - images.length;
    if (chosen.length > room) {
      setError(`Mỗi phiếu có tối đa ${MAX_SCRAP_IMAGES} ảnh. Bạn chỉ có thể thêm ${room} ảnh nữa.`);
      return;
    }
    for (const file of chosen) {
      if (!ALLOWED_SCRAP_IMAGE_TYPES.includes(file.type)) {
        setError(`"${file.name}" không hợp lệ. Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.`);
        return;
      }
      if (file.size > MAX_SCRAP_IMAGE_BYTES) {
        setError(`"${file.name}" lớn hơn 5 MB.`);
        return;
      }
    }

    setBusy(true);
    try {
      // One at a time: the server re-checks the 10-photo cap under a lock for each upload.
      for (const file of chosen) {
        await scrapApi.uploadScrapImage(orderId, file, note);
      }
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải ảnh lên.");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
      setBusy(false);
      await onChanged();
    }
  };

  const saveNote = async (image: ScrapImage) => {
    setBusy(true);
    setError(null);
    try {
      await scrapApi.updateScrapImageNote(image.id, editNote.trim() || null);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu ghi chú.");
    } finally {
      setBusy(false);
      await onChanged();
    }
  };

  const remove = async (image: ScrapImage) => {
    if (!window.confirm("Xóa ảnh này khỏi phiếu hủy?")) return;
    setBusy(true);
    setError(null);
    try {
      await scrapApi.deleteScrapImage(image.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa ảnh.");
    } finally {
      setBusy(false);
      await onChanged();
    }
  };

  return (
    <div className="space-y-4">
      {error && <Alert variant="destructive">{error}</Alert>}

      {canEdit && (
        <div className="rounded-xl border border-dashed border-slate-300 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              accept={ALLOWED_SCRAP_IMAGE_TYPES.join(",")}
              aria-label="Chọn ảnh bằng chứng"
              className="hidden"
              disabled={busy || full}
              multiple
              onChange={(event) => void upload(event.target.files)}
              ref={fileInput}
              type="file"
            />
            <Button disabled={busy || full} onClick={() => fileInput.current?.click()} type="button">
              {busy && <Spinner className="h-4 w-4" />}Thêm ảnh
            </Button>
            <input
              aria-label="Ghi chú cho ảnh sắp tải lên"
              className="h-11 min-w-56 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              disabled={busy || full}
              maxLength={500}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ghi chú cho ảnh (không bắt buộc)"
              value={note}
            />
            <span className="text-xs text-slate-500">
              {images.length}/{MAX_SCRAP_IMAGES} ảnh · JPEG, PNG, WebP · tối đa 5 MB
            </span>
          </div>
        </div>
      )}

      {images.length === 0 ? (
        <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
          Phiếu này chưa có ảnh bằng chứng.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image) => (
            <li className="overflow-hidden rounded-xl border border-slate-200 bg-white" key={image.id}>
              {image.url ? (
                <button
                  aria-label="Phóng to ảnh"
                  className="block aspect-[4/3] w-full bg-slate-100"
                  onClick={() => setZoom(image)}
                  type="button"
                >
                  <img
                    alt={image.note || "Ảnh bằng chứng"}
                    className="h-full w-full object-cover"
                    onError={onImageError}
                    src={image.url}
                  />
                </button>
              ) : (
                <div className="grid aspect-[4/3] place-items-center bg-slate-100 text-sm text-slate-500">
                  Không tải được ảnh
                </div>
              )}
              <div className="space-y-2 p-3 text-sm">
                {editingId === image.id ? (
                  <div className="space-y-2">
                    <input
                      aria-label="Ghi chú ảnh"
                      className="h-10 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-violet-400"
                      maxLength={500}
                      onChange={(event) => setEditNote(event.target.value)}
                      value={editNote}
                    />
                    <div className="flex gap-2">
                      <Button disabled={busy} onClick={() => void saveNote(image)} size="sm" type="button">Lưu</Button>
                      <Button disabled={busy} onClick={() => setEditingId(null)} size="sm" type="button" variant="outline">Hủy</Button>
                    </div>
                  </div>
                ) : (
                  <p className={image.note ? "text-slate-800" : "text-slate-400"}>{image.note || "Không có ghi chú"}</p>
                )}
                <p className="text-xs text-slate-500">
                  {image.uploadedByName} · {formatDateTime(image.createdAt)}
                </p>
                {canEdit && editingId !== image.id && (
                  <div className="flex gap-2">
                    <Button
                      disabled={busy}
                      onClick={() => {
                        setEditingId(image.id);
                        setEditNote(image.note ?? "");
                      }}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      Sửa ghi chú
                    </Button>
                    <Button disabled={busy} onClick={() => void remove(image)} size="sm" type="button" variant="destructive">
                      Xóa
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {zoom?.url && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-900/80 p-4"
          onClick={() => setZoom(null)}
          onKeyDown={(event) => event.key === "Escape" && setZoom(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Xem ảnh"
          tabIndex={-1}
        >
          <img alt={zoom.note || "Ảnh bằng chứng"} className="max-h-full max-w-full rounded-lg" onError={onImageError} src={zoom.url} />
        </div>
      )}
    </div>
  );
}
