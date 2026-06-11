import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { verifyCalendarPassword } from '@/lib/calendarAdminApi';

const SESSION_KEY = 'zlecenie_session';
export const CALENDAR_ADMIN_SESSION_KEY = 'calendar_admin_session';

export function getCalendarAdminPassword(): string | null {
  return sessionStorage.getItem(CALENDAR_ADMIN_SESSION_KEY);
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
    const storedPassword = getCalendarAdminPassword();
    if (!storedPassword) {
      return;
    }

    let active = true;
    verifyCalendarPassword(storedPassword)
      .then((verified) => {
        if (!active) return;
        if (verified) {
          setAuthenticated(true);
          return;
        }
        sessionStorage.removeItem(CALENDAR_ADMIN_SESSION_KEY);
      })
      .catch((verifyError: unknown) => {
        if (!active) return;
        sessionStorage.removeItem(CALENDAR_ADMIN_SESSION_KEY);
        setError(verifyError);
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
          setIsRestoring(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

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
