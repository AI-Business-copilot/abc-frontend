import { useState } from "react";

import { ImageViewer } from "@/components/common/image-viewer";
import type { ScrapImage } from "@/types/scrap";
import { formatDateTime } from "./scrap-ui";

/**
 * Evidence photos of one scrap order. Read-only: photos are created with the order and cannot be changed.
 */
export function ScrapGallery({
  images,
  onImageError,
}: {
  images: ScrapImage[];
  /** Called when a signed link fails to load (most likely expired) so the page can fetch fresh links. */
  onImageError: () => void;
}) {
  const [viewing, setViewing] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {images.length === 0 ? (
        <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
          Phiếu này chưa có ảnh bằng chứng.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image, index) => (
            <li className="overflow-hidden rounded-xl border border-slate-200 bg-white" key={image.id}>
              {image.url ? (
                <button
                  aria-label="Phóng to ảnh"
                  className="block aspect-[4/3] w-full bg-slate-100"
                  onClick={() => setViewing(index)}
                  type="button"
                >
                  <img
                    alt="Ảnh bằng chứng"
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
                <p className="text-xs text-slate-500">
                  {image.uploadedByName} · {formatDateTime(image.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {viewing !== null && (
        <ImageViewer
          alt="Ảnh bằng chứng"
          images={images.map((image) => ({
            id: image.id,
            url: image.url ?? null,
            caption: `${image.uploadedByName} · ${formatDateTime(image.createdAt)}`,
          }))}
          index={viewing}
          onClose={() => setViewing(null)}
          onImageError={onImageError}
          onIndexChange={setViewing}
        />
      )}
    </div>
  );
}
