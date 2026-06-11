import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();
const password = 'admin/password?secret';

async function loadClient() {
  vi.resetModules();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-secret');
  vi.stubGlobal('fetch', fetchMock);
  return import('@/lib/calendarAdminApi');
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('calendarAdminApi', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(jsonResponse({}));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('verifies the password using gateway and admin headers only', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ authenticated: true }));
    const { verifyCalendarPassword } = await loadClient();

    await expect(verifyCalendarPassword(password)).resolves.toBe(true);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'https://project.supabase.co/functions/v1/calendar-admin?action=verify',
    );
    expect(url).not.toContain(password);
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
    expect(init.headers).toEqual(expect.objectContaining({
      Authorization: 'Bearer anon-secret',
      apikey: 'anon-secret',
      'X-Admin-Password': password,
    }));
  });

  it('gets working hours with the documented action', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    const { getWorkingHours } = await loadClient();

    await expect(getWorkingHours(password)).resolves.toEqual([]);

    expectRequest('working-hours', 'GET');
  });

  it('patches working hours with an encoded id and JSON body', async () => {
    const update = {
      open_time: '10:00',
      close_time: '19:00',
      is_open: true,
      password: 'must-not-leak',
      secret: 'must-not-leak',
    };
    fetchMock.mockResolvedValue(jsonResponse({
      id: 'row/id',
      open_time: '10:00',
      close_time: '19:00',
      is_open: true,
    }));
    const { updateWorkingHours } = await loadClient();

    await updateWorkingHours('row/id', update, password);

    expectRequest('working-hours&id=row%2Fid', 'PATCH', {
      open_time: '10:00',
      close_time: '19:00',
      is_open: true,
    });
  });

  it('gets appointments by an encoded date', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    const { getAppointmentsByDate } = await loadClient();

    await getAppointmentsByDate('2026/06?11', password);

    expectRequest('appointments&date=2026%2F06%3F11', 'GET');
  });

  it('gets pending appointments', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    const { getPendingAppointments } = await loadClient();

    await getPendingAppointments(password);

    expectRequest('pending', 'GET');
  });

  it('creates a manual appointment', async () => {
    const input = {
      appointment_date: '2026-06-11',
      arrival_time: '10:30',
      customer_name: 'Jan Kowalski',
      customer_phone: '+48600123456',
      bike_manufacturer: 'Trek',
      bike_model: 'Fuel EX',
      service_note: null,
      estimated_duration_minutes: 60,
      password: 'must-not-leak',
      secret: 'must-not-leak',
    };
    fetchMock.mockResolvedValue(jsonResponse({ id: 'appointment-id' }, 201));
    const { createManualAppointment } = await loadClient();

    await createManualAppointment(input, password);

    expectRequest('appointments', 'POST', {
      appointment_date: '2026-06-11',
      arrival_time: '10:30',
      customer_name: 'Jan Kowalski',
      customer_phone: '+48600123456',
      bike_manufacturer: 'Trek',
      bike_model: 'Fuel EX',
      service_note: null,
      estimated_duration_minutes: 60,
    });
  });

  it('patches an appointment with an encoded id', async () => {
    const update = {
      status: 'potwierdzone' as const,
      appointment_date: '2026-06-12',
      arrival_time: '11:00',
      estimated_duration_minutes: 90,
      technician_note: 'Ready tomorrow',
      password: 'must-not-leak',
      secret: 'must-not-leak',
    };
    fetchMock.mockResolvedValue(jsonResponse({ id: 'appointment/id' }));
    const { updateAppointment } = await loadClient();

    await updateAppointment('appointment/id', update, password);

    expectRequest('appointments&id=appointment%2Fid', 'PATCH', {
      status: 'potwierdzone',
      appointment_date: '2026-06-12',
      arrival_time: '11:00',
      estimated_duration_minutes: 90,
      technician_note: 'Ready tomorrow',
    });
  });

  it('gets blocked times by an encoded date', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    const { getBlockedTimes } = await loadClient();

    await getBlockedTimes('2026/06?11', password);

    expectRequest('blocked-times&date=2026%2F06%3F11', 'GET');
  });

  it('creates a blocked time', async () => {
    const input = {
      block_date: '2026-06-11',
      start_time: '12:00',
      end_time: '13:00',
      reason: 'Lunch',
      password: 'must-not-leak',
      secret: 'must-not-leak',
    };
    fetchMock.mockResolvedValue(jsonResponse({ id: 'blocked-id' }, 201));
    const { createBlockedTime } = await loadClient();

    await createBlockedTime(input, password);

    expectRequest('blocked-times', 'POST', {
      block_date: '2026-06-11',
      start_time: '12:00',
      end_time: '13:00',
      reason: 'Lunch',
    });
  });

  it('deletes a blocked time with an encoded id', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ id: 'blocked/id', deleted: true }),
    );
    const { deleteBlockedTime } = await loadClient();

    await expect(deleteBlockedTime('blocked/id', password)).resolves.toEqual({
      id: 'blocked/id',
      deleted: true,
    });

    expectRequest('blocked-times&id=blocked%2Fid', 'DELETE');
  });

  it('never includes the password in a protected request body', async () => {
    const { createBlockedTime } = await loadClient();

    await createBlockedTime({
      block_date: '2026-06-11',
      start_time: '12:00',
      end_time: '13:00',
      reason: 'Lunch',
    }, password);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).not.toContain(encodeURIComponent(password));
    expect(init.body).not.toContain(password);
    const body = JSON.parse(init.body as string);
    expect(body).not.toHaveProperty('password');
    expect(body).not.toHaveProperty('admin_password');
  });

  it('maps structured admin errors to ApiClientError', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401),
    );
    const { ApiClientError, getWorkingHours } = await loadClient();

    const promise = getWorkingHours(password);

    await expect(promise).rejects.toBeInstanceOf(ApiClientError);
    await expect(promise).rejects.toEqual(expect.objectContaining({
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
    }));
  });

  it('rejects invalid config before fetch receives the admin password', async () => {
    const { getWorkingHours } = await loadClient();
    vi.stubEnv(
      'VITE_SUPABASE_URL',
      'https://project.supabase.co.attacker.example',
    );

    await expect(getWorkingHours(password)).rejects.toEqual(
      expect.objectContaining({
        status: 0,
        code: 'CONFIG_ERROR',
      }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [{}, 200],
    [{ authenticated: false }, 200],
    [{ authenticated: 1 }, 201],
  ])('rejects malformed verify responses', async (body, status) => {
    fetchMock.mockResolvedValue(jsonResponse(body, status));
    const { verifyCalendarPassword } = await loadClient();

    await expect(verifyCalendarPassword(password)).rejects.toEqual(
      expect.objectContaining({
        status,
        code: 'INVALID_RESPONSE',
      }),
    );
  });

  it('rejects successful non-JSON admin responses', async () => {
    fetchMock.mockResolvedValue(new Response('ok', { status: 200 }));
    const { getWorkingHours } = await loadClient();

    await expect(getWorkingHours(password)).rejects.toEqual(
      expect.objectContaining({
        status: 200,
        code: 'INVALID_RESPONSE',
      }),
    );
  });

  it('rejects a successful 204 delete response', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const { deleteBlockedTime } = await loadClient();

    await expect(deleteBlockedTime('blocked/id', password)).rejects.toEqual(
      expect.objectContaining({
        status: 204,
        code: 'INVALID_RESPONSE',
      }),
    );
    expectRequest('blocked-times&id=blocked%2Fid', 'DELETE');
  });

  it.each([
    {},
    { id: 123, deleted: true },
    { id: 'blocked/id', deleted: false },
  ])('rejects a malformed delete response', async (body) => {
    fetchMock.mockResolvedValue(jsonResponse(body));
    const { deleteBlockedTime } = await loadClient();

    await expect(deleteBlockedTime('blocked/id', password)).rejects.toEqual(
      expect.objectContaining({
        status: 200,
        code: 'INVALID_RESPONSE',
      }),
    );
  });
});

function expectRequest(
  query: string,
  method: string,
  body?: unknown,
): void {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  expect(url).toBe(
    `https://project.supabase.co/functions/v1/calendar-admin?action=${query}`,
  );
  expect(url).not.toContain(encodeURIComponent(password));
  expect(init.method).toBe(method);
  expect(init.headers).toEqual(expect.objectContaining({
    Authorization: 'Bearer anon-secret',
    apikey: 'anon-secret',
    'X-Admin-Password': password,
  }));

  if (body === undefined) {
    expect(init.body).toBeUndefined();
  } else {
    expect(init.headers).toEqual(expect.objectContaining({
      'Content-Type': 'application/json',
    }));
    expect(JSON.parse(init.body as string)).toEqual(body);
    expect(JSON.parse(init.body as string)).not.toHaveProperty('password');
    expect(JSON.parse(init.body as string)).not.toHaveProperty('admin_password');
  }
}
