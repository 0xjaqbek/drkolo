import {
  ApiClientError,
  type AppointmentStatusResponse,
  type AvailabilityResponse,
  type CreateAppointmentInquiryInput,
  type CreateAppointmentInquiryResponse,
} from './types';

export { ApiClientError } from './types';

const functionsBase = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function gatewayHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${anonKey}`,
    apikey: anonKey,
  };
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

export async function getAvailability(
  date: string,
): Promise<AvailabilityResponse> {
  const response = await fetch(
    `${functionsBase}/availability?date=${encodeURIComponent(date)}`,
    {
      method: 'GET',
      headers: gatewayHeaders(),
    },
  );

  return parseResponse<AvailabilityResponse>(response);
}

export async function createAppointmentInquiry(
  appointment: CreateAppointmentInquiryInput,
): Promise<CreateAppointmentInquiryResponse> {
  const response = await fetch(`${functionsBase}/appointments`, {
    method: 'POST',
    headers: {
      ...gatewayHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(appointment),
  });

  return parseResponse<CreateAppointmentInquiryResponse>(response);
}

export async function getAppointmentStatus(
  phone: string,
  token: string,
): Promise<AppointmentStatusResponse> {
  const response = await fetch(`${functionsBase}/appointments`, {
    method: 'GET',
    headers: {
      ...gatewayHeaders(),
      'X-Customer-Phone': phone,
      'X-Lookup-Token': token,
    },
  });

  return parseResponse<AppointmentStatusResponse>(response);
}
