import { useState } from 'react';

const SESSION_KEY = 'zlecenie_session';

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
