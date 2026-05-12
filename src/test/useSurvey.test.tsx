import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createTestQueryClient } from './test-utils';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from '@/lib/supabase';
const mockFrom = supabase.from as ReturnType<typeof vi.fn>;

import {
  useCheckRoleSubmitted,
  useSubmitSurvey,
  useFetchAllSurveys,
} from '@/hooks/useSurvey';

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

beforeEach(() => vi.clearAllMocks());

describe('useCheckRoleSubmitted', () => {
  it('returns true when role already has a response', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'abc' }, error: null }),
    });

    const { result } = renderHook(() => useCheckRoleSubmitted('szef'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(true);
  });

  it('returns false when role has no response', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const { result } = renderHook(() => useCheckRoleSubmitted('mechanik_1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(false);
  });

  it('is disabled when role is null', () => {
    const { result } = renderHook(() => useCheckRoleSubmitted(null), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useSubmitSurvey', () => {
  it('calls supabase insert with role and answers', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: mockInsert });

    const { result } = renderHook(() => useSubmitSurvey(), { wrapper });

    result.current.mutate({
      role: 'szef',
      answers: { profil: { imie: 'Janek' } },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInsert).toHaveBeenCalledWith({
      role: 'szef',
      answers: { profil: { imie: 'Janek' } },
    });
  });
});

describe('useFetchAllSurveys', () => {
  it('returns all survey responses', async () => {
    const mockData = [
      { id: '1', role: 'szef', answers: {}, submitted_at: '2026-05-12T10:00:00Z' },
    ];
    mockFrom.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    });

    const { result } = renderHook(() => useFetchAllSurveys(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
  });
});
