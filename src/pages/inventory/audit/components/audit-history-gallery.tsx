import { useState } from 'react';
import { Eye } from 'lucide-react';

import { Button } from '../../../../components/ui/button';
import { Modal } from '../../../../components/ui/modal';
import { ImageViewer } from '../../../../components/common/image-viewer';
import type { AuditItemCountImage, AuditItemHistoryCount } from '../../../../types/audit';

const formatDateTime = (value?: string | Date | null) =>
  value ? new Date(value).toLocaleString('vi-VN') : '—';

interface ImageGroup {
  key: string;
  name: string;
  images: AuditItemCountImage[];
}

/**
 * The evidence photos of one moment, grouped by the employee who took them.
 *
 * The counters are kept apart: each employee's photos sit under their own name, the same way
 * their numbers sit under their own row. A photo is matched to a counter by the uploader, and
 * the name comes from the history so it is the name the owner saw at that moment.
 */
function groupImages(
  images: AuditItemCountImage[],
  counts: AuditItemHistoryCount[],
): ImageGroup[] {
  const groups = new Map<string, ImageGroup>();

  // The counters come first, so the order follows the row and a counter without a photo still
  // shows the right name.
  for (const count of counts) {
    groups.set(count.counterUserId, {
      key: count.counterUserId,
      name: count.counter?.name ?? 'Người kiểm kê',
      images: [],
    });
  }

  for (const image of images) {
    const group = groups.get(image.uploadedBy);
    if (group) {
      group.images.push(image);
      continue;
    }
    groups.set(image.uploadedBy, {
      key: image.uploadedBy,
      name: image.uploadedByName || 'Người kiểm kê',
      images: [image],
    });
  }

  return [...groups.values()].filter((group) => group.images.length > 0);
}

/**
 * The evidence photos filed under one history entry.
 *
 * The photos of a history entry already carry their signed links, because they are signed
 * together with the history itself. They are shown read-only here: a filed photo belongs to a
 * moment that has passed, so there is nothing to refresh.
 *
 * The photos are kept out of the history itself: the history is a record of numbers, and a wall
 * of thumbnails would bury them. The button opens them in a dialog instead.
 */
export function AuditHistoryGallery({
  images,
  counts = [],
}: {
  images: AuditItemCountImage[];
  /** The counters of that moment, used to name the groups of photos. */
  counts?: AuditItemHistoryCount[];
}) {
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);

  if (images.length === 0) return null;

  const groups = groupImages(images, counts);
  // The viewer walks the photos in the order they are shown, so the groups stay in order.
  const flat = groups.flatMap((group) => group.images);

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" type="button" variant="outline">
        <Eye size={14} /> Xem ảnh ({images.length})
      </Button>

      <Modal onClose={() => setOpen(false)} open={open} size="wide" title="Ảnh bằng chứng">
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.key}>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">{group.name}</h3>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {group.images.map((image) => {
                  const index = flat.indexOf(image);
                  return (
                    <li
                      className="overflow-hidden rounded-lg border border-slate-200 bg-white"
                      key={image.id}
                    >
                      {image.url ? (
                        <button
                          aria-label={`Phóng to ảnh của ${group.name}`}
                          className="block aspect-[4/3] w-full bg-slate-100"
                          onClick={() => setViewing(index)}
                          type="button"
                        >
                          <img
                            alt={`Ảnh bằng chứng của ${group.name}`}
                            className="h-full w-full object-cover"
                            src={image.url}
                          />
                        </button>
                      ) : (
                        <div className="grid aspect-[4/3] place-items-center bg-slate-100 text-xs text-slate-500">
                          Không tải được ảnh
                        </div>
                      )}
                      <p className="px-2 py-1 text-[11px] text-slate-500">
                        {formatDateTime(image.createdAt)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </Modal>

      {viewing !== null && (
        <ImageViewer
          alt="Ảnh bằng chứng hàng hỏng"
          images={flat.map((image) => ({
            id: image.id,
            url: image.url ?? null,
            caption: `${image.uploadedByName} · ${formatDateTime(image.createdAt)}`,
          }))}
          index={viewing}
          onClose={() => setViewing(null)}
          onIndexChange={setViewing}
        />
      )}
    </>
  );
}
