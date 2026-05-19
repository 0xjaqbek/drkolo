import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from '@/lib/supabase';
const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

import { useAnalytics } from '@/hooks/useAnalytics';

const MOCK_ROWS = [
  { id: '1', path: '/',       referrer: 'google.com',   session_id: 'aaa', user_agent: 'UA', created_at: '2026-05-10T10:00:00Z' },
  { id: '2', path: '/cennik', referrer: null,            session_id: 'bbb', user_agent: 'UA', created_at: '2026-05-10T11:00:00Z' },
  { id: '3', path: '/',       referrer: 'google.com',   session_id: 'aaa', user_agent: 'UA', created_at: '2026-05-11T10:00:00Z' },
  { id: '4', path: '/cennik', referrer: 'facebook.com', session_id: 'ccc', user_agent: 'UA', created_at: '2026-05-11T12:00:00Z' },
];

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function mockSupabase(rows: typeof MOCK_ROWS) {
  // Build a thenable chain that mimics the Supabase query builder
  const chain: Record<string, unknown> = {};
  const q = () => chain;
  chain.select = q;
  chain.order = q;
  chain.gte = q;
  chain.then = (resolve: (v: { data: typeof rows; error: null }) => void) =>
    Promise.resolve({ data: rows, error: null }).then(resolve);
  mockFrom.mockReturnValue(chain);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useAnalytics', () => {
  it('returns correct totalViews and uniqueSessions', async () => {
    mockSupabase(MOCK_ROWS);
    const { result } = renderHook(() => useAnalytics(30), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.totalViews).toBe(4);
    expect(result.current.data!.uniqueSessions).toBe(3);
  });

  it('returns byPage sorted by count descending', async () => {
    mockSupabase(MOCK_ROWS);
    const { result } = renderHook(() => useAnalytics(30), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.byPage[0]).toEqual({ path: '/', count: 2 });
    expect(result.current.data!.byPage[1]).toEqual({ path: '/cennik', count: 2 });
  });

  it('returns topPage as most-visited path', async () => {
    mockSupabase(MOCK_ROWS);
    const { result } = renderHook(() => useAnalytics(30), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.topPage).toBe('/');
  });

  it('maps null referrer to "Direct"', async () => {
    mockSupabase(MOCK_ROWS);
    const { result } = renderHook(() => useAnalytics(30), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    const refs = result.current.data!.byReferrer.map((r) => r.referrer);
    expect(refs).toContain('Direct');
    expect(refs).toContain('google.com');
  });

  it('groups views by day', async () => {
    mockSupabase(MOCK_ROWS);
    const { result } = renderHook(() => useAnalytics(30), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.byDay).toEqual([
      { date: '2026-05-10', count: 2 },
      { date: '2026-05-11', count: 2 },
    ]);
  });
});
