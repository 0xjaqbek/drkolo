import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderWithProviders } from './test-utils';
import Rezerwacja from '@/pages/Rezerwacja';

vi.mock('@/hooks/useAppointments', () => ({
  useWorkingHours: () => ({ data: [] }),
  useAppointmentsByDate: () => ({ data: [] }),
  useBlockedTimes: () => ({ data: [] }),
  useCreateAppointment: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe('Rezerwacja', () => {
  let desc: HTMLMetaElement;
  let canonical: HTMLLinkElement;

  beforeEach(() => {
    desc = document.createElement('meta');
    desc.name = 'description';
    desc.content = 'Dr Koło — profesjonalny serwis rowerowy w Gdańsku i Kartuzach.';
    document.head.appendChild(desc);

    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = 'https://drkolo.pl/';
    document.head.appendChild(canonical);
  });

  afterEach(() => {
    desc.remove();
    canonical.remove();
    document.title = '';
  });

  it('sets correct page title', () => {
    renderWithProviders(<Rezerwacja />);
    expect(document.title).toBe('Umów wizytę — Dr Koło: Serwis Rowerowy Gdańsk');
  });

  it('sets canonical to /rezerwacja', () => {
    renderWithProviders(<Rezerwacja />);
    const link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    expect(link.getAttribute('href')).toBe('https://drkolo.pl/rezerwacja');
  });

  it('sets booking-specific meta description', () => {
    renderWithProviders(<Rezerwacja />);
    const meta = document.querySelector('meta[name="description"]') as HTMLMetaElement;
    expect(meta.getAttribute('content')).toContain('Zarezerwuj termin');
  });
});
