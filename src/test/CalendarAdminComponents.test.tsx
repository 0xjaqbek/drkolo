import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { format } from 'date-fns';
import { AppointmentCard } from '@/components/AppointmentCard';
import { BlockedTimesEditor } from '@/components/BlockedTimesEditor';
import { WorkingHoursEditor } from '@/components/WorkingHoursEditor';
import {
  ApiClientError,
  type ServiceAppointment,
  type WorkingHours,
} from '@/lib/types';

const hookMocks = vi.hoisted(() => ({
  createBlockedTime: vi.fn(),
  deleteBlockedTime: vi.fn(),
  updateAppointment: vi.fn(),
  updateWorkingHours: vi.fn(),
  useBlockedTimes: vi.fn(),
  useUpdateAppointment: vi.fn(),
  useWorkingHours: vi.fn(),
}));

const toastMocks = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
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
  useUpdateAppointment: hookMocks.useUpdateAppointment,
  useUpdateWorkingHours: () => ({
    isPending: false,
    mutateAsync: hookMocks.updateWorkingHours,
  }),
  useWorkingHours: hookMocks.useWorkingHours,
}));

vi.mock('sonner', () => ({
  toast: toastMocks,
}));

beforeEach(() => {
  Object.values(hookMocks).forEach((mock) => mock.mockReset());
  Object.values(toastMocks).forEach((mock) => mock.mockReset());
  hookMocks.createBlockedTime.mockResolvedValue({});
  hookMocks.updateAppointment.mockResolvedValue({});
  hookMocks.updateWorkingHours.mockResolvedValue({});
  hookMocks.useBlockedTimes.mockReturnValue({
    data: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
  hookMocks.useWorkingHours.mockReturnValue({
    data: [workingHours],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
  hookMocks.useUpdateAppointment.mockReturnValue({
    isPending: false,
    mutateAsync: hookMocks.updateAppointment,
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
    expect(screen.queryByRole('button', { name: 'Zapisz' }))
      .not.toBeInTheDocument();
  });

  it('keeps working-hours editing open when saving fails', async () => {
    hookMocks.updateWorkingHours.mockRejectedValue(
      new Error('hours update failed'),
    );
    render(<WorkingHoursEditor authenticated />);

    fireEvent.click(screen.getByRole('button', { name: 'Edytuj' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));

    await waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledWith(
        'Błąd podczas zapisywania',
      );
    });
    expect(screen.getByRole('button', { name: 'Zapisz' }))
      .toBeInTheDocument();
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

  it('reschedules and confirms an appointment through the protected API', async () => {
    render(<AppointmentCard appointment={appointment} />);

    fireEvent.click(screen.getByRole('button', { name: 'Potwierdź' }));
    fireEvent.change(screen.getByLabelText('Data'), {
      target: { value: '2030-06-15' },
    });
    fireEvent.change(screen.getByLabelText('Godzina'), {
      target: { value: '11:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));

    await waitFor(() => {
      expect(hookMocks.updateAppointment).toHaveBeenCalledWith({
        id: 'appointment-id',
        appointment_date: '2030-06-15',
        arrival_time: '11:00:00',
        estimated_duration_minutes: 60,
        technician_note: '',
        status: 'potwierdzone',
      });
    });
    expect(screen.queryByRole('button', { name: 'Zapisz' }))
      .not.toBeInTheDocument();
  });

  it('omits unchanged date and time when editing a past appointment', async () => {
    render(
      <AppointmentCard
        appointment={{
          ...appointment,
          appointment_date: '2020-06-14',
          status: 'potwierdzone',
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Notatka / Czas' }));
    fireEvent.change(screen.getByPlaceholderText('Wpisz notatkę...'), {
      target: { value: 'Sprawdzono napęd' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));

    await waitFor(() => {
      expect(hookMocks.updateAppointment).toHaveBeenCalledWith({
        id: 'appointment-id',
        estimated_duration_minutes: 60,
        technician_note: 'Sprawdzono napęd',
      });
    });
  });

  it('keeps appointment editing open and reports a slot conflict', async () => {
    hookMocks.updateAppointment.mockRejectedValue(
      new ApiClientError(409, 'SLOT_TAKEN', 'Slot taken'),
    );
    render(<AppointmentCard appointment={appointment} />);

    fireEvent.click(screen.getByRole('button', { name: 'Potwierdź' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));

    await waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledWith(
        'Ten termin jest już zajęty. Wybierz inną datę lub godzinę.',
      );
    });
    expect(screen.getByRole('button', { name: 'Zapisz' }))
      .toBeInTheDocument();
  });

  it('announces working-hours loading and errors with retry', () => {
    const refetch = vi.fn();
    hookMocks.useWorkingHours.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      error: null,
      refetch,
    });
    const { rerender } = render(<WorkingHoursEditor authenticated />);

    expect(screen.getByRole('status')).toHaveTextContent('Ładowanie');

    hookMocks.useWorkingHours.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      error: new Error('hours failed'),
      refetch,
    });
    rerender(<WorkingHoursEditor authenticated />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Nie udało się pobrać godzin otwarcia',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('announces blocked-time loading and errors without showing an empty list', () => {
    const refetch = vi.fn();
    hookMocks.useBlockedTimes.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      error: null,
      refetch,
    });
    const { rerender } = render(<BlockedTimesEditor authenticated />);

    expect(screen.getByRole('status')).toHaveTextContent('Ładowanie');
    expect(
      screen.queryByText('Brak zablokowanych terminów.'),
    ).not.toBeInTheDocument();

    hookMocks.useBlockedTimes.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      error: new Error('blocks failed'),
      refetch,
    });
    rerender(<BlockedTimesEditor authenticated />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Nie udało się pobrać zablokowanych terminów',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));
    expect(refetch).toHaveBeenCalled();
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
