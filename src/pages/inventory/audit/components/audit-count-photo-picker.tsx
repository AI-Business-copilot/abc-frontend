import { useRef, useState } from 'react';
import { Button } from '../../../../components/ui/button';
import {
  ALLOWED_AUDIT_IMAGE_TYPES,
  MAX_AUDIT_IMAGES,
  MAX_AUDIT_IMAGE_BYTES,
} from '../../../../types/audit';

interface AuditCountPhotoPickerProps {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
  /** True when the counter found broken goods, so a photo is required. */
  required: boolean;
}

/**
 * The evidence photos of the broken goods one counter found.
 *
 * A photo is required when broken goods were counted; otherwise the counter may still add one
 * to document what they saw.
 */
export function AuditCountPhotoPicker({
  files,
  onChange,
  disabled = false,
  required,
}: AuditCountPhotoPickerProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;
    const next: File[] = [];
    for (const file of Array.from(incoming)) {
      if (!ALLOWED_AUDIT_IMAGE_TYPES.includes(file.type)) {
        setError(`${file.name}: chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.`);
        continue;
      }
      if (file.size > MAX_AUDIT_IMAGE_BYTES) {
        setError(`${file.name}: ảnh lớn hơn 5 MB.`);
        continue;
      }
      if (files.length + next.length >= MAX_AUDIT_IMAGES) {
        setError(`Một lần đếm có tối đa ${MAX_AUDIT_IMAGES} ảnh.`);
        break;
      }
      next.push(file);
    }
    if (next.length > 0) {
      setError(null);
      onChange([...files, ...next]);
    }
    // The input keeps the same files after a change, so the same file can be picked again.
    if (fileInput.current) fileInput.current.value = '';
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-gray-700">
          Ảnh bằng chứng hàng hỏng
          {required && <span className="ml-1 text-red-600">*</span>}
        </span>
        <span className="text-xs text-gray-500">
          {files.length}/{MAX_AUDIT_IMAGES} ảnh · JPEG, PNG, WebP · tối đa 5 MB
        </span>
      </div>

      {required && (
        <p className="mt-1 text-xs text-amber-700">
          Bạn đã đếm ra hàng hỏng, nên cần ít nhất một ảnh để chủ cửa hàng đối chiếu.
        </p>
      )}

      <input
        accept={ALLOWED_AUDIT_IMAGE_TYPES.join(",")}
        aria-label="Chọn ảnh bằng chứng"
        className="hidden"
        multiple
        onChange={(event) => addFiles(event.target.files)}
        ref={fileInput}
        type="file"
      />
      <Button
        className="mt-2"
        disabled={disabled || files.length >= MAX_AUDIT_IMAGES}
        onClick={() => fileInput.current?.click()}
        size="sm"
        type="button"
        variant="outline"
      >
        Thêm ảnh
      </Button>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {files.length > 0 && (
        <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-sm">
          {files.map((file, index) => (
            <li
              className="flex items-center justify-between gap-2 rounded-md bg-gray-50 px-3 py-1.5"
              key={`${file.name}-${file.lastModified}-${index}`}
            >
              <span className="truncate text-gray-700">{file.name}</span>
              <button
                aria-label={`Bỏ ảnh ${file.name}`}
                className="shrink-0 text-xs text-red-600 hover:underline disabled:opacity-50"
                disabled={disabled}
                onClick={() => onChange(files.filter((_, i) => i !== index))}
                type="button"
              >
                Bỏ
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
