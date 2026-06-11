import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type PropsWithChildren } from 'react';
import * as sessionHooks from '@/hooks/useSession';
import { ApiClientError } from '@/lib/types';

const SESSION_KEY = 'zlecenie_session';
const CALENDAR_SESSION_KEY = 'calendar_admin_session';

const apiMocks = vi.hoisted(() => ({
  verifyCalendarPassword: vi.fn(),
}));

vi.mock('@/lib/calendarAdminApi', () => ({
  verifyCalendarPassword: apiMocks.verifyCalendarPassword,
}));

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  apiMocks.verifyCalendarPassword.mockReset();
  vi.stubEnv('VITE_CREATION_PASSWORD', 'secret123');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('useSession', () => {
  it('starts unauthenticated when sessionStorage is empty', () => {
    const { result } = renderHook(() => sessionHooks.useSession());
    expect(result.current.authenticated).toBe(false);
  });

  it('starts authenticated when sessionStorage has the correct password', () => {
    sessionStorage.setItem(SESSION_KEY, 'secret123');
    const { result } = renderHook(() => sessionHooks.useSession());
    expect(result.current.authenticated).toBe(true);
  });

  it('login returns true and sets authenticated for correct password', () => {
    const { result } = renderHook(() => sessionHooks.useSession());
    act(() => {
      const ok = result.current.login('secret123');
      expect(ok).toBe(true);
    });
    expect(result.current.authenticated).toBe(true);
  });

  it('login returns false for wrong password', () => {
    const { result } = renderHook(() => sessionHooks.useSession());
    act(() => {
      const ok = result.current.login('wrong');
      expect(ok).toBe(false);
    });
    expect(result.current.authenticated).toBe(false);
  });

  it('logout clears authenticated', () => {
    sessionStorage.setItem(SESSION_KEY, 'secret123');
    const { result } = renderHook(() => sessionHooks.useSession());
    act(() => { result.current.logout(); });
    expect(result.current.authenticated).toBe(false);
  });
});

describe('useCalendarAdminSession', () => {
  it('exports a calendar-specific session hook', () => {
    expect(sessionHooks.useCalendarAdminSession).toBeTypeOf('function');
  });

  it('verifies the password asynchronously and stores only the calendar session', async () => {
    apiMocks.verifyCalendarPassword.mockResolvedValue(true);
    const { result } = renderCalendarSession();

    let authenticated = false;
    await act(async () => {
      authenticated = await result.current.login('server-secret');
    });

    expect(authenticated).toBe(true);
    expect(apiMocks.verifyCalendarPassword).toHaveBeenCalledWith(
      'server-secret',
    );
    expect(result.current.authenticated).toBe(true);
    expect(sessionStorage.getItem(CALENDAR_SESSION_KEY)).toBe('server-secret');
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    expect(localStorage.getItem(CALENDAR_SESSION_KEY)).toBeNull();
  });

  it('rejects a wrong password without creating a session', async () => {
    const error = new ApiClientError(401, 'UNAUTHORIZED', 'Unauthorized');
    apiMocks.verifyCalendarPassword.mockRejectedValue(error);
    const { result } = renderCalendarSession();

    let authenticated = true;
    await act(async () => {
      authenticated = await result.current.login('wrong');
    });

    expect(authenticated).toBe(false);
    expect(result.current.authenticated).toBe(false);
    expect(result.current.error).toBe(error);
    expect(sessionStorage.getItem(CALENDAR_SESSION_KEY)).toBeNull();
  });

  it('verifies a stored calendar password before restoring authentication', async () => {
    sessionStorage.setItem(CALENDAR_SESSION_KEY, 'stored-secret');
    apiMocks.verifyCalendarPassword.mockResolvedValue(true);
    const { result } = renderCalendarSession();

    expect(result.current.authenticated).toBe(false);
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.authenticated).toBe(true);
    });
    expect(apiMocks.verifyCalendarPassword).toHaveBeenCalledWith(
      'stored-secret',
    );
    expect(result.current.isLoading).toBe(false);
  });

  it('marks a stored calendar password rejected with 401 as expired', async () => {
    sessionStorage.setItem(CALENDAR_SESSION_KEY, 'expired-secret');
    apiMocks.verifyCalendarPassword.mockRejectedValue(
      new ApiClientError(401, 'UNAUTHORIZED', 'Unauthorized'),
    );
    const { result } = renderCalendarSession();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.authenticated).toBe(false);
    expect(result.current.error).toEqual(expect.objectContaining({
      status: 401,
      code: 'SESSION_EXPIRED',
    }));
    expect(sessionStorage.getItem(CALENDAR_SESSION_KEY)).toBeNull();
  });

  it('clears calendar caches and leaves the legacy session untouched on logout', async () => {
    sessionStorage.setItem(SESSION_KEY, 'secret123');
    apiMocks.verifyCalendarPassword.mockResolvedValue(true);
    const queryClient = new QueryClient();
    const { result } = renderCalendarSession(queryClient);
    await act(async () => {
      await result.current.login('server-secret');
    });
    queryClient.setQueryData(['calendar-admin', 'appointments', '2030-06-14'], []);
    queryClient.setQueryData(['calendar-admin', 'working-hours'], []);
    queryClient.setQueryData(['calendar-admin', 'blocked-times', '2030-06-14'], []);

    act(() => result.current.logout());

    expect(result.current.authenticated).toBe(false);
    expect(sessionStorage.getItem(CALENDAR_SESSION_KEY)).toBeNull();
    expect(sessionStorage.getItem(SESSION_KEY)).toBe('secret123');
    expect(
      queryClient.getQueriesData({ queryKey: ['calendar-admin'] }),
    ).toEqual([]);
  });

  it('expires the calendar session and clears caches after a protected 401', async () => {
    apiMocks.verifyCalendarPassword.mockResolvedValue(true);
    const queryClient = new QueryClient();
    const { result } = renderCalendarSession(queryClient);
    await act(async () => {
      await result.current.login('server-secret');
    });
    queryClient.setQueryData(['calendar-admin', 'appointments'], []);

    act(() => sessionHooks.expireCalendarAdminSession());

    expect(result.current.authenticated).toBe(false);
    expect(result.current.error).toEqual(expect.objectContaining({
      status: 401,
      code: 'SESSION_EXPIRED',
    }));
    expect(sessionStorage.getItem(CALENDAR_SESSION_KEY)).toBeNull();
    expect(
      queryClient.getQueriesData({ queryKey: ['calendar-admin'] }),
    ).toEqual([]);
  });
});

interface CalendarSessionResult {
  authenticated: boolean;
  error: unknown;
  isLoading: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
}

function renderCalendarSession(
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  }),
) {
  const useCalendarAdminSession = sessionHooks.useCalendarAdminSession as
    unknown as () => CalendarSessionResult;

  return renderHook(() => useCalendarAdminSession(), {
    wrapper: ({ children }: PropsWithChildren) => createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    ),
  });
}
