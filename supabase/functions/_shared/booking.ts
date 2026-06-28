export class ApiProblem extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiProblem";
  }
}

export interface ValidatedAppointment {
  date: string;
  time: string;
  customer_name: string;
  customer_phone: string;
  customer_phone_normalized: string;
  bike_manufacturer: string;
  bike_model: string;
  service_note: string;
}

const FIELD_MAX_LENGTHS = {
  customer_name: 120,
  customer_phone: 40,
  bike_manufacturer: 120,
  bike_model: 120,
  service_note: 2000,
} as const;

function problem(code: string, status = 400): ApiProblem {
  return new ApiProblem(code, status, code);
}

function requiredString(
  value: Record<string, unknown>,
  field: string,
  maxLength?: number,
): string {
  const candidate = value[field];
  if (typeof candidate !== "string") {
    throw problem("INVALID_FIELDS");
  }

  const trimmed = candidate.trim();
  if (!trimmed || (maxLength !== undefined && trimmed.length > maxLength)) {
    throw problem("INVALID_FIELDS");
  }

  return trimmed;
}

export function normalizePhone(value: string): string {
  if (!/^\s*\+?[\d\s()-]+$/.test(value)) {
    throw problem("INVALID_PHONE");
  }

  const normalized = value.replace(/\D/g, "");
  if (normalized.length < 9 || normalized.length > 15) {
    throw problem("INVALID_PHONE");
  }
  return normalized;
}

export function validateCalendarDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw problem("INVALID_DATE");
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw problem("INVALID_DATE");
  }

  return value;
}

export function validateCreateAppointment(
  value: unknown,
  todayWarsaw: string,
): ValidatedAppointment {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw problem("INVALID_FIELDS");
  }

  const fields = value as Record<string, unknown>;
  const date = validateCalendarDate(requiredString(fields, "date"));
  const time = requiredString(fields, "time");
  if (!/^(?:[01]\d|2[0-3]):(?:00|30)$/.test(time)) {
    throw problem("INVALID_TIME");
  }

  if (date < validateCalendarDate(todayWarsaw)) {
    throw problem("DATE_PAST");
  }

  const customer_name = requiredString(
    fields,
    "customer_name",
    FIELD_MAX_LENGTHS.customer_name,
  );
  const customer_phone = requiredString(
    fields,
    "customer_phone",
    FIELD_MAX_LENGTHS.customer_phone,
  );
  const bike_manufacturer = requiredString(
    fields,
    "bike_manufacturer",
    FIELD_MAX_LENGTHS.bike_manufacturer,
  );
  const bike_model = requiredString(
    fields,
    "bike_model",
    FIELD_MAX_LENGTHS.bike_model,
  );
  const service_note = requiredString(
    fields,
    "service_note",
    FIELD_MAX_LENGTHS.service_note,
  );

  return {
    date,
    time,
    customer_name,
    customer_phone,
    customer_phone_normalized: normalizePhone(customer_phone),
    bike_manufacturer,
    bike_model,
    service_note,
  };
}

export function mapBookingDatabaseError(error: {
  code?: string;
  message?: string;
}): ApiProblem {
  switch (error.code) {
    case "DRK01":
      return problem("DAY_CLOSED");
    case "DRK02":
      return problem("INVALID_SLOT");
    case "DRK03":
    case "23505":
      return problem("SLOT_TAKEN", 409);
    default:
      return problem("DB_ERROR", 500);
  }
}
