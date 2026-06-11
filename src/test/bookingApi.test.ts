import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();

async function loadClient() {
  vi.resetModules();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-secret');
  vi.stubGlobal('fetch', fetchMock);
  return import('@/lib/bookingApi');
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('bookingApi', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('gets encoded availability with Supabase gateway headers', async () => {
    const availability = {
      date: '2026/06?11',
      timezone: 'Europe/Warsaw',
      open: '10:00',
      close: '19:00',
      slots: ['10:00'],
    };
    fetchMock.mockResolvedValue(jsonResponse(availability));
    const { getAvailability } = await loadClient();

    await expect(getAvailability('2026/06?11')).resolves.toEqual(availability);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://project.supabase.co/functions/v1/availability?date=2026%2F06%3F11',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer anon-secret',
          apikey: 'anon-secret',
        }),
      }),
    );
  });

  it('posts exactly the seven public appointment fields as JSON', async () => {
    const input = {
      date: '2026-06-11',
      time: '10:30',
      customer_name: 'Jan Kowalski',
      customer_phone: '+48600123456',
      bike_manufacturer: 'Trek',
      bike_model: 'Fuel EX',
      service_note: 'Full service',
    };
    const created = {
      id: 'appointment-id',
      status: 'zapytanie',
      lookup_token: 'lookup-token',
      message: 'Appointment inquiry created.',
    };
    fetchMock.mockResolvedValue(jsonResponse(created, 201));
    const { createAppointmentInquiry } = await loadClient();

    await expect(createAppointmentInquiry(input)).resolves.toEqual(created);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://project.supabase.co/functions/v1/appointments');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual(expect.objectContaining({
      Authorization: 'Bearer anon-secret',
      apikey: 'anon-secret',
      'Content-Type': 'application/json',
    }));
    expect(JSON.parse(init.body as string)).toEqual(input);
    expect(Object.keys(JSON.parse(init.body as string))).toHaveLength(7);
  });

  it('sends status credentials only in dedicated headers', async () => {
    const status = {
      id: 'appointment-id',
      date: '2026-06-11',
      time: '10:30',
      status: 'zapytanie',
      bike_manufacturer: 'Trek',
      bike_model: 'Fuel EX',
      service_note: null,
      created_at: '2026-06-10T12:00:00Z',
    };
    fetchMock.mockResolvedValue(jsonResponse(status));
    const { getAppointmentStatus } = await loadClient();

    await expect(
      getAppointmentStatus('+48 600 123 456', 'lookup/token?secret'),
    ).resolves.toEqual(status);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://project.supabase.co/functions/v1/appointments');
    expect(url).not.toContain('600');
    expect(url).not.toContain('lookup');
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
    expect(init.headers).toEqual(expect.objectContaining({
      Authorization: 'Bearer anon-secret',
      apikey: 'anon-secret',
      'X-Customer-Phone': '+48 600 123 456',
      'X-Lookup-Token': 'lookup/token?secret',
    }));
  });

  it('maps structured API errors to ApiClientError', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: 'Slot taken', code: 'SLOT_TAKEN' }, 409),
    );
    const { ApiClientError, createAppointmentInquiry } = await loadClient();

    const promise = createAppointmentInquiry({
      date: '2026-06-11',
      time: '10:30',
      customer_name: 'Jan',
      customer_phone: '+48600123456',
      bike_manufacturer: 'Trek',
      bike_model: 'Fuel EX',
      service_note: null,
    });

    await expect(promise).rejects.toEqual(
      expect.objectContaining({
        name: 'ApiClientError',
        status: 409,
        code: 'SLOT_TAKEN',
        message: 'Slot taken',
      }),
    );
    await expect(promise).rejects.toBeInstanceOf(ApiClientError);
  });

  it('uses a sensible fallback for unstructured error responses', async () => {
    fetchMock.mockResolvedValue(
      new Response('upstream unavailable', {
        status: 502,
        statusText: 'Bad Gateway',
      }),
    );
    const { getAvailability } = await loadClient();

    await expect(getAvailability('2026-06-11')).rejects.toEqual(
      expect.objectContaining({
        status: 502,
        code: 'HTTP_ERROR',
        message: 'Request failed with status 502 Bad Gateway',
      }),
    );
  });
});
