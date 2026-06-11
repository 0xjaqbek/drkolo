import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClientError } from '@/lib/types';
import KalendarzAdmin from '@/pages/KalendarzAdmin';
import { renderWithProviders } from './test-utils';

const CALENDAR_SESSION_KEY = 'calendar_admin_session';

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
  Calendar: () => <div data-testid="calendar" />,
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
});
