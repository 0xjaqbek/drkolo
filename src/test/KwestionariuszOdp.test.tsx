import { screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderWithProviders } from './test-utils';

vi.mock('@/hooks/useSurvey', () => ({
  useFetchAllSurveys: vi.fn(),
}));

import { useFetchAllSurveys } from '@/hooks/useSurvey';
const mockFetch = useFetchAllSurveys as ReturnType<typeof vi.fn>;

import KwestionariuszOdp from '@/pages/KwestionariuszOdp';

const CORRECT_PASSWORD = 'testpass';

const MOCK_RESPONSE = {
  id: '1',
  role: 'szef',
  answers: {
    profil: { imie: 'Marek', lata_w_branzy: '10' },
  },
  submitted_at: '2026-05-12T10:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('VITE_CREATION_PASSWORD', CORRECT_PASSWORD);
  mockFetch.mockReturnValue({ data: [], isLoading: false });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('KwestionariuszOdp', () => {
  it('shows password gate on mount', () => {
    renderWithProviders(<KwestionariuszOdp />);
    expect(screen.getByPlaceholderText('Hasło')).toBeInTheDocument();
  });

  it('shows error on wrong password', () => {
    renderWithProviders(<KwestionariuszOdp />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByText('Wejdź'));
    expect(screen.getByText('Nieprawidłowe hasło')).toBeInTheDocument();
  });

  it('shows 3 role tabs after correct password', () => {
    renderWithProviders(<KwestionariuszOdp />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), {
      target: { value: CORRECT_PASSWORD },
    });
    fireEvent.click(screen.getByText('Wejdź'));
    expect(screen.getByText('Szef')).toBeInTheDocument();
    expect(screen.getByText('Mechanik 1')).toBeInTheDocument();
    expect(screen.getByText('Mechanik 2')).toBeInTheDocument();
  });

  it('shows not-filled message when role has no response', () => {
    mockFetch.mockReturnValue({ data: [], isLoading: false });
    renderWithProviders(<KwestionariuszOdp />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), {
      target: { value: CORRECT_PASSWORD },
    });
    fireEvent.click(screen.getByText('Wejdź'));
    expect(screen.getByText(/nie wypełniono/i)).toBeInTheDocument();
  });

  it('shows answers when role has a response', () => {
    mockFetch.mockReturnValue({ data: [MOCK_RESPONSE], isLoading: false });
    renderWithProviders(<KwestionariuszOdp />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), {
      target: { value: CORRECT_PASSWORD },
    });
    fireEvent.click(screen.getByText('Wejdź'));
    expect(screen.getByText('Marek')).toBeInTheDocument();
  });
});
