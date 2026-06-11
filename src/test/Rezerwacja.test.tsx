import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '@/lib/types';
import Rezerwacja from '@/pages/Rezerwacja';
import { renderWithProviders } from './test-utils';

const SELECTED_DATE = new Date(2030, 5, 14);
const SUNDAY = new Date(2030, 5, 16);

const apiMocks = vi.hoisted(() => ({
  createAppointmentInquiry: vi.fn(),
  getAvailability: vi.fn(),
}));

const toastMocks = vi.hoisted(() => ({
  error: vi.fn(),
}));

vi.mock('@/lib/bookingApi', async () => {
  const actual = await vi.importActual<typeof import('@/lib/bookingApi')>(
    '@/lib/bookingApi',
  );
  return {
    ...actual,
    createAppointmentInquiry: apiMocks.createAppointmentInquiry,
    getAvailability: apiMocks.getAvailability,
  };
});

vi.mock('sonner', () => ({
  toast: {
    error: toastMocks.error,
  },
}));

vi.mock('@/components/ui/calendar', () => ({
  Calendar: ({
    disabled,
    onSelect,
  }: {
    disabled?: (date: Date) => boolean;
    onSelect?: (date: Date) => void;
  }) => (
    <div>
      <button
        type="button"
        disabled={disabled?.(SELECTED_DATE)}
        onClick={() => onSelect?.(SELECTED_DATE)}
      >
        Wybierz 14 czerwca
      </button>
      <button
        type="button"
        disabled={disabled?.(SUNDAY)}
        onClick={() => onSelect?.(SUNDAY)}
      >
        Wybierz niedzielę
      </button>
    </div>
  ),
}));

describe('Rezerwacja', () => {
  let desc: HTMLMetaElement;
  let canonical: HTMLLinkElement;
  let anchorClick: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    sessionStorage.clear();
    apiMocks.getAvailability.mockReset();
    apiMocks.createAppointmentInquiry.mockReset();
    toastMocks.error.mockReset();
    apiMocks.getAvailability.mockResolvedValue({
      date: '2030-06-14',
      timezone: 'Europe/Warsaw',
      open: '10:00',
      close: '11:00',
      slots: ['10:30'],
    });
    apiMocks.createAppointmentInquiry.mockResolvedValue({
      id: 'appointment-123',
      status: 'zapytanie',
      lookup_token: 'private-lookup-token',
      message: 'Appointment inquiry created.',
    });
    anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    desc = document.createElement('meta');
    desc.name = 'description';
    desc.content = 'Dr Koło — profesjonalny serwis rowerowy w Gdańsku i Kartuzach.';
    document.head.appendChild(desc);

    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = 'https://drkolo.pl/';
    document.head.appendChild(canonical);
  });

  afterEach(() => {
    anchorClick.mockRestore();
    desc.remove();
    canonical.remove();
    document.title = '';
  });

  it('sets booking metadata', () => {
    renderWithProviders(<Rezerwacja />);

    expect(document.title).toBe('Umów wizytę — Dr Koło: Serwis Rowerowy Gdańsk');
    expect(
      document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    ).toBe('https://drkolo.pl/rezerwacja');
    expect(
      document.querySelector('meta[name="description"]')?.getAttribute('content'),
    ).toContain('Zarezerwuj termin');
  });

  it('keeps Sundays disabled without fetching every calendar day', () => {
    renderWithProviders(<Rezerwacja />);

    expect(
      screen.getByRole('button', { name: 'Wybierz niedzielę' }),
    ).toBeDisabled();
    expect(apiMocks.getAvailability).not.toHaveBeenCalled();
  });

  it('loads availability after date selection and uses returned slots', async () => {
    renderWithProviders(<Rezerwacja />);

    fireEvent.click(screen.getByRole('button', { name: 'Wybierz 14 czerwca' }));
    await waitFor(() => {
      expect(apiMocks.getAvailability).toHaveBeenCalledWith('2030-06-14');
    });
    fireEvent.click(screen.getByRole('button', { name: /Dalej/i }));

    expect(await screen.findByRole('button', { name: '10:00' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '10:30' })).toBeEnabled();
  });

  it('creates an inquiry with seven fields, stores the token, and confirms a callback', async () => {
    renderWithProviders(<Rezerwacja />);
    await reachSummary();

    fireEvent.click(screen.getByRole('button', { name: 'Wyślij zapytanie' }));

    await waitFor(() => {
      expect(apiMocks.createAppointmentInquiry).toHaveBeenCalledWith({
        date: '2030-06-14',
        time: '10:30',
        customer_name: 'Jan',
        customer_phone: '600123456',
        bike_manufacturer: 'Trek',
        bike_model: 'Fuel EX',
        service_note: 'Pełny serwis',
      });
    });
    expect(
      sessionStorage.getItem('drkolo_booking_appointment-123'),
    ).toBe('private-lookup-token');
    expect(await screen.findByText('Zapytanie utworzone!')).toBeInTheDocument();
    expect(screen.getByText(/serwis zadzwoni/i)).toBeInTheDocument();
    expect(screen.queryByText('private-lookup-token')).not.toBeInTheDocument();
  });

  it('returns to slot selection and refetches after a slot conflict', async () => {
    apiMocks.createAppointmentInquiry.mockRejectedValueOnce(
      new ApiClientError(409, 'SLOT_TAKEN', 'Slot taken'),
    );
    renderWithProviders(<Rezerwacja />);
    await reachSummary();

    fireEvent.click(screen.getByRole('button', { name: 'Wyślij zapytanie' }));

    expect(await screen.findByText(/O której będziesz/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(apiMocks.getAvailability).toHaveBeenCalledTimes(2);
    });
    expect(toastMocks.error).toHaveBeenCalledWith(
      'Ten termin został właśnie zajęty. Wybierz inną godzinę.',
    );
  });
});

async function reachSummary() {
  fireEvent.click(screen.getByRole('button', { name: 'Wybierz 14 czerwca' }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/i }));
  fireEvent.click(await screen.findByRole('button', { name: '10:30' }));
  fireEvent.click(screen.getByRole('button', { name: /Dalej/i }));

  fireEvent.change(screen.getByPlaceholderText('Jan'), {
    target: { value: 'Jan' },
  });
  fireEvent.change(screen.getByPlaceholderText('600 123 456'), {
    target: { value: '600123456' },
  });
  fireEvent.change(screen.getByPlaceholderText('np. Trek'), {
    target: { value: 'Trek' },
  });
  fireEvent.change(screen.getByPlaceholderText('np. Fuel EX'), {
    target: { value: 'Fuel EX' },
  });
  fireEvent.change(screen.getByPlaceholderText(/Opisz problem/i), {
    target: { value: 'Pełny serwis' },
  });
  fireEvent.click(screen.getByRole('button', { name: /Dalej/i }));
}
