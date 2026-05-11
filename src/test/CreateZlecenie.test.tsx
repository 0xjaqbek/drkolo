import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import CreateZlecenie from '@/pages/CreateZlecenie';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'uuid-1',
          hash: 'ABC12345',
          bike_model: 'Trek',
          customer_phone: '+48600000000',
          status: 'oczekuje',
          created_at: '',
        },
        error: null,
      }),
    })),
  },
}));

vi.mock('@/hooks/useZlecenie', () => ({
  useCatalog: () => ({ data: undefined, isLoading: true }),
  useZlecenie: () => ({ data: undefined, isLoading: true, error: null }),
}));

beforeEach(() => {
  sessionStorage.clear();
  vi.stubEnv('VITE_CREATION_PASSWORD', 'secret123');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('CreateZlecenie', () => {
  it('shows password prompt when not authenticated', () => {
    renderWithProviders(<CreateZlecenie />, { route: '/zlecenie' });
    expect(screen.getByPlaceholderText('Hasło')).toBeInTheDocument();
  });

  it('shows error for wrong password', () => {
    renderWithProviders(<CreateZlecenie />, { route: '/zlecenie' });
    fireEvent.change(screen.getByPlaceholderText('Hasło'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByText('Zaloguj'));
    expect(screen.getByText('Nieprawidłowe hasło')).toBeInTheDocument();
  });

  it('shows form after correct password', async () => {
    renderWithProviders(<CreateZlecenie />, { route: '/zlecenie' });
    fireEvent.change(screen.getByPlaceholderText('Hasło'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByText('Zaloguj'));
    // Choice dialog appears after login — click through to create mode
    await waitFor(() => screen.getByText('Co chcesz zrobić?'));
    fireEvent.click(screen.getByText('Nowe zlecenie serwisowe').closest('button')!);
    await waitFor(() => {
      expect(screen.getByText('Nowe zlecenie')).toBeInTheDocument();
    });
  });

  it('submit button disabled when required fields empty', async () => {
    sessionStorage.setItem('zlecenie_session', 'secret123');
    renderWithProviders(<CreateZlecenie />, { route: '/zlecenie' });
    // Choice dialog appears — click through to create mode
    await waitFor(() => screen.getByText('Co chcesz zrobić?'));
    fireEvent.click(screen.getByText('Nowe zlecenie serwisowe').closest('button')!);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Utwórz zlecenie' })).toBeDisabled();
    });
  });
});
