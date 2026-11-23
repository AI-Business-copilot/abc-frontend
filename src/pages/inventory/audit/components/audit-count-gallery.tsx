import { useState } from 'react';
import { useAuditCountImages } from '../hooks/use-audit-count-images';
import { ImageViewer } from '../../../../components/common/image-viewer';
import type { AuditItemCountImage } from '../../../../types/audit';

const formatDateTime = (value?: string | Date | null) =>
  value ? new Date(value).toLocaleString('vi-VN') : '—';

/**
 * The evidence photos one counter took of the broken goods.
 *
 * The photos belong to the count, so the owner sees each counter's own set side by side. The
 * signed links expire after a few minutes, so they are fetched separately and refreshed when
 * one fails to load.
 */
export function AuditCountGallery({
  auditId,
  itemId,
  countId,
  images: knownImages,
}: {
  auditId: string;
  itemId: string;
  countId: string;
  /** The photos from the item payload. Used to know there are photos before the links load. */
  images?: AuditItemCountImage[];
}) {
  const { images, refetch } = useAuditCountImages(auditId, itemId, countId);
  const [viewing, setViewing] = useState<number | null>(null);

  // Until the signed links arrive, fall back to the metadata from the item payload.
  const list = images.length > 0 ? images : (knownImages ?? []);

  if (list.length === 0) return null;

  return (
    <div className="space-y-2">
      <ul className="grid grid-cols-3 gap-2">
        {list.map((image, index) => (
          <li
            className="overflow-hidden rounded-lg border border-gray-200 bg-white"
            key={image.id}
          >
            {image.url ? (
              <button
                aria-label="Phóng to ảnh"
                className="block aspect-[4/3] w-full bg-gray-100"
                onClick={() => setViewing(index)}
                type="button"
              >
                <img
                  alt="Ảnh bằng chứng hàng hỏng"
                  className="h-full w-full object-cover"
                  onError={refetch}
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

      {viewing !== null && (
        <ImageViewer
          alt="Ảnh bằng chứng hàng hỏng"
          images={list.map((image) => ({
            id: image.id,
            url: image.url ?? null,
            caption: `${image.uploadedByName} · ${formatDateTime(image.createdAt)}`,
          }))}
          index={viewing}
          onClose={() => setViewing(null)}
          onImageError={refetch}
          onIndexChange={setViewing}
        />
      )}
    </div>
  );
}
