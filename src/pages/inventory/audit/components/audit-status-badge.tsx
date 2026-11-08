
import type { AuditStatus } from '../../../../types/audit';

interface AuditStatusBadgeProps {
  status: AuditStatus;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<
  AuditStatus,
  { label: string; bgColor: string; textColor: string }
> = {  IN_PROGRESS: {
    label: 'Đang thực hiện',
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-800',
  },
  PENDING_APPROVAL: {
    label: 'Chờ duyệt',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-800',
  },
  DONE: {
    label: 'Hoàn thành',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
  },
};

export const AUDIT_STATUS_LABELS: Record<AuditStatus, string> = {
  IN_PROGRESS: statusConfig.IN_PROGRESS.label,
  PENDING_APPROVAL: statusConfig.PENDING_APPROVAL.label,
  DONE: statusConfig.DONE.label,
};

const sizeConfig = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base',
};

export function AuditStatusBadge({ status, size = 'md' }: AuditStatusBadgeProps) {
  const config = statusConfig[status];
  const sizeClass = sizeConfig[size];

  return (
    <span className={`inline-block rounded-full font-medium ${config.bgColor} ${config.textColor} ${sizeClass}`}>
      {config.label}
    </span>
  );
}
