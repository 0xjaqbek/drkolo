import { screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderWithProviders } from './test-utils';

vi.mock('@/hooks/useAnalytics', () => ({
  useAnalytics: vi.fn(),
}));

import { useAnalytics } from '@/hooks/useAnalytics';
const mockUseAnalytics = useAnalytics as ReturnType<typeof vi.fn>;

import Analytics from '@/pages/Analytics';

const CORRECT_PASSWORD = 'testpass';

const MOCK_DATA = {
  totalViews: 42,
  uniqueSessions: 17,
  topPage: '/cennik',
  byPage: [{ path: '/cennik', count: 20 }, { path: '/', count: 22 }],
  byDay: [{ date: '2026-05-10', count: 10 }],
  byReferrer: [{ referrer: 'google.com', count: 30 }, { referrer: 'Direct', count: 12 }],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('VITE_CREATION_PASSWORD', CORRECT_PASSWORD);
  mockUseAnalytics.mockReturnValue({ data: MOCK_DATA, isLoading: false });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Analytics', () => {
  it('shows password gate on mount', () => {
    renderWithProviders(<Analytics />);
    expect(screen.getByPlaceholderText('Hasło')).toBeInTheDocument();
  });

  it('shows error on wrong password', () => {
    renderWithProviders(<Analytics />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByText('Wejdź'));
    expect(screen.getByText('Nieprawidłowe hasło')).toBeInTheDocument();
  });

  it('shows dashboard after correct password', () => {
    renderWithProviders(<Analytics />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), { target: { value: CORRECT_PASSWORD } });
    fireEvent.click(screen.getByText('Wejdź'));
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('17')).toBeInTheDocument();
    expect(screen.getAllByText('/cennik').length).toBeGreaterThan(0);
  });

  it('shows range buttons after login', () => {
    renderWithProviders(<Analytics />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), { target: { value: CORRECT_PASSWORD } });
    fireEvent.click(screen.getByText('Wejdź'));
    expect(screen.getByText('7 dni')).toBeInTheDocument();
    expect(screen.getByText('30 dni')).toBeInTheDocument();
    expect(screen.getByText('Wszystko')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseAnalytics.mockReturnValue({ data: undefined, isLoading: true });
    renderWithProviders(<Analytics />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), { target: { value: CORRECT_PASSWORD } });
    fireEvent.click(screen.getByText('Wejdź'));
    expect(screen.getByText('Ładowanie…')).toBeInTheDocument();
  });

  it('shows referrer data after login', () => {
    renderWithProviders(<Analytics />);
    fireEvent.change(screen.getByPlaceholderText('Hasło'), { target: { value: CORRECT_PASSWORD } });
    fireEvent.click(screen.getByText('Wejdź'));
    expect(screen.getByText('google.com')).toBeInTheDocument();
    expect(screen.getByText('Direct')).toBeInTheDocument();
  });
});
