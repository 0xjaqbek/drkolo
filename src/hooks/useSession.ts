import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { verifyCalendarPassword } from '@/lib/calendarAdminApi';
import { ApiClientError } from '@/lib/types';

const SESSION_KEY = 'zlecenie_session';
export const CALENDAR_ADMIN_SESSION_KEY = 'calendar_admin_session';
const CALENDAR_ADMIN_SESSION_EXPIRED = 'calendar-admin-session-expired';

export function getCalendarAdminPassword(): string | null {
  return sessionStorage.getItem(CALENDAR_ADMIN_SESSION_KEY);
}

export function expireCalendarAdminSession(): void {
  sessionStorage.removeItem(CALENDAR_ADMIN_SESSION_KEY);
  window.dispatchEvent(new Event(CALENDAR_ADMIN_SESSION_EXPIRED));
}

function calendarSessionExpiredError(): ApiClientError {
  return new ApiClientError(
    401,
    'SESSION_EXPIRED',
    'Calendar admin session expired',
  );
}

export function useSession() {
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === import.meta.env.VITE_CREATION_PASSWORD
  );

  const login = (password: string): boolean => {
    if (password === import.meta.env.VITE_CREATION_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, password);
      setAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuthenticated(false);
  };

  return { authenticated, login, logout };
}

export function useCalendarAdminSession() {
  const queryClient = useQueryClient();
  const hasStoredPassword = Boolean(getCalendarAdminPassword());
  const [authenticated, setAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(hasStoredPassword);
  const [isRestoring, setIsRestoring] = useState(hasStoredPassword);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let active = true;
    const handleSessionExpired = () => {
      if (!active) return;
      setAuthenticated(false);
      setError(calendarSessionExpiredError());
      queryClient.removeQueries({ queryKey: ['calendar-admin'] });
    };
    window.addEventListener(
      CALENDAR_ADMIN_SESSION_EXPIRED,
      handleSessionExpired,
    );

    const storedPassword = getCalendarAdminPassword();
    if (!storedPassword) {
      return () => {
        active = false;
        window.removeEventListener(
          CALENDAR_ADMIN_SESSION_EXPIRED,
          handleSessionExpired,
        );
      };
    }

    verifyCalendarPassword(storedPassword)
      .then((verified) => {
        if (!active) return;
        if (verified) {
          setAuthenticated(true);
          return;
        }
        sessionStorage.removeItem(CALENDAR_ADMIN_SESSION_KEY);
        setError(calendarSessionExpiredError());
      })
      .catch((verifyError: unknown) => {
        if (!active) return;
        sessionStorage.removeItem(CALENDAR_ADMIN_SESSION_KEY);
        setError(
          verifyError instanceof ApiClientError && verifyError.status === 401
            ? calendarSessionExpiredError()
            : verifyError,
        );
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
          setIsRestoring(false);
        }
      });

    return () => {
      active = false;
      window.removeEventListener(
        CALENDAR_ADMIN_SESSION_EXPIRED,
        handleSessionExpired,
      );
    };
  }, [queryClient]);

  const login = async (password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const verified = await verifyCalendarPassword(password);
      if (!verified) {
        return false;
      }
      sessionStorage.setItem(CALENDAR_ADMIN_SESSION_KEY, password);
      setAuthenticated(true);
      return true;
    } catch (loginError) {
      sessionStorage.removeItem(CALENDAR_ADMIN_SESSION_KEY);
      setAuthenticated(false);
      setError(loginError);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem(CALENDAR_ADMIN_SESSION_KEY);
    setAuthenticated(false);
    setError(null);
    queryClient.removeQueries({ queryKey: ['calendar-admin'] });
  };

  return {
    authenticated,
    error,
    isLoading,
    isRestoring,
    login,
    logout,
  };
}
