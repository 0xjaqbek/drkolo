import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { ApiClientError } from '@/lib/types';
import {
  useAppointmentsByDate,
  useBlockedTimes,
  useCreateAppointment,
  useCreateBlockedTime,
  useDeleteBlockedTime,
  usePendingAppointments,
  useUpdateAppointment,
  useUpdateWorkingHours,
  useWorkingHours,
} from '@/hooks/useAppointments';

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
}));

const supabaseMocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('@/lib/calendarAdminApi', async () => {
  const actual = await vi.importActual<typeof import('@/lib/calendarAdminApi')>(
    '@/lib/calendarAdminApi',
  );
  return { ...actual, ...apiMocks };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: supabaseMocks.from,
  },
}));

beforeEach(() => {
  sessionStorage.clear();
  supabaseMocks.from.mockReset();
  supabaseMocks.from.mockImplementation(() => {
    const builder: Record<string, unknown> = {};
    const chain = vi.fn(() => builder);
    Object.assign(builder, {
      delete: chain,
      eq: chain,
      gte: chain,
      insert: chain,
      lte: chain,
      neq: chain,
      order: chain,
      select: chain,
      single: chain,
      update: chain,
      then: (
        resolve: (value: { data: unknown[]; error: null }) => unknown,
      ) => resolve({ data: [], error: null }),
    });
    return builder;
  });
  Object.values(apiMocks).forEach((mock) => mock.mockReset());
  apiMocks.getWorkingHours.mockResolvedValue([]);
  apiMocks.getAppointmentsByDate.mockResolvedValue([]);
  apiMocks.getBlockedTimes.mockResolvedValue([]);
  apiMocks.getPendingAppointments.mockResolvedValue([]);
  apiMocks.updateWorkingHours.mockResolvedValue({});
  apiMocks.createBlockedTime.mockResolvedValue({});
  apiMocks.deleteBlockedTime.mockResolvedValue({
    id: 'blocked-id',
    deleted: true,
  });
  apiMocks.createManualAppointment.mockResolvedValue({});
  apiMocks.updateAppointment.mockResolvedValue({});
});

describe('calendar admin queries', () => {
  it('does not issue protected requests before authentication', async () => {
    const { queryClient, wrapper } = createWrapper();
    renderHook(() => ({
      workingHours: useWorkingHours(false),
      appointments: useAppointmentsByDate('2030-06-14', false),
      blockedTimes: useBlockedTimes('2030-06-14', false),
      pending: usePendingAppointments(false),
    }), { wrapper });

    await act(async () => {
      await Promise.resolve();
    });

    expect(supabaseMocks.from).not.toHaveBeenCalled();
    expect(apiMocks.getWorkingHours).not.toHaveBeenCalled();
    expect(apiMocks.getAppointmentsByDate).not.toHaveBeenCalled();
    expect(apiMocks.getBlockedTimes).not.toHaveBeenCalled();
    expect(apiMocks.getPendingAppointments).not.toHaveBeenCalled();
    expect(queryClient.getQueryCache().getAll()).toHaveLength(4);
  });

  it('uses the protected API after authentication without putting the password in query keys', async () => {
    sessionStorage.setItem(CALENDAR_SESSION_KEY, 'server-secret');
    const { queryClient, wrapper } = createWrapper();
    renderHook(() => ({
      workingHours: useWorkingHours(true),
      appointments: useAppointmentsByDate('2030-06-14', true),
      blockedTimes: useBlockedTimes('2030-06-14', true),
      pending: usePendingAppointments(true),
    }), { wrapper });

    await waitFor(() => {
      expect(apiMocks.getWorkingHours).toHaveBeenCalledWith('server-secret');
      expect(apiMocks.getAppointmentsByDate).toHaveBeenCalledWith(
        '2030-06-14',
        'server-secret',
      );
      expect(apiMocks.getBlockedTimes).toHaveBeenCalledWith(
        '2030-06-14',
        'server-secret',
      );
      expect(apiMocks.getPendingAppointments).toHaveBeenCalledWith(
        'server-secret',
      );
    });

    expect(JSON.stringify(
      queryClient.getQueryCache().getAll().map((query) => query.queryKey),
    )).not.toContain('server-secret');
    expect(supabaseMocks.from).not.toHaveBeenCalled();
  });

  it('clears the stored calendar password after a protected 401', async () => {
    sessionStorage.setItem(CALENDAR_SESSION_KEY, 'expired-secret');
    apiMocks.getWorkingHours.mockRejectedValue(
      new ApiClientError(401, 'UNAUTHORIZED', 'Unauthorized'),
    );
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useWorkingHours(true), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(sessionStorage.getItem(CALENDAR_SESSION_KEY)).toBeNull();
  });
});

