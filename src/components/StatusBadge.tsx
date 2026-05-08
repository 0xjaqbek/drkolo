import { ChevronRight } from 'lucide-react';
import type { ZlecenieStatus } from '@/lib/types';

interface StatusBadgeProps {
  status: ZlecenieStatus;
  onStatusChange?: (status: ZlecenieStatus) => void;
}

const STATUS_CONFIG: Record<ZlecenieStatus, { label: string; className: string }> = {
  oczekuje: { label: 'Oczekuje', className: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600' },
  w_trakcie: { label: 'W trakcie', className: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800' },
  gotowe: { label: 'Gotowe', className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800' },
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
      className={`px-4 py-2 rounded-full font-medium text-sm border ${className} ${onStatusChange ? 'cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-current active:scale-95 transition-transform' : 'cursor-default opacity-70'} flex items-center gap-1`}
      onClick={onStatusChange ? () => onStatusChange(STATUS_CYCLE[status]) : undefined}
      disabled={!onStatusChange}
    >
      {label}
      {onStatusChange && <ChevronRight className="h-3 w-3 opacity-60" />}
    </button>
  );
}
