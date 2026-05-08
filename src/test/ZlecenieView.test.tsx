import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import ZlecenieView from '@/pages/ZlecenieView';

const mockData = {
  zlecenie: {
    id: 'zlec-1',
    hash: 'ABC12345',
    bike_model: 'Trek Fuel EX',
    customer_phone: '+48600000000',
    status: 'w_trakcie',
    created_at: '2026-05-07T10:00:00Z',
  },
  items: [
    { id: 'item-1', zlecenie_id: 'zlec-1', label: 'Wymiana klocków', is_done: false, done_at: null, sort_order: 0 },
    { id: 'item-2', zlecenie_id: 'zlec-1', label: 'Serwis widelca', is_done: true, done_at: '2026-05-07T11:00:00Z', sort_order: 1 },
  ],
  updates: [],
};

vi.mock('@/hooks/useZlecenie', () => ({
  useZlecenie: () => ({ data: mockData, isLoading: false, error: null }),
  useCatalog: () => ({ data: undefined }),
}));

vi.mock('@/hooks/useZlecenieActions', () => ({
  useUpdateStatus: () => ({ mutate: vi.fn() }),
  useToggleItem: () => ({ mutate: vi.fn() }),
  useAddUpdate: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }) }),
    },
  },
}));

beforeEach(() => {
  sessionStorage.clear();
  vi.stubEnv('VITE_CREATION_PASSWORD', 'secret123');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('ZlecenieView', () => {
  it('renders bike model as page title', async () => {
    renderWithProviders(<ZlecenieView />, { route: '/zlecenie/ABC12345' });
    await waitFor(() => {
      expect(screen.getByText('Trek Fuel EX')).toBeInTheDocument();
    });
  });

  it('renders all checklist items', async () => {
    renderWithProviders(<ZlecenieView />, { route: '/zlecenie/ABC12345' });
    await waitFor(() => {
      expect(screen.getByText('Wymiana klocków')).toBeInTheDocument();
      expect(screen.getByText('Serwis widelca')).toBeInTheDocument();
    });
  });

  it('shows checkboxes in edit mode when session active', async () => {
    sessionStorage.setItem('zlecenie_session', 'secret123');
    renderWithProviders(<ZlecenieView />, { route: '/zlecenie/ABC12345' });
    await waitFor(() => {
      expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
    });
  });

  it('hides checkboxes in read-only mode without session', async () => {
    renderWithProviders(<ZlecenieView />, { route: '/zlecenie/ABC12345' });
    await waitFor(() => {
      expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    });
  });
});
