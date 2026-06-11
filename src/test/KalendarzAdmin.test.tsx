import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '@/lib/types';
import KalendarzAdmin from '@/pages/KalendarzAdmin';
import { renderWithProviders } from './test-utils';

const CALENDAR_SESSION_KEY = 'calendar_admin_session';
const NEW_MANUAL_DATE = new Date(2030, 5, 15);

const apiMocks = vi.hoisted(() => ({
  createBlockedTime: vi.fn(),
  createManualAppointment: vi.fn(),
  deleteBlockedTime: vi.fn(),
  getAppointmentsByDate: vi.fn(),
  getBlockedTimes: vi.fn(),
  getPendingAppointments: vi.fn(),
  getWorkingHours: vi.fn(),
  updateAppointment: vi.fn(),
  updateWorkingHours: vi.fn(),
  verifyCalendarPassword: vi.fn(),
}));

vi.mock('@/lib/calendarAdminApi', async () => {
  const actual = await vi.importActual<typeof import('@/lib/calendarAdminApi')>(
    '@/lib/calendarAdminApi',
  );
  return { ...actual, ...apiMocks };
});

vi.mock('@/components/ui/calendar', () => ({
  Calendar: ({
    className,
    onSelect,
  }: {
    className?: string;
    onSelect?: (date: Date) => void;
  }) => className?.includes('rounded-md') ? (
    <button
      type="button"
      onClick={() => onSelect?.(NEW_MANUAL_DATE)}
    >
      Zmień datę ręcznej wizyty
    </button>
  ) : <div data-testid="calendar" />,
}));

