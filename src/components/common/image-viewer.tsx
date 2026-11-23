import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { Button } from "@/components/ui/button";

/** One photo the viewer can show. */
export interface ViewerImage {
  id: string;
  url: string | null;
  /** A label shown under the photo, usually who took it and when. */
  caption?: string;
}

interface ImageViewerProps {
  /** The photos to show, in order. */
  images: ViewerImage[];
  /** The photo shown first. */
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  /** Called when a photo fails to load, so the caller can fetch a fresh signed link. */
  onImageError?: () => void;
  alt?: string;
}

/**
 * A photo shown in the middle of the screen, over a dimmed backdrop.
 *
 * The photo is shown whole, never cropped: a tall photo is bigger than its thumbnail instead of
 * being cut off, and it never overflows the screen. The arrow keys walk through the photos of the
 * same gallery, so the owner can compare them without closing and reopening the viewer.
 *
 * It is a native dialog, so it opens in the browser's top layer. A plain overlay would be painted
 * under the gallery dialog that holds the thumbnails.
 */
export function ImageViewer({
  images,
  index,
  onIndexChange,
  onClose,
  onImageError,
  alt = "Ảnh bằng chứng",
}: ImageViewerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const image = images[index];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "ArrowRight" && index < images.length - 1) {
        onIndexChange(index + 1);
      }
      if (event.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, images.length, onIndexChange, onClose]);

  if (!image) return null;

  return (
    <dialog
      aria-label="Xem ảnh"
      className="fixed inset-0 m-0 h-full w-full max-h-none max-w-none bg-transparent p-0 backdrop:bg-slate-950/85"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={onClose}
      onClose={onClose}
      ref={dialogRef}
    >
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-4">
        {/* The photo sits in the middle and is shown whole, never cropped. Clicking it keeps the
            viewer open; clicking any empty space around it dismisses the viewer. */}
        <div
          className="flex max-h-[85vh] max-w-[90vw] items-center justify-center"
          onClick={(event) => event.stopPropagation()}
        >
          {image.url ? (
            <img
              alt={alt}
              className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
              onError={onImageError}
              src={image.url}
            />
          ) : (
            <div className="grid aspect-[4/3] w-64 place-items-center rounded-xl bg-slate-800 text-sm text-slate-300">
              Không tải được ảnh
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-1 text-center text-xs text-slate-300">
          {image.caption && <span>{image.caption}</span>}
          {images.length > 1 && (
            <span>
              {index + 1} / {images.length}
            </span>
          )}
        </div>
      </div>

      <div
        className="absolute right-4 top-4 flex items-center gap-2"
        onClick={(event) => event.stopPropagation()}
      >
        {images.length > 1 && (
          <>
            <Button
              aria-label="Ảnh trước"
              disabled={index === 0}
              onClick={() => onIndexChange(index - 1)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <ChevronLeft size={20} />
            </Button>
            <Button
              aria-label="Ảnh sau"
              disabled={index === images.length - 1}
              onClick={() => onIndexChange(index + 1)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <ChevronRight size={20} />
            </Button>
          </>
        )}
        <Button aria-label="Đóng" onClick={onClose} size="icon" type="button" variant="ghost">
          <X size={20} />
        </Button>
      </div>
    </dialog>
  );
}
