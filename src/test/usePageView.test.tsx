import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ error: null })),
    })),
  },
}));

import { supabase } from '@/lib/supabase';
const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

import { usePageView } from '@/hooks/usePageView';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient();
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="*" element={<>{children}</>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  Object.defineProperty(navigator, 'userAgent', {
    value: 'Mozilla/5.0 (test)',
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('usePageView', () => {
  it('inserts a row on mount', () => {
    const mockInsert = vi.fn(() => Promise.resolve({ error: null }));
    mockFrom.mockReturnValue({ insert: mockInsert });

    renderHook(() => usePageView(), { wrapper });

    expect(mockFrom).toHaveBeenCalledWith('page_views');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/' })
    );
  });

  it('skips insert for bot user agents', () => {
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Googlebot/2.1',
      configurable: true,
    });
    const mockInsert = vi.fn();
    mockFrom.mockReturnValue({ insert: mockInsert });

    renderHook(() => usePageView(), { wrapper });

    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('stores session_id in sessionStorage', () => {
    const mockInsert = vi.fn(() => Promise.resolve({ error: null }));
    mockFrom.mockReturnValue({ insert: mockInsert });

    renderHook(() => usePageView(), { wrapper });

    const stored = sessionStorage.getItem('analytics_session_id');
    expect(stored).not.toBeNull();
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ session_id: stored })
    );
  });

  it('reuses session_id on subsequent mounts', () => {
    const mockInsert = vi.fn(() => Promise.resolve({ error: null }));
    mockFrom.mockReturnValue({ insert: mockInsert });

    renderHook(() => usePageView(), { wrapper });
    const id1 = sessionStorage.getItem('analytics_session_id');

    vi.clearAllMocks();
    mockFrom.mockReturnValue({ insert: mockInsert });
    renderHook(() => usePageView(), { wrapper });
    const id2 = sessionStorage.getItem('analytics_session_id');

    expect(id1).toBe(id2);
  });
});
