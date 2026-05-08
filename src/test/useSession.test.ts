import { renderHook, act } from '@testing-library/react';
import { useSession } from '@/hooks/useSession';

const SESSION_KEY = 'zlecenie_session';

beforeEach(() => {
  sessionStorage.clear();
  vi.stubEnv('VITE_CREATION_PASSWORD', 'secret123');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('useSession', () => {
  it('starts unauthenticated when sessionStorage is empty', () => {
    const { result } = renderHook(() => useSession());
    expect(result.current.authenticated).toBe(false);
  });

  it('starts authenticated when sessionStorage has the correct password', () => {
    sessionStorage.setItem(SESSION_KEY, 'secret123');
    const { result } = renderHook(() => useSession());
    expect(result.current.authenticated).toBe(true);
  });

  it('login returns true and sets authenticated for correct password', () => {
    const { result } = renderHook(() => useSession());
    act(() => {
      const ok = result.current.login('secret123');
      expect(ok).toBe(true);
    });
    expect(result.current.authenticated).toBe(true);
  });

  it('login returns false for wrong password', () => {
    const { result } = renderHook(() => useSession());
    act(() => {
      const ok = result.current.login('wrong');
      expect(ok).toBe(false);
    });
    expect(result.current.authenticated).toBe(false);
  });

  it('logout clears authenticated', () => {
    sessionStorage.setItem(SESSION_KEY, 'secret123');
    const { result } = renderHook(() => useSession());
    act(() => { result.current.logout(); });
    expect(result.current.authenticated).toBe(false);
  });
});
