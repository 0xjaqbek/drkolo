import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ChatWidget } from '@/components/ChatWidget';

vi.mock('@/lib/chatApi', () => ({
  sendChatMessage: vi.fn(),
}));

import { sendChatMessage } from '@/lib/chatApi';
const mockSend = sendChatMessage as ReturnType<typeof vi.fn>;

// Mock fetch so health check resolves to 200 by default
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('VITE_CHAT_API_URL', 'http://test-api');
  sessionStorage.clear();
  mockFetch.mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('ChatWidget', () => {
  it('renders nothing until health check passes', async () => {
    mockFetch.mockResolvedValue({ ok: false });
    render(<ChatWidget />);
    await waitFor(() => expect(screen.queryByLabelText('Otwórz czat')).toBeNull());
  });

  it('renders floating button after health check passes', async () => {
    render(<ChatWidget />);
    await waitFor(() =>
      expect(screen.getByLabelText('Otwórz czat')).toBeInTheDocument()
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens panel when floating button clicked', async () => {
    render(<ChatWidget />);
    await waitFor(() => screen.getByLabelText('Otwórz czat'));
    fireEvent.click(screen.getByLabelText('Otwórz czat'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Asystent Dr Koło')).toBeInTheDocument();
  });

  it('closes panel when close button clicked', async () => {
    render(<ChatWidget />);
    await waitFor(() => screen.getByLabelText('Otwórz czat'));
    fireEvent.click(screen.getByLabelText('Otwórz czat'));
    fireEvent.click(screen.getByLabelText('Zamknij'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('sends message and displays assistant reply', async () => {
    mockSend.mockResolvedValue({ reply: 'Witaj! Jak mogę pomóc?' });

    render(<ChatWidget />);
    await waitFor(() => screen.getByLabelText('Otwórz czat'));
    fireEvent.click(screen.getByLabelText('Otwórz czat'));
    fireEvent.change(screen.getByLabelText('Wiadomość'), { target: { value: 'Cześć' } });
    fireEvent.click(screen.getByLabelText('Wyślij'));

    await waitFor(() =>
      expect(screen.getByText('Witaj! Jak mogę pomóc?')).toBeInTheDocument()
    );
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it('does not show SMS button until smsBody returned', async () => {
    mockSend.mockResolvedValue({ reply: 'Świetnie, przygotowałem SMS.', smsBody: 'Dzień dobry, mam MTB' });

    render(<ChatWidget />);
    await waitFor(() => screen.getByLabelText('Otwórz czat'));
    fireEvent.click(screen.getByLabelText('Otwórz czat'));
    expect(screen.queryByText('Wyślij SMS do serwisu')).toBeNull();

    fireEvent.change(screen.getByLabelText('Wiadomość'), { target: { value: 'tak' } });
    fireEvent.click(screen.getByLabelText('Wyślij'));

    await waitFor(() =>
      expect(screen.getByText('Wyślij SMS do serwisu')).toBeInTheDocument()
    );
  });

  it('SMS link has correct href with encoded body', async () => {
    mockSend.mockResolvedValue({ reply: 'Gotowe.', smsBody: 'Dzień dobry, problem' });

    render(<ChatWidget />);
    await waitFor(() => screen.getByLabelText('Otwórz czat'));
    fireEvent.click(screen.getByLabelText('Otwórz czat'));
    fireEvent.change(screen.getByLabelText('Wiadomość'), { target: { value: 'tak' } });
    fireEvent.click(screen.getByLabelText('Wyślij'));

    await waitFor(() => screen.getByText('Wyślij SMS do serwisu'));
    const link = screen.getByText('Wyślij SMS do serwisu').closest('a');
    expect(link?.href).toContain('sms:+48511061221');
    expect(link?.href).toContain(encodeURIComponent('Dzień dobry, problem'));
  });

  it('shows error message when API fails', async () => {
    mockSend.mockRejectedValue(new Error('Network error'));

    render(<ChatWidget />);
    await waitFor(() => screen.getByLabelText('Otwórz czat'));
    fireEvent.click(screen.getByLabelText('Otwórz czat'));
    fireEvent.change(screen.getByLabelText('Wiadomość'), { target: { value: 'Cześć' } });
    fireEvent.click(screen.getByLabelText('Wyślij'));

    await waitFor(() =>
      expect(
        screen.getByText('Przepraszam, wystąpił błąd. Spróbuj ponownie.')
      ).toBeInTheDocument()
    );
  });
});
