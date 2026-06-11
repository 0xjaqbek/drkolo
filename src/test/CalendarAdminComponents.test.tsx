import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { format } from 'date-fns';
import { AppointmentCard } from '@/components/AppointmentCard';
import { BlockedTimesEditor } from '@/components/BlockedTimesEditor';
import { WorkingHoursEditor } from '@/components/WorkingHoursEditor';
import type { ServiceAppointment, WorkingHours } from '@/lib/types';

const hookMocks = vi.hoisted(() => ({
  createBlockedTime: vi.fn(),
  deleteBlockedTime: vi.fn(),
  updateAppointment: vi.fn(),
  updateWorkingHours: vi.fn(),
  useBlockedTimes: vi.fn(),
  useWorkingHours: vi.fn(),
}));

vi.mock('@/hooks/useAppointments', () => ({
  useBlockedTimes: hookMocks.useBlockedTimes,
  useCreateBlockedTime: () => ({
    isPending: false,
    mutateAsync: hookMocks.createBlockedTime,
  }),
  useDeleteBlockedTime: () => ({
    isPending: false,
    mutateAsync: hookMocks.deleteBlockedTime,
  }),
  useUpdateAppointment: () => ({
    isPending: false,
    mutate: hookMocks.updateAppointment,
  }),
  useUpdateWorkingHours: () => ({
    isPending: false,
    mutateAsync: hookMocks.updateWorkingHours,
  }),
  useWorkingHours: hookMocks.useWorkingHours,
}));

beforeEach(() => {
  Object.values(hookMocks).forEach((mock) => mock.mockReset());
  hookMocks.createBlockedTime.mockResolvedValue({});
  hookMocks.updateWorkingHours.mockResolvedValue({});
  hookMocks.useBlockedTimes.mockReturnValue({
    data: [],
    isLoading: false,
  });
  hookMocks.useWorkingHours.mockReturnValue({
    data: [workingHours],
    isLoading: false,
  });
});

describe('calendar admin components', () => {
  it('updates working hours with the authenticated HH:mm API contract', async () => {
    render(<WorkingHoursEditor authenticated />);

    expect(hookMocks.useWorkingHours).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole('button', { name: 'Edytuj' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));

    await waitFor(() => {
      expect(hookMocks.updateWorkingHours).toHaveBeenCalledWith({
        id: 'hours-id',
        open_time: '08:00',
        close_time: '17:00',
        is_open: true,
      });
    });
  });

  it('loads and creates blocked times for the selected date with HH:mm values', async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    render(<BlockedTimesEditor authenticated />);

    expect(hookMocks.useBlockedTimes).toHaveBeenCalledWith(today, true);
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj blokadę' }));

    await waitFor(() => {
      expect(hookMocks.createBlockedTime).toHaveBeenCalledWith({
        block_date: today,
        start_time: '12:00',
        end_time: '13:00',
        reason: null,
      });
    });
  });

  it('updates only appointment fields supported by the protected API', () => {
    render(<AppointmentCard appointment={appointment} />);

    fireEvent.click(screen.getByRole('button', { name: 'Potwierdź' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));

    expect(hookMocks.updateAppointment).toHaveBeenCalledWith({
      id: 'appointment-id',
      estimated_duration_minutes: 60,
      technician_note: '',
      status: 'potwierdzone',
    });
  });
});

const workingHours: WorkingHours = {
  id: 'hours-id',
  day_of_week: 1,
  open_time: '08:00:00',
  close_time: '17:00:00',
  is_open: true,
};

const appointment: ServiceAppointment = {
  id: 'appointment-id',
  appointment_date: '2030-06-14',
  arrival_time: '10:30:00',
  customer_name: 'Jan',
  customer_phone: '600123456',
  bike_manufacturer: 'Trek',
  bike_model: 'Fuel EX',
  service_note: 'Pełny serwis',
  status: 'zapytanie',
  estimated_duration_minutes: 60,
  technician_note: null,
  source: 'online',
  created_at: '2030-06-01T10:00:00Z',
};
