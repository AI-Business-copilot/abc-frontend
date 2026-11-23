import { useState } from 'react';
import type { AuditItemCountImage } from '../../../../types/audit';

const formatDateTime = (value?: string | Date | null) =>
  value ? new Date(value).toLocaleString('vi-VN') : '—';

/**
 * The evidence photos filed under one history entry.
 *
 * The photos of a history entry already carry their signed links, because they are signed
 * together with the history itself. They are shown read-only here: a filed photo belongs to a
 * moment that has passed, so there is nothing to refresh.
 */
export function AuditHistoryGallery({
  images,
}: {
  images: AuditItemCountImage[];
}) {
  const [zoom, setZoom] = useState<AuditItemCountImage | null>(null);

  if (images.length === 0) return null;

  return (
    <div className="space-y-2">
      <ul className="grid grid-cols-3 gap-2">
        {images.map((image) => (
          <li
            className="overflow-hidden rounded-lg border border-gray-200 bg-white"
            key={image.id}
          >
            {image.url ? (
              <button
                aria-label="Phóng to ảnh"
                className="block aspect-[4/3] w-full bg-gray-100"
                onClick={() => setZoom(image)}
                type="button"
              >
                <img
                  alt="Ảnh bằng chứng hàng hỏng"
                  className="h-full w-full object-cover"
                  src={image.url}
                />
              </button>
            ) : (
              <div className="grid aspect-[4/3] place-items-center bg-gray-100 text-xs text-gray-500">
                Không tải được ảnh
              </div>
            )}
            <p className="px-2 py-1 text-[11px] text-gray-500">
              {image.uploadedByName} · {formatDateTime(image.createdAt)}
            </p>
          </li>
        ))}
      </ul>

      {zoom?.url && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-gray-900/80 p-4"
          onClick={() => setZoom(null)}
          onKeyDown={(event) => event.key === 'Escape' && setZoom(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Xem ảnh"
          tabIndex={-1}
        >
          <img
            alt="Ảnh bằng chứng hàng hỏng"
            className="max-h-full max-w-full rounded-lg"
            src={zoom.url}
          />
        </div>
      )}
    </div>
  );
}
