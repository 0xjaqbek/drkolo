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

import { useSubmitSurvey, useFetchAllSurveys } from '@/hooks/useSurvey';

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={createTestQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

beforeEach(() => vi.clearAllMocks());

describe('useSubmitSurvey', () => {
  it('calls supabase insert with answers', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: mockInsert });

    const { result } = renderHook(() => useSubmitSurvey(), { wrapper });

    result.current.mutate({ answers: { profil: { imie: 'Janek' } } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInsert).toHaveBeenCalledWith({
      answers: { profil: { imie: 'Janek' } },
    });
  });
});

describe('useFetchAllSurveys', () => {
  it('returns all survey responses ordered by date', async () => {
    const mockData = [
      { id: '1', answers: { profil: { imie: 'Marek' } }, submitted_at: '2026-05-12T10:00:00Z' },
    ];
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    });

    const { result } = renderHook(() => useFetchAllSurveys(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockData);
  });
});
