import {
  type AppointmentStatusResponse,
  type AvailabilityResponse,
  type CreateAppointmentInquiryInput,
  type CreateAppointmentInquiryResponse,
  getBrowserApiConfig,
  parseApiResponse,
} from './types';

export { ApiClientError } from './types';

function gatewayHeaders(anonKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${anonKey}`,
    apikey: anonKey,
  };
}

export async function getAvailability(
  date: string,
): Promise<AvailabilityResponse> {
  const { functionsBase, anonKey } = getBrowserApiConfig();
  const response = await fetch(
    `${functionsBase}/availability?date=${encodeURIComponent(date)}`,
    {
      method: 'GET',
      headers: gatewayHeaders(anonKey),
    },
  );

  return parseApiResponse<AvailabilityResponse>(response);
}

export async function createAppointmentInquiry(
  appointment: CreateAppointmentInquiryInput,
): Promise<CreateAppointmentInquiryResponse> {
  const { functionsBase, anonKey } = getBrowserApiConfig();
  const payload: CreateAppointmentInquiryInput = {
    date: appointment.date,
    time: appointment.time,
    customer_name: appointment.customer_name,
    customer_phone: appointment.customer_phone,
    bike_manufacturer: appointment.bike_manufacturer,
    bike_model: appointment.bike_model,
    service_note: appointment.service_note,
  };
  const response = await fetch(`${functionsBase}/appointments`, {
    method: 'POST',
    headers: {
      ...gatewayHeaders(anonKey),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return parseApiResponse<CreateAppointmentInquiryResponse>(response);
}

export async function getAppointmentStatus(
  phone: string,
  token: string,
): Promise<AppointmentStatusResponse> {
  const { functionsBase, anonKey } = getBrowserApiConfig();
  const response = await fetch(`${functionsBase}/appointments`, {
    method: 'GET',
    headers: {
      ...gatewayHeaders(anonKey),
      'X-Customer-Phone': phone,
      'X-Lookup-Token': token,
    },
  });

  return parseApiResponse<AppointmentStatusResponse>(response);
}
