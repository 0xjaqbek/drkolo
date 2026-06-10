import { describe, expect, it } from "vitest";

import {
  mapBookingDatabaseError,
  normalizePhone,
  validateCalendarDate,
  validateCreateAppointment,
} from "./booking";

const validBody = {
  date: "2026-06-10",
  time: "10:30",
  customer_name: " Jan ",
  customer_phone: " +48 600-123-456 ",
  bike_manufacturer: " Trek ",
  bike_model: " Fuel EX ",
  service_note: " Full service ",
};

describe("normalizePhone", () => {
  it("normalizes Polish display formatting", () => {
    expect(normalizePhone("+48 600-123-456")).toBe("48600123456");
  });

  it("rejects fewer than nine digits", () => {
    expect(() => normalizePhone("123")).toThrowError(/INVALID_PHONE/);
  });
});

describe("validateCalendarDate", () => {
  it("rejects impossible dates", () => {
    expect(() => validateCalendarDate("2026-02-30")).toThrowError(
      /INVALID_DATE/,
    );
  });
});

describe("validateCreateAppointment", () => {
  it("trims accepted strings and returns the normalized phone", () => {
    expect(validateCreateAppointment(validBody, "2026-06-10")).toEqual({
      date: "2026-06-10",
      time: "10:30",
      customer_name: "Jan",
      customer_phone: "+48 600-123-456",
      customer_phone_normalized: "48600123456",
      bike_manufacturer: "Trek",
      bike_model: "Fuel EX",
      service_note: "Full service",
    });
  });

  it("rejects non-string field values", () => {
    expect(() =>
      validateCreateAppointment(
        { ...validBody, bike_model: 12 },
        "2026-06-10",
      ),
    ).toThrowError(/INVALID_FIELDS/);
  });

  it("rejects dates before the supplied Warsaw date", () => {
    expect(() =>
      validateCreateAppointment(
        { ...validBody, date: "2026-06-09" },
        "2026-06-10",
      ),
    ).toThrowError(/DATE_PAST/);
  });

  it.each(["10", "10:15", "9:30", "24:00"])(
    "rejects invalid appointment time %s",
    (time) => {
      expect(() =>
        validateCreateAppointment({ ...validBody, time }, "2026-06-10"),
      ).toThrowError(/INVALID_TIME/);
    },
  );

  it("rejects impossible appointment dates", () => {
    expect(() =>
      validateCreateAppointment(
        { ...validBody, date: "2026-02-30" },
        "2026-01-01",
      ),
    ).toThrowError(/INVALID_DATE/);
  });

  it.each([
    ["customer_name", 120],
    ["customer_phone", 40],
    ["bike_manufacturer", 120],
    ["bike_model", 120],
    ["service_note", 2000],
  ] as const)("rejects %s longer than %i characters", (field, maxLength) => {
    expect(() =>
      validateCreateAppointment(
        { ...validBody, [field]: "x".repeat(maxLength + 1) },
        "2026-06-10",
      ),
    ).toThrowError(/INVALID_FIELDS/);
  });

  it.each([
    "customer_name",
    "customer_phone",
    "bike_manufacturer",
    "bike_model",
    "service_note",
  ] as const)("rejects an empty trimmed %s", (field) => {
    expect(() =>
      validateCreateAppointment(
        { ...validBody, [field]: "   " },
        "2026-06-10",
      ),
    ).toThrowError(/INVALID_FIELDS/);
  });
});

describe("mapBookingDatabaseError", () => {
  it.each([
    ["DRK01", "DAY_CLOSED", 400],
    ["DRK02", "INVALID_SLOT", 400],
    ["DRK03", "SLOT_TAKEN", 409],
    ["23505", "SLOT_TAKEN", 409],
    ["XX000", "DB_ERROR", 500],
  ] as const)("maps %s to %s/%i", (databaseCode, apiCode, status) => {
    const problem = mapBookingDatabaseError({ code: databaseCode });

    expect(problem).toMatchObject({ code: apiCode, status });
    expect(problem).toBeInstanceOf(Error);
  });
});