describe('calendar admin mutations', () => {
  it('routes appointment operations through the protected API', async () => {
    sessionStorage.setItem(CALENDAR_SESSION_KEY, 'server-secret');
    const { queryClient, wrapper } = createWrapper();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => ({
      create: useCreateAppointment(),
      update: useUpdateAppointment(),
    }), { wrapper });
    const appointment = {
      appointment_date: '2030-06-14',
      arrival_time: '10:30',
      customer_name: 'Jan',
      customer_phone: '600123456',
      bike_manufacturer: 'Trek',
      bike_model: 'Fuel EX',
      service_note: 'Pełny serwis',
      estimated_duration_minutes: 60,
    };

    await act(async () => {
      await result.current.create.mutateAsync(appointment);
      await result.current.update.mutateAsync({
        id: 'appointment-id',
        status: 'potwierdzone',
        appointment_date: '2030-06-15',
        arrival_time: '11:00',
        estimated_duration_minutes: 90,
        technician_note: 'Gotowe jutro',
      });
    });

    expect(apiMocks.createManualAppointment).toHaveBeenCalledWith(
      appointment,
      'server-secret',
    );
    expect(apiMocks.updateAppointment).toHaveBeenCalledWith(
      'appointment-id',
      {
        status: 'potwierdzone',
        appointment_date: '2030-06-15',
        arrival_time: '11:00',
        estimated_duration_minutes: 90,
        technician_note: 'Gotowe jutro',
      },
      'server-secret',
    );
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['calendar-admin', 'appointments'],
    });
    expect(supabaseMocks.from).not.toHaveBeenCalled();
  });

  it('routes working-hour and blocked-time operations through the protected API', async () => {
    sessionStorage.setItem(CALENDAR_SESSION_KEY, 'server-secret');
    const { queryClient, wrapper } = createWrapper();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => ({
      updateHours: useUpdateWorkingHours(),
      createBlock: useCreateBlockedTime(),
      deleteBlock: useDeleteBlockedTime(),
    }), { wrapper });
    const workingHours = {
      id: 'hours-id',
      open_time: '10:00',
      close_time: '18:00',
      is_open: true,
    };
    const blockedTime = {
      block_date: '2030-06-14',
      start_time: '12:00',
      end_time: '13:00',
      reason: 'Przerwa',
    };

    await act(async () => {
      await result.current.updateHours.mutateAsync(workingHours);
      await result.current.createBlock.mutateAsync(blockedTime);
      await result.current.deleteBlock.mutateAsync('blocked-id');
    });

    expect(apiMocks.updateWorkingHours).toHaveBeenCalledWith(
      'hours-id',
      {
        open_time: '10:00',
        close_time: '18:00',
        is_open: true,
      },
      'server-secret',
    );
    expect(apiMocks.createBlockedTime).toHaveBeenCalledWith(
      blockedTime,
      'server-secret',
    );
    expect(apiMocks.deleteBlockedTime).toHaveBeenCalledWith(
      'blocked-id',
      'server-secret',
    );
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['calendar-admin', 'working-hours'],
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['calendar-admin', 'blocked-times'],
    });
    expect(supabaseMocks.from).not.toHaveBeenCalled();
  });
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
  return {
    queryClient,
    wrapper: ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    ),
  };
}
