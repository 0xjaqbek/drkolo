import {
  ApiClientError,
  type AppointmentUpdate,
  type BlockedTime,
  type BlockedTimeInput,
  type DeleteBlockedTimeResponse,
  type ManualAppointmentInput,
  type ServiceAppointment,
  type WorkingHours,
  type WorkingHoursUpdate,
} from './types';

export { ApiClientError } from './types';

const functionsBase = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function adminHeaders(
  password: string,
  includeJson = false,
): Record<string, string> {
  return {
    Authorization: `Bearer ${anonKey}`,
    apikey: anonKey,
    'X-Admin-Password': password,
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
  };
}

function calendarUrl(action: string, key?: 'date' | 'id', value?: string): string {
  const suffix = key && value !== undefined
    ? `&${key}=${encodeURIComponent(value)}`
    : '';
  return `${functionsBase}/calendar-admin?action=${action}${suffix}`;
}

function fallbackMessage(response: Response): string {
  const suffix = response.statusText ? ` ${response.statusText}` : '';
  return `Request failed with status ${response.status}${suffix}`;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let payload: unknown;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = undefined;
    }
  }

  if (!response.ok) {
    const error = (
      typeof payload === 'object' &&
      payload !== null &&
      !Array.isArray(payload)
    ) ? payload as Record<string, unknown> : {};
    const message = typeof error.error === 'string'
      ? error.error
      : fallbackMessage(response);
    const code = typeof error.code === 'string' ? error.code : 'HTTP_ERROR';

    throw new ApiClientError(response.status, code, message);
  }

  return payload as T;
}

async function adminRequest<T>(
  action: string,
  password: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    key?: 'date' | 'id';
    value?: string;
    body?: unknown;
  } = {},
): Promise<T> {
  const method = options.method ?? 'GET';
  const response = await fetch(
    calendarUrl(action, options.key, options.value),
    {
      method,
      headers: adminHeaders(password, options.body !== undefined),
      ...(options.body !== undefined
        ? { body: JSON.stringify(options.body) }
        : {}),
    },
  );

  return parseResponse<T>(response);
}

export async function verifyCalendarPassword(
  password: string,
): Promise<boolean> {
  const result = await adminRequest<{ authenticated: boolean }>(
    'verify',
    password,
  );
  return result.authenticated;
}

export function getWorkingHours(password: string): Promise<WorkingHours[]> {
  return adminRequest<WorkingHours[]>('working-hours', password);
}

export function updateWorkingHours(
  id: string,
  update: WorkingHoursUpdate,
  password: string,
): Promise<WorkingHours> {
  return adminRequest<WorkingHours>('working-hours', password, {
    method: 'PATCH',
    key: 'id',
    value: id,
    body: update,
  });
}

export function getAppointmentsByDate(
  date: string,
  password: string,
): Promise<ServiceAppointment[]> {
  return adminRequest<ServiceAppointment[]>('appointments', password, {
    key: 'date',
    value: date,
  });
}

export function getPendingAppointments(
  password: string,
): Promise<ServiceAppointment[]> {
  return adminRequest<ServiceAppointment[]>('pending', password);
}

export function createManualAppointment(
  appointment: ManualAppointmentInput,
  password: string,
): Promise<ServiceAppointment> {
  return adminRequest<ServiceAppointment>('appointments', password, {
    method: 'POST',
    body: appointment,
  });
}

export function updateAppointment(
  id: string,
  update: AppointmentUpdate,
  password: string,
): Promise<ServiceAppointment> {
  return adminRequest<ServiceAppointment>('appointments', password, {
    method: 'PATCH',
    key: 'id',
    value: id,
    body: update,
  });
}

export function getBlockedTimes(
  date: string,
  password: string,
): Promise<BlockedTime[]> {
  return adminRequest<BlockedTime[]>('blocked-times', password, {
    key: 'date',
    value: date,
  });
}

export function createBlockedTime(
  blockedTime: BlockedTimeInput,
  password: string,
): Promise<BlockedTime> {
  return adminRequest<BlockedTime>('blocked-times', password, {
    method: 'POST',
    body: blockedTime,
  });
}

export function deleteBlockedTime(
  id: string,
  password: string,
): Promise<DeleteBlockedTimeResponse> {
  return adminRequest<DeleteBlockedTimeResponse>('blocked-times', password, {
    method: 'DELETE',
    key: 'id',
    value: id,
  });
}
