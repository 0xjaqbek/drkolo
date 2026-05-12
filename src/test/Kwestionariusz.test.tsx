import { screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderWithProviders } from './test-utils';

vi.mock('@/hooks/useSurvey', () => ({
  useSubmitSurvey: vi.fn(),
}));

import { useSubmitSurvey } from '@/hooks/useSurvey';
const mockSubmit = useSubmitSurvey as ReturnType<typeof vi.fn>;

import Kwestionariusz from '@/pages/Kwestionariusz';

const CORRECT_PASSWORD = 'testpass';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('VITE_CREATION_PASSWORD', CORRECT_PASSWORD);
  mockSubmit.mockReturnValue({ mutate: vi.fn(), isPending: false, isSuccess: false });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Kwestionariusz', () => {
  it('shows password gate on mount', () => {
    renderWithProviders(<Kwestionariusz />);
    expect(screen.getByPlaceholderText('Hasło')).toBeInTheDocument();
    expect(screen.getByText('Wejdź')).toBeInTheDocument();
  });

  it('shows error on wrong password', () => {
    renderWithProviders(<Kwestionariusz />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByText('Wejdź'));
    expect(screen.getByText('Nieprawidłowe hasło')).toBeInTheDocument();
  });

  it('shows wizard step 1 after correct password', () => {
    renderWithProviders(<Kwestionariusz />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), { target: { value: CORRECT_PASSWORD } });
    fireEvent.click(screen.getByText('Wejdź'));
    expect(screen.getByText('Krok 1 z 8')).toBeInTheDocument();
    expect(screen.getByText('Profil')).toBeInTheDocument();
  });

  it('navigates to next step on Dalej click', () => {
    renderWithProviders(<Kwestionariusz />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), { target: { value: CORRECT_PASSWORD } });
    fireEvent.click(screen.getByText('Wejdź'));
    fireEvent.click(screen.getByText('Dalej'));
    expect(screen.getByText('Krok 2 z 8')).toBeInTheDocument();
  });

  it('navigates back on Wstecz click', () => {
    renderWithProviders(<Kwestionariusz />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), { target: { value: CORRECT_PASSWORD } });
    fireEvent.click(screen.getByText('Wejdź'));
    fireEvent.click(screen.getByText('Dalej'));
    fireEvent.click(screen.getByText('Wstecz'));
    expect(screen.getByText('Krok 1 z 8')).toBeInTheDocument();
  });

  it('calls mutate on Wyślij click on last step', () => {
    const mockMutate = vi.fn();
    mockSubmit.mockReturnValue({ mutate: mockMutate, isPending: false, isSuccess: false });

    renderWithProviders(<Kwestionariusz />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), { target: { value: CORRECT_PASSWORD } });
    fireEvent.click(screen.getByText('Wejdź'));

    for (let i = 0; i < 7; i++) {
      fireEvent.click(screen.getByText('Dalej'));
    }

    fireEvent.click(screen.getByText('Wyślij'));
    expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({ answers: expect.any(Object) }));
  });

  it('shows thank-you screen after successful submit', () => {
    mockSubmit.mockReturnValue({ mutate: vi.fn(), isPending: false, isSuccess: true });

    renderWithProviders(<Kwestionariusz />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), { target: { value: CORRECT_PASSWORD } });
    fireEvent.click(screen.getByText('Wejdź'));

    expect(screen.getByText(/dziękujemy/i)).toBeInTheDocument();
  });
});
