
import type { AuditStatus } from '../../../../types/audit';

interface AuditStatusBadgeProps {
  status: AuditStatus;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<
  AuditStatus,
  { label: string; bgColor: string; textColor: string }
> = {
  IN_PROGRESS: {
    label: 'In Progress',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
  },
  PENDING_APPROVAL: {
    label: 'Pending Approval',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-800',
  },
  DONE: {
    label: 'Done',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
  },
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