beforeEach(() => {
  sessionStorage.clear();
  vi.stubEnv('VITE_CREATION_PASSWORD', 'legacy-secret');
  Object.values(apiMocks).forEach((mock) => mock.mockReset());
  apiMocks.getWorkingHours.mockResolvedValue([]);
  apiMocks.getAppointmentsByDate.mockResolvedValue([]);
  apiMocks.getBlockedTimes.mockResolvedValue([]);
  apiMocks.getPendingAppointments.mockResolvedValue([]);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('KalendarzAdmin authentication', () => {
  it('shows async login progress and loads protected data only after verification', async () => {
    let resolveVerification!: (value: boolean) => void;
    apiMocks.verifyCalendarPassword.mockReturnValue(
      new Promise<boolean>((resolve) => {
        resolveVerification = resolve;
      }),
    );
    renderWithProviders(<KalendarzAdmin />);

    fireEvent.change(screen.getByPlaceholderText('Hasło'), {
      target: { value: 'server-secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Zaloguj' }));

    expect(
      screen.getByRole('button', { name: 'Sprawdzanie...' }),
    ).toBeDisabled();
    expect(apiMocks.getWorkingHours).not.toHaveBeenCalled();
    expect(apiMocks.getAppointmentsByDate).not.toHaveBeenCalled();
    expect(apiMocks.getBlockedTimes).not.toHaveBeenCalled();
    expect(apiMocks.getPendingAppointments).not.toHaveBeenCalled();

    await act(async () => resolveVerification(true));

    expect(
      await screen.findByText('Kalendarz Serwisu'),
    ).toBeInTheDocument();
    expect(sessionStorage.getItem(CALENDAR_SESSION_KEY)).toBe('server-secret');
    await waitFor(() => {
      expect(apiMocks.getWorkingHours).toHaveBeenCalledWith('server-secret');
      expect(apiMocks.getPendingAppointments).toHaveBeenCalledWith(
        'server-secret',
      );
      expect(apiMocks.getAppointmentsByDate).toHaveBeenCalled();
      expect(apiMocks.getBlockedTimes).toHaveBeenCalled();
    });
  });

  it('shows a wrong-password error without storing the password', async () => {
    apiMocks.verifyCalendarPassword.mockRejectedValue(
      new ApiClientError(401, 'UNAUTHORIZED', 'Unauthorized'),
    );
    renderWithProviders(<KalendarzAdmin />);

    fireEvent.change(screen.getByPlaceholderText('Hasło'), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Zaloguj' }));

    expect(
      await screen.findByText('Nieprawidłowe hasło'),
    ).toBeInTheDocument();
    expect(apiMocks.verifyCalendarPassword).toHaveBeenCalledWith('wrong');
    expect(sessionStorage.getItem(CALENDAR_SESSION_KEY)).toBeNull();
    expect(apiMocks.getWorkingHours).not.toHaveBeenCalled();
  });

  it('verifies a stored session before rendering or fetching calendar data', async () => {
    sessionStorage.setItem(CALENDAR_SESSION_KEY, 'stored-secret');
    let resolveVerification!: (value: boolean) => void;
    apiMocks.verifyCalendarPassword.mockReturnValue(
      new Promise<boolean>((resolve) => {
        resolveVerification = resolve;
      }),
    );
    renderWithProviders(<KalendarzAdmin />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Sprawdzanie sesji',
    );
    expect(apiMocks.getWorkingHours).not.toHaveBeenCalled();

    await act(async () => resolveVerification(true));

    expect(
      await screen.findByText('Kalendarz Serwisu'),
    ).toBeInTheDocument();
    expect(apiMocks.verifyCalendarPassword).toHaveBeenCalledWith(
      'stored-secret',
    );
    await waitFor(() => {
      expect(apiMocks.getWorkingHours).toHaveBeenCalledWith('stored-secret');
    });
  });

  it('clears the password field and requires typing again after logout', async () => {
    apiMocks.verifyCalendarPassword.mockResolvedValue(true);
    renderWithProviders(<KalendarzAdmin />);

    fireEvent.change(screen.getByPlaceholderText('Hasło'), {
      target: { value: 'server-secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Zaloguj' }));
    await screen.findByText('Kalendarz Serwisu');

    fireEvent.click(screen.getByRole('button', { name: 'Wyloguj' }));

    const passwordInput = screen.getByPlaceholderText('Hasło');
    expect(passwordInput).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Zaloguj' })).toBeDisabled();
    expect(apiMocks.verifyCalendarPassword).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(CALENDAR_SESSION_KEY)).toBeNull();
  });
});

describe('KalendarzAdmin query states', () => {
  it('shows loading without presenting a closed or empty day', async () => {
    apiMocks.verifyCalendarPassword.mockResolvedValue(true);
    apiMocks.getWorkingHours.mockReturnValue(new Promise(() => undefined));
    renderWithProviders(<KalendarzAdmin />);

    await login();

    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
    expect(screen.queryByText('Brak wizyt w tym dniu.')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Serwis jest nieczynny w ten dzień.'),
    ).not.toBeInTheDocument();
  });

  it('shows a useful day error and retries failed queries', async () => {
    apiMocks.verifyCalendarPassword.mockResolvedValue(true);
    apiMocks.getWorkingHours.mockResolvedValue(allWorkingHours);
    apiMocks.getAppointmentsByDate.mockRejectedValue(
      new Error('appointments failed'),
    );
    renderWithProviders(<KalendarzAdmin />);

    await login();

    expect(
      await screen.findByRole('alert', {
        name: 'Błąd danych wybranego dnia',
      }),
    ).toHaveTextContent('Nie udało się pobrać danych wybranego dnia');
    expect(screen.queryByText('Brak wizyt w tym dniu.')).not.toBeInTheDocument();

    apiMocks.getAppointmentsByDate.mockResolvedValue([]);
    fireEvent.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }));

    await waitFor(() => {
      expect(apiMocks.getAppointmentsByDate.mock.calls.length)
        .toBeGreaterThan(1);
    });
  });

  it('clears the manual time and waits for the new date data', async () => {
    apiMocks.verifyCalendarPassword.mockResolvedValue(true);
    apiMocks.getWorkingHours.mockResolvedValue(allWorkingHours);
    const appointmentsDeferred = deferred<unknown[]>();
    const blockedDeferred = deferred<unknown[]>();
    apiMocks.getAppointmentsByDate.mockImplementation((date: string) => (
      date === '2030-06-15'
        ? appointmentsDeferred.promise
        : Promise.resolve([])
    ));
    apiMocks.getBlockedTimes.mockImplementation((date: string) => (
      date === '2030-06-15'
        ? blockedDeferred.promise
        : Promise.resolve([])
    ));
    renderWithProviders(<KalendarzAdmin />);
    await login();

    fireEvent.mouseDown(
      screen.getByRole('tab', { name: /Dodaj z telefonu/i }),
      { button: 0, ctrlKey: false },
    );
    await screen.findByText('Dodaj wizytę ręcznie');
    const fields = screen.getAllByRole('textbox');
    for (const [field, value] of [
      [fields[0], 'Jan'],
      [fields[1], '600123456'],
      [fields[2], 'Trek'],
      [fields[3], 'Fuel EX'],
    ] as const) {
      fireEvent.change(field, { target: { value } });
    }
    fireEvent.click(await screen.findByRole('button', { name: '23:00' }));
    expect(
      screen.getByRole('button', { name: 'Zapisz i zablokuj termin' }),
    ).toBeEnabled();

    fireEvent.click(
      screen.getByRole('button', { name: 'Zmień datę ręcznej wizyty' }),
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Ładowanie dostępnych godzin',
    );
    expect(
      screen.getByRole('button', { name: 'Zapisz i zablokuj termin' }),
    ).toBeDisabled();

    await act(async () => appointmentsDeferred.resolve([]));
    expect(screen.getByRole('status')).toBeInTheDocument();

    await act(async () => blockedDeferred.resolve([]));
    await screen.findByRole('button', { name: '23:00' });
    expect(
      screen.getByRole('button', { name: 'Zapisz i zablokuj termin' }),
    ).toBeDisabled();
  });

  it('logs out and explains when a protected request reports an expired session', async () => {
    apiMocks.verifyCalendarPassword.mockResolvedValue(true);
    apiMocks.getWorkingHours.mockResolvedValue(allWorkingHours);
    const appointmentsDeferred = deferred<unknown[]>();
    apiMocks.getAppointmentsByDate.mockReturnValue(
      appointmentsDeferred.promise,
    );
    renderWithProviders(<KalendarzAdmin />);
    await login();

    await act(async () => appointmentsDeferred.reject(
      new ApiClientError(401, 'UNAUTHORIZED', 'Unauthorized'),
    ));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Sesja wygasła. Zaloguj się ponownie.',
    );
    expect(screen.getByPlaceholderText('Hasło')).toHaveValue('');
    expect(sessionStorage.getItem(CALENDAR_SESSION_KEY)).toBeNull();
  });
});

async function login() {
  fireEvent.change(screen.getByPlaceholderText('Hasło'), {
    target: { value: 'server-secret' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Zaloguj' }));
  await screen.findByText('Kalendarz Serwisu');
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((next, fail) => {
    resolve = next;
    reject = fail;
  });
  return { promise, reject, resolve };
}

const allWorkingHours = Array.from({ length: 7 }, (_, day) => ({
  id: `hours-${day}`,
  day_of_week: day,
  open_time: '23:00:00',
  close_time: '23:30:00',
  is_open: true,
}));
