import type { ZlecenieStatus } from '@/lib/types';

interface StatusBadgeProps {
  status: ZlecenieStatus;
  onStatusChange?: (status: ZlecenieStatus) => void;
}

const STATUS_CONFIG: Record<ZlecenieStatus, { label: string; className: string }> = {
  oczekuje: { label: 'Oczekuje', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  w_trakcie: { label: 'W trakcie', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  gotowe: { label: 'Gotowe', className: 'bg-green-100 text-green-700 border-green-200' },
};

const STATUS_CYCLE: Record<ZlecenieStatus, ZlecenieStatus> = {
  oczekuje: 'w_trakcie',
  w_trakcie: 'gotowe',
  gotowe: 'oczekuje',
};

export function StatusBadge({ status, onStatusChange }: StatusBadgeProps) {
  const { label, className } = STATUS_CONFIG[status];
  return (
    <button
      className={`px-4 py-2 rounded-full font-medium text-sm border ${className} ${onStatusChange ? 'cursor-pointer' : 'cursor-default'}`}
      onClick={onStatusChange ? () => onStatusChange(STATUS_CYCLE[status]) : undefined}
      disabled={!onStatusChange}
    >
      {label}
    </button>
  );
}
