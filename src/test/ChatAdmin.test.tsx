import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderWithProviders } from './test-utils';

vi.mock('@/lib/chatApi', () => ({
  fetchAdminSessions: vi.fn(),
  fetchAdminSession: vi.fn(),
  deleteAdminSession: vi.fn(),
}));

import { fetchAdminSessions, fetchAdminSession, deleteAdminSession } from '@/lib/chatApi';
const mockFetchSessions = fetchAdminSessions as ReturnType<typeof vi.fn>;
const mockFetchSession = fetchAdminSession as ReturnType<typeof vi.fn>;
const mockDelete = deleteAdminSession as ReturnType<typeof vi.fn>;

import ChatAdmin from '@/pages/ChatAdmin';

const MOCK_SESSION = {
  id: 'session-1',
  created_at: '2026-05-11T10:00:00Z',
  last_message_at: '2026-05-11T10:05:00Z',
  message_count: 4,
  last_preview: 'Mam problem z rowerem MTB',
};

beforeEach(() => vi.clearAllMocks());

describe('ChatAdmin', () => {
  it('shows password gate on mount', () => {
    renderWithProviders(<ChatAdmin />);
    expect(screen.getByPlaceholderText('Hasło administratora')).toBeInTheDocument();
  });

  it('shows error message on wrong password', async () => {
    mockFetchSessions.mockRejectedValue(new Error('401'));
    renderWithProviders(<ChatAdmin />);
    fireEvent.change(screen.getByPlaceholderText('Hasło administratora'), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByText('Zaloguj'));
    await waitFor(() =>
      expect(screen.getByText('Nieprawidłowe hasło')).toBeInTheDocument()
    );
  });

  it('shows session list after successful login', async () => {
    mockFetchSessions.mockResolvedValue([MOCK_SESSION]);
    renderWithProviders(<ChatAdmin />);
    fireEvent.change(screen.getByPlaceholderText('Hasło administratora'), {
      target: { value: 'correct' },
    });
    fireEvent.click(screen.getByText('Zaloguj'));
    await waitFor(() =>
      expect(screen.getByText('Mam problem z rowerem MTB')).toBeInTheDocument()
    );
  });

  it('removes session from list after delete', async () => {
    mockFetchSessions.mockResolvedValue([MOCK_SESSION]);
    mockDelete.mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderWithProviders(<ChatAdmin />);
    fireEvent.change(screen.getByPlaceholderText('Hasło administratora'), {
      target: { value: 'correct' },
    });
    fireEvent.click(screen.getByText('Zaloguj'));
    await waitFor(() => screen.getByText('Mam problem z rowerem MTB'));

    fireEvent.click(screen.getByLabelText('Usuń rozmowę'));
    await waitFor(() =>
      expect(screen.queryByText('Mam problem z rowerem MTB')).toBeNull()
    );
  });

  it('expands session to show full conversation', async () => {
    mockFetchSessions.mockResolvedValue([MOCK_SESSION]);
    mockFetchSession.mockResolvedValue({
      ...MOCK_SESSION,
      messages: [
        { id: 'm1', role: 'user', content: 'Hej, mam problem z MTB', created_at: '2026-05-11T10:00:00Z' },
        { id: 'm2', role: 'assistant', content: 'Dzień dobry! Opiszę jak pomóc.', created_at: '2026-05-11T10:01:00Z' },
      ],
    });

    renderWithProviders(<ChatAdmin />);
    fireEvent.change(screen.getByPlaceholderText('Hasło administratora'), {
      target: { value: 'correct' },
    });
    fireEvent.click(screen.getByText('Zaloguj'));
    await waitFor(() => screen.getByText('Mam problem z rowerem MTB'));

    fireEvent.click(screen.getByLabelText('Rozwiń rozmowę'));
    await waitFor(() =>
      expect(screen.getByText('Hej, mam problem z MTB')).toBeInTheDocument()
    );
  });
});
