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
  answers: { profil: { imie: 'Marek', lata_w_branzy: '10' } },
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
    fireEvent.change(screen.getByPlaceholderText('Hasło'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByText('Wejdź'));
    expect(screen.getByText('Nieprawidłowe hasło')).toBeInTheDocument();
  });

  it('shows empty state when no responses', () => {
    renderWithProviders(<KwestionariuszOdp />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), { target: { value: CORRECT_PASSWORD } });
    fireEvent.click(screen.getByText('Wejdź'));
    expect(screen.getByText('Brak odpowiedzi.')).toBeInTheDocument();
  });

  it('shows response entry with name after login', () => {
    mockFetch.mockReturnValue({ data: [MOCK_RESPONSE], isLoading: false });
    renderWithProviders(<KwestionariuszOdp />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), { target: { value: CORRECT_PASSWORD } });
    fireEvent.click(screen.getByText('Wejdź'));
    expect(screen.getByText('Marek')).toBeInTheDocument();
  });

  it('expands response to show answers on click', () => {
    mockFetch.mockReturnValue({ data: [MOCK_RESPONSE], isLoading: false });
    renderWithProviders(<KwestionariuszOdp />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), { target: { value: CORRECT_PASSWORD } });
    fireEvent.click(screen.getByText('Wejdź'));
    fireEvent.click(screen.getByText('Marek'));
    expect(screen.getByText('10')).toBeInTheDocument();
  });
});
