import { useMemo } from 'react';
import { format, parse, addMinutes, differenceInMinutes, isBefore, isAfter, startOfDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { ServiceAppointment, WorkingHours, BlockedTime } from '@/lib/types';
import { Clock } from 'lucide-react';

interface TimelinePickerProps {
  date: Date;
  workingHours: WorkingHours | undefined;
  appointments: ServiceAppointment[];
  blockedTimes: BlockedTime[];
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
  className?: string;
}

export function TimelinePicker({
  date,
  workingHours,
  appointments,
  blockedTimes,
  selectedTime,
  onSelectTime,
  className,
}: TimelinePickerProps) {
  const { openTime, closeTime, isOpen } = useMemo(() => {
    if (!workingHours || !workingHours.is_open || !workingHours.open_time || !workingHours.close_time) {
      return { openTime: null, closeTime: null, isOpen: false };
    }
    const openDate = parse(workingHours.open_time, 'HH:mm:ss', date);
    const closeDate = parse(workingHours.close_time, 'HH:mm:ss', date);
    return { openTime: openDate, closeTime: closeDate, isOpen: true };
  }, [workingHours, date]);

  const slots = useMemo(() => {
    if (!isOpen || !openTime || !closeTime) return [];
    const totalMinutes = differenceInMinutes(closeTime, openTime);
    // Generate 30-minute intervals
    const interval = 30;
    const slotsCount = Math.floor(totalMinutes / interval);
    
    return Array.from({ length: slotsCount }, (_, i) => {
      const slotTime = addMinutes(openTime, i * interval);
      const slotEndTime = addMinutes(slotTime, interval);
      
      const timeStr = format(slotTime, 'HH:mm');
      
      // Check if slot is in the past (only for today)
      const isPast = isBefore(slotTime, new Date());
      
      // Check if slot overlaps with appointments
      const overlappingAppointments = appointments.filter(app => {
        const appStart = parse(app.arrival_time, 'HH:mm:ss', date);
        const duration = app.estimated_duration_minutes || 60; // default 1h if not set
        const appEnd = addMinutes(appStart, duration);
        return isBefore(slotTime, appEnd) && isAfter(slotEndTime, appStart);
      });

      // Check if slot overlaps with blocked times
      const overlappingBlocked = blockedTimes.filter(bt => {
        const btStart = parse(bt.start_time, 'HH:mm:ss', date);
        const btEnd = parse(bt.end_time, 'HH:mm:ss', date);
        return isBefore(slotTime, btEnd) && isAfter(slotEndTime, btStart);
      });

      const isBusy = overlappingAppointments.length > 0 || overlappingBlocked.length > 0;

      return {
        timeStr,
        isPast,
        isBusy,
        appointments: overlappingAppointments,
        blocked: overlappingBlocked,
      };
    });
  }, [isOpen, openTime, closeTime, appointments, blockedTimes, date]);

  if (!isOpen) {
    return (
      <div className={cn("p-6 text-center text-muted-foreground bg-muted/50 rounded-lg border", className)}>
        Serwis jest nieczynny w ten dzień.
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>Godziny otwarcia: {format(openTime!, 'HH:mm')} - {format(closeTime!, 'HH:mm')}</span>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-background border border-border"></div>
            <span className="text-xs">Wolne</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-muted border border-border"></div>
            <span className="text-xs">Zajęte</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {slots.map((slot) => {
          const isSelected = selectedTime === slot.timeStr;
          const disabled = slot.isPast || slot.isBusy;

          return (
            <button
              key={slot.timeStr}
              type="button"
              disabled={disabled}
              onClick={() => onSelectTime(slot.timeStr)}
              className={cn(
                "py-2 px-3 text-sm font-medium rounded-md border transition-all flex items-center justify-center",
                disabled 
                  ? "bg-muted/50 text-muted-foreground/50 border-transparent cursor-not-allowed" 
                  : isSelected
                    ? "bg-accent text-accent-foreground border-accent shadow-md scale-[1.02]"
                    : "bg-background hover:border-accent hover:text-accent cursor-pointer"
              )}
            >
              {slot.timeStr}
            </button>
          );
        })}
      </div>
    </div>
  );
}
