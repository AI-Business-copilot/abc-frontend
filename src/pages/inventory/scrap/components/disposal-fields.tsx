import { Input } from "@/components/ui/input";
import {
  DISPOSAL_METHODS,
  SCRAP_CAUSE_CODES,
  disposalMethodLabel,
  scrapCauseCodeLabel,
  type DisposalMethod,
  type ScrapCauseCode,
} from "@/types/scrap";

const SELECT_CLASS =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#0f4c3a] focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Checks the three dossier fields before the order is sent. The server refuses an order that leaves
 * one of them out, so the dialog says it up front instead of waiting for a failed request.
 *
 * On success the checked values come back narrowed, so the caller can send them without casting.
 */
export function validateDisposalFields(
  causeCode: ScrapCauseCode | "",
  disposalMethod: DisposalMethod | "",
  disposalLocation: string,
):
  | { ok: false; error: string }
  | { ok: true; causeCode: ScrapCauseCode; disposalMethod: DisposalMethod; disposalLocation: string } {
  if (!causeCode) return { ok: false, error: "Vui lòng chọn nguyên nhân hủy hàng." };
  if (!disposalMethod) return { ok: false, error: "Vui lòng chọn phương thức tiêu hủy." };
  const location = disposalLocation.trim();
  if (!location) return { ok: false, error: "Vui lòng nhập địa điểm tiêu hủy." };
  if (location.length > 255) {
    return { ok: false, error: "Địa điểm tiêu hủy không được vượt quá 255 ký tự." };
  }
  return { ok: true, causeCode, disposalMethod, disposalLocation: location };
}

/**
 * The parts of the disposal dossier that staff state when they open a scrap order: the cause of the
 * loss, how the goods are destroyed and where. The tax rules ask for all three, so the server
 * refuses an order that leaves one of them out.
 *
 * The council members are not here: they are the approver and the staff member who wrote the
 * minutes, and the server writes them when the Owner approves the order.
 */
export function DisposalFields({
  causeCode,
  disposalLocation,
  disposalMethod,
  disabled,
  onCauseCodeChange,
  onDisposalLocationChange,
  onDisposalMethodChange,
}: {
  causeCode: ScrapCauseCode | "";
  disposalMethod: DisposalMethod | "";
  disposalLocation: string;
  disabled?: boolean;
  onCauseCodeChange: (value: ScrapCauseCode | "") => void;
  onDisposalMethodChange: (value: DisposalMethod | "") => void;
  onDisposalLocationChange: (value: string) => void;
}) {
  return (
    <div className="mt-3">
      <p className="mb-2 text-sm font-medium text-slate-700">Hồ sơ tiêu hủy</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="scrap-cause">
            Nguyên nhân
          </label>
          <select
            className={SELECT_CLASS}
            disabled={disabled}
            id="scrap-cause"
            onChange={(event) => onCauseCodeChange(event.target.value as ScrapCauseCode | "")}
            value={causeCode}
          >
            <option value="">— Chọn nguyên nhân —</option>
            {SCRAP_CAUSE_CODES.map((code) => (
              <option key={code} value={code}>{scrapCauseCodeLabel[code]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="scrap-method">
            Phương thức tiêu hủy
          </label>
          <select
            className={SELECT_CLASS}
            disabled={disabled}
            id="scrap-method"
            onChange={(event) => onDisposalMethodChange(event.target.value as DisposalMethod | "")}
            value={disposalMethod}
          >
            <option value="">— Chọn phương thức —</option>
            {DISPOSAL_METHODS.map((method) => (
              <option key={method} value={method}>{disposalMethodLabel[method]}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="scrap-location">
            Địa điểm tiêu hủy
          </label>
          <Input
            disabled={disabled}
            id="scrap-location"
            maxLength={255}
            onChange={(event) => onDisposalLocationChange(event.target.value)}
            placeholder="Ví dụ: Khu xử lý Quận 1"
            value={disposalLocation}
          />
        </div>
      </div>
    </div>
  );
}
