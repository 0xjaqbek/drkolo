import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TimelinePicker } from '@/components/TimelinePicker';
import type { ServiceAppointment, WorkingHours } from '@/lib/types';

const date = new Date(2030, 5, 14);
const workingHours: WorkingHours = {
  id: 'friday',
  day_of_week: 5,
  open_time: '10:00:00',
  close_time: '11:00:00',
  is_open: true,
};

const baseProps = {
  date,
  workingHours,
  appointments: [],
  blockedTimes: [],
  selectedTime: null,
  onSelectTime: vi.fn(),
};

describe('TimelinePicker', () => {
  it('treats availableSlots as authoritative when supplied', () => {
    const onSelectTime = vi.fn();
    render(
      <TimelinePicker
        {...baseProps}
        availableSlots={['10:30']}
        onSelectTime={onSelectTime}
      />,
    );

    expect(screen.getByRole('button', { name: '10:00' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '10:30' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: '10:30' }));
    expect(onSelectTime).toHaveBeenCalledWith('10:30');
  });

  it('keeps appointment overlap logic when availableSlots is omitted', () => {
    const appointment: ServiceAppointment = {
      id: 'appointment',
      appointment_date: '2030-06-14',
      arrival_time: '10:00:00',
      customer_name: 'Jan',
      customer_phone: '600123456',
      bike_manufacturer: 'Trek',
      bike_model: 'Fuel EX',
      service_note: null,
      status: 'potwierdzone',
      estimated_duration_minutes: 30,
      technician_note: null,
      source: 'manual',
      created_at: '2030-06-01T10:00:00Z',
    };

    render(
      <TimelinePicker
        {...baseProps}
        appointments={[appointment]}
      />,
    );

    expect(screen.getByRole('button', { name: '10:00' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '10:30' })).toBeEnabled();
  });

  it('announces loading state accessibly', () => {
    render(<TimelinePicker {...baseProps} isLoading />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Ładowanie dostępnych godzin',
    );
  });

  it('announces loading errors accessibly', () => {
    render(
      <TimelinePicker
        {...baseProps}
        error={new Error('Availability failed')}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Nie udało się pobrać dostępnych godzin',
    );
  });
});
