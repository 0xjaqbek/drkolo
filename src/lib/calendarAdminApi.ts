import {
  type AppointmentUpdate,
  type BlockedTime,
  type BlockedTimeInput,
  type DeleteBlockedTimeResponse,
  type ManualAppointmentInput,
  type ServiceAppointment,
  type WorkingHours,
  type WorkingHoursUpdate,
  getBrowserApiConfig,
  parseApiResponse,
} from './types';

export { ApiClientError } from './types';

function adminHeaders(
  anonKey: string,
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

function calendarUrl(
  functionsBase: string,
  action: string,
  key?: 'date' | 'id',
  value?: string,
): string {
  const suffix = key && value !== undefined
    ? `&${key}=${encodeURIComponent(value)}`
    : '';
  return `${functionsBase}/calendar-admin?action=${action}${suffix}`;
}

async function adminRequest<T>(
  action: string,
  password: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    key?: 'date' | 'id';
    value?: string;
    body?: unknown;
    allowNoContent?: boolean;
    isValid?: (payload: unknown) => boolean;
  } = {},
): Promise<T> {
  const method = options.method ?? 'GET';
  const { functionsBase, anonKey } = getBrowserApiConfig();
  const response = await fetch(
    calendarUrl(functionsBase, action, options.key, options.value),
    {
      method,
      headers: adminHeaders(anonKey, password, options.body !== undefined),
      ...(options.body !== undefined
        ? { body: JSON.stringify(options.body) }
        : {}),
    },
  );

  return parseApiResponse<T>(
    response,
    options.allowNoContent,
    options.isValid,
  );
}

export async function verifyCalendarPassword(
  password: string,
): Promise<boolean> {
  const result = await adminRequest<{ authenticated: boolean }>(
    'verify',
    password,
    {
      isValid: (payload) => (
        typeof payload === 'object' &&
        payload !== null &&
        !Array.isArray(payload) &&
        (payload as Record<string, unknown>).authenticated === true
      ),
    },
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
  const payload: WorkingHoursUpdate = {
    open_time: update.open_time,
    close_time: update.close_time,
    is_open: update.is_open,
  };
  return adminRequest<WorkingHours>('working-hours', password, {
    method: 'PATCH',
    key: 'id',
    value: id,
    body: payload,
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
  const payload: ManualAppointmentInput = {
    appointment_date: appointment.appointment_date,
    arrival_time: appointment.arrival_time,
    customer_name: appointment.customer_name,
    customer_phone: appointment.customer_phone,
    bike_manufacturer: appointment.bike_manufacturer,
    bike_model: appointment.bike_model,
    service_note: appointment.service_note,
    estimated_duration_minutes: appointment.estimated_duration_minutes,
  };
  return adminRequest<ServiceAppointment>('appointments', password, {
    method: 'POST',
    body: payload,
  });
}

export function updateAppointment(
  id: string,
  update: AppointmentUpdate,
  password: string,
): Promise<ServiceAppointment> {
  const payload: AppointmentUpdate = {};
  if (update.status !== undefined) {
    payload.status = update.status;
  }
  if (update.estimated_duration_minutes !== undefined) {
    payload.estimated_duration_minutes = update.estimated_duration_minutes;
  }
  if (update.technician_note !== undefined) {
    payload.technician_note = update.technician_note;
  }
  return adminRequest<ServiceAppointment>('appointments', password, {
    method: 'PATCH',
    key: 'id',
    value: id,
    body: payload,
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
  const payload: BlockedTimeInput = {
    block_date: blockedTime.block_date,
    start_time: blockedTime.start_time,
    end_time: blockedTime.end_time,
    reason: blockedTime.reason,
  };
  return adminRequest<BlockedTime>('blocked-times', password, {
    method: 'POST',
    body: payload,
  });
}

export function deleteBlockedTime(
  id: string,
  password: string,
): Promise<DeleteBlockedTimeResponse | void> {
  return adminRequest<DeleteBlockedTimeResponse | void>(
    'blocked-times',
    password,
    {
      method: 'DELETE',
      key: 'id',
      value: id,
      allowNoContent: true,
    },
  );
}
