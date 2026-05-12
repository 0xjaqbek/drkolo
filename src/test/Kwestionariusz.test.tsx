import { screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderWithProviders } from './test-utils';

vi.mock('@/hooks/useSurvey', () => ({
  useCheckRoleSubmitted: vi.fn(),
  useSubmitSurvey: vi.fn(),
}));

import { useCheckRoleSubmitted, useSubmitSurvey } from '@/hooks/useSurvey';
const mockCheckRole = useCheckRoleSubmitted as ReturnType<typeof vi.fn>;
const mockSubmit = useSubmitSurvey as ReturnType<typeof vi.fn>;

import Kwestionariusz from '@/pages/Kwestionariusz';

const CORRECT_PASSWORD = 'testpass';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('VITE_CREATION_PASSWORD', CORRECT_PASSWORD);
  mockCheckRole.mockReturnValue({ data: false, isLoading: false, isSuccess: true });
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
    fireEvent.change(screen.getByPlaceholderText('Hasło'), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByText('Wejdź'));
    expect(screen.getByText('Nieprawidłowe hasło')).toBeInTheDocument();
  });

  it('shows role selection after correct password', () => {
    renderWithProviders(<Kwestionariusz />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), {
      target: { value: CORRECT_PASSWORD },
    });
    fireEvent.click(screen.getByText('Wejdź'));
    expect(screen.getByText('Właściciel')).toBeInTheDocument();
    expect(screen.getByText('Serwisant 1')).toBeInTheDocument();
    expect(screen.getByText('Serwisant 2')).toBeInTheDocument();
  });

  it('shows already-done message when role already submitted', () => {
    mockCheckRole.mockReturnValue({ data: true, isLoading: false, isSuccess: true });
    renderWithProviders(<Kwestionariusz />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), {
      target: { value: CORRECT_PASSWORD },
    });
    fireEvent.click(screen.getByText('Wejdź'));
    fireEvent.click(screen.getByText('Właściciel'));
    expect(screen.getByText(/już wypełniono/i)).toBeInTheDocument();
  });

  it('shows wizard step 1 when role not yet submitted', () => {
    renderWithProviders(<Kwestionariusz />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), {
      target: { value: CORRECT_PASSWORD },
    });
    fireEvent.click(screen.getByText('Wejdź'));
    fireEvent.click(screen.getByText('Właściciel'));
    expect(screen.getByText('Krok 1 z 8')).toBeInTheDocument();
    expect(screen.getByText('Profil')).toBeInTheDocument();
  });

  it('navigates to next step on Dalej click', () => {
    renderWithProviders(<Kwestionariusz />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), {
      target: { value: CORRECT_PASSWORD },
    });
    fireEvent.click(screen.getByText('Wejdź'));
    fireEvent.click(screen.getByText('Właściciel'));
    fireEvent.click(screen.getByText('Dalej'));
    expect(screen.getByText('Krok 2 z 8')).toBeInTheDocument();
  });

  it('navigates back on Wstecz click', () => {
    renderWithProviders(<Kwestionariusz />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), {
      target: { value: CORRECT_PASSWORD },
    });
    fireEvent.click(screen.getByText('Wejdź'));
    fireEvent.click(screen.getByText('Właściciel'));
    fireEvent.click(screen.getByText('Dalej'));
    fireEvent.click(screen.getByText('Wstecz'));
    expect(screen.getByText('Krok 1 z 8')).toBeInTheDocument();
  });

  it('calls mutate on Wyślij click on last step', async () => {
    const mockMutate = vi.fn();
    mockSubmit.mockReturnValue({ mutate: mockMutate, isPending: false, isSuccess: false });

    renderWithProviders(<Kwestionariusz />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), {
      target: { value: CORRECT_PASSWORD },
    });
    fireEvent.click(screen.getByText('Wejdź'));
    fireEvent.click(screen.getByText('Właściciel'));

    for (let i = 0; i < 7; i++) {
      fireEvent.click(screen.getByText('Dalej'));
    }

    expect(screen.getByText('Wyślij')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Wyślij'));
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'wlasciciel' })
    );
  });

  it('shows thank-you screen after successful submit', () => {
    mockSubmit.mockReturnValue({ mutate: vi.fn(), isPending: false, isSuccess: true });

    renderWithProviders(<Kwestionariusz />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), {
      target: { value: CORRECT_PASSWORD },
    });
    fireEvent.click(screen.getByText('Wejdź'));
    fireEvent.click(screen.getByText('Właściciel'));

    expect(screen.getByText(/dziękujemy/i)).toBeInTheDocument();
  });
});
