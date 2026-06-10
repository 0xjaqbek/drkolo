// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import {
  ApiProblem,
  mapBookingDatabaseError,
  normalizePhone,
  validateCalendarDate,
  validateCreateAppointment,
} from "./booking";
import { json, jsonError, methodNotAllowed, preflight } from "./http";
import { handleServices } from "../services/index";
import {
  createAvailabilityDependencies,
  handleAvailability,
} from "../availability/index";

const validBody = {
  date: "2026-06-10",
  time: "10:30",
  customer_name: " Jan ",
  customer_phone: " +48 600-123-456 ",
  bike_manufacturer: " Trek ",
  bike_model: " Fuel EX ",
  service_note: " Full service ",
};

function expectApiProblem(
  action: () => unknown,
  code: string,
  status: number,
): void {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(ApiProblem);
    expect(error).toMatchObject({ code, status });
    return;
  }

  throw new Error(`Expected ApiProblem ${code}/${status}`);
}

describe("normalizePhone", () => {
  it("normalizes Polish display formatting", () => {
    expect(normalizePhone("+48 600-123-456")).toBe("48600123456");
  });

  it("accepts parentheses and Unicode whitespace", () => {
    expect(normalizePhone("+48\u00a0(600) 123-456")).toBe("48600123456");
  });

  it("rejects fewer than nine digits", () => {
    expectApiProblem(() => normalizePhone("123"), "INVALID_PHONE", 400);
  });

  it("rejects more than fifteen digits", () => {
    expectApiProblem(
      () => normalizePhone("1234567890123456"),
      "INVALID_PHONE",
      400,
    );
  });

  it("rejects letters instead of stripping them", () => {
    expectApiProblem(
      () => normalizePhone("+48 600-ABC-123-456"),
      "INVALID_PHONE",
      400,
    );
  });

  it("rejects a plus sign outside the leading position", () => {
    expectApiProblem(
      () => normalizePhone("48+600123456"),
      "INVALID_PHONE",
      400,
    );
  });
});

describe("validateCalendarDate", () => {
  it("rejects impossible dates", () => {
    expectApiProblem(
      () => validateCalendarDate("2026-02-30"),
      "INVALID_DATE",
      400,
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
    expectApiProblem(
      () =>
        validateCreateAppointment(
          { ...validBody, bike_model: 12 },
          "2026-06-10",
        ),
      "INVALID_FIELDS",
      400,
    );
  });

  it("rejects dates before the supplied Warsaw date", () => {
    expectApiProblem(
      () =>
        validateCreateAppointment(
          { ...validBody, date: "2026-06-09" },
          "2026-06-10",
        ),
      "DATE_PAST",
      400,
    );
  });

  it.each(["10", "10:15", "9:30", "24:00"])(
    "rejects invalid appointment time %s",
    (time) => {
      expectApiProblem(
        () =>
          validateCreateAppointment({ ...validBody, time }, "2026-06-10"),
        "INVALID_TIME",
        400,
      );
    },
  );

  it("rejects impossible appointment dates", () => {
    expectApiProblem(
      () =>
        validateCreateAppointment(
          { ...validBody, date: "2026-02-30" },
          "2026-01-01",
        ),
      "INVALID_DATE",
      400,
    );
  });

  it.each([
    ["customer_name", 120],
    ["customer_phone", 40],
    ["bike_manufacturer", 120],
    ["bike_model", 120],
    ["service_note", 2000],
  ] as const)("rejects %s longer than %i characters", (field, maxLength) => {
    expectApiProblem(
      () =>
        validateCreateAppointment(
          { ...validBody, [field]: "x".repeat(maxLength + 1) },
          "2026-06-10",
        ),
      "INVALID_FIELDS",
      400,
    );
  });

  it.each([
    "customer_name",
    "customer_phone",
    "bike_manufacturer",
    "bike_model",
    "service_note",
  ] as const)("rejects an empty trimmed %s", (field) => {
    expectApiProblem(
      () =>
        validateCreateAppointment(
          { ...validBody, [field]: "   " },
          "2026-06-10",
        ),
      "INVALID_FIELDS",
      400,
    );
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

    expect(problem).toBeInstanceOf(ApiProblem);
    expect(problem).toMatchObject({ code: apiCode, status });
  });
});

describe("HTTP response helpers", () => {
  it.each([
    ["Access-Control-Allow-Origin", "*"],
    [
      "Access-Control-Allow-Headers",
      "authorization, apikey, x-admin-password, content-type",
    ],
    ["Content-Type", "application/json; charset=utf-8"],
    ["Cache-Control", "no-store"],
  ])("sets %s on JSON responses", (header, value) => {
    expect(json({ ok: true }).headers.get(header)).toBe(value);
  });

  it("serializes standard API errors", async () => {
    const response = jsonError("Invalid request", "INVALID_REQUEST", 400);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid request",
      code: "INVALID_REQUEST",
    });
  });

  it("returns a bodyless CORS preflight response", async () => {
    const response = preflight();

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
      "authorization, apikey, x-admin-password, content-type",
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.text()).toBe("");
  });

  it("returns a standard method-not-allowed problem", async () => {
    const response = methodNotAllowed();

    expect(response.status).toBe(405);
    await expect(response.json()).resolves.toEqual({
      error: "Method not allowed",
      code: "METHOD_NOT_ALLOWED",
    });
  });
});

describe("services handler", () => {
  it("preserves the public service catalog for GET requests", async () => {
    const response = await handleServices(
      new Request("https://example.test/services"),
    );
    const catalog = await response.json();

    expect(response.status).toBe(200);
    expect(catalog.categories).toHaveLength(5);
    expect(catalog.categories[0].services[0]).toMatchObject({
      price_pln: 649,
    });
    expect(catalog.categories[4].services[2]).toMatchObject({
      price_pln: 30,
    });
  });

  it("supports OPTIONS and rejects all other methods", async () => {
    const options = await handleServices(
      new Request("https://example.test/services", { method: "OPTIONS" }),
    );
    const post = await handleServices(
      new Request("https://example.test/services", { method: "POST" }),
    );

    expect(options.status).toBe(204);
    expect(post.status).toBe(405);
    await expect(post.json()).resolves.toMatchObject({
      code: "METHOD_NOT_ALLOWED",
    });
  });
});

describe("availability handler", () => {
  it("rejects impossible calendar dates without querying the database", async () => {
    const getAvailability = vi.fn();
    const response = await handleAvailability(
      new Request("https://example.test/availability?date=2026-02-30"),
      { getAvailability },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "INVALID_DATE",
    });
    expect(getAvailability).not.toHaveBeenCalled();
  });

  it("rejects non-GET methods", async () => {
    const response = await handleAvailability(
      new Request("https://example.test/availability?date=2026-06-11", {
        method: "POST",
      }),
      { getAvailability: vi.fn() },
    );

    expect(response.status).toBe(405);
    await expect(response.json()).resolves.toMatchObject({
      code: "METHOD_NOT_ALLOWED",
    });
  });

  it("returns DB_ERROR when the availability dependency fails", async () => {
    const response = await handleAvailability(
      new Request("https://example.test/availability?date=2026-06-11"),
      {
        getAvailability: vi.fn().mockRejectedValue(new Error("database down")),
      },
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to fetch availability",
      code: "DB_ERROR",
    });
  });

  it("represents a closed day with null hours and no slots", async () => {
    const response = await handleAvailability(
      new Request("https://example.test/availability?date=2026-06-14"),
      {
        getAvailability: vi.fn().mockResolvedValue({
          requested_date: "2026-06-14",
          open_time: null,
          close_time: null,
          slots: [],
        }),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      date: "2026-06-14",
      timezone: "Europe/Warsaw",
      open: null,
      close: null,
      slots: [],
    });
  });

  it("documents Warsaw time and formats open-day hours", async () => {
    const response = await handleAvailability(
      new Request("https://example.test/availability?date=2026-06-11"),
      {
        getAvailability: vi.fn().mockResolvedValue({
          requested_date: "2026-06-11",
          open_time: "10:00:00",
          close_time: "19:00:00",
          slots: ["10:00", "10:30"],
        }),
      },
    );

    await expect(response.json()).resolves.toEqual({
      date: "2026-06-11",
      timezone: "Europe/Warsaw",
      open: "10:00",
      close: "19:00",
      slots: ["10:00", "10:30"],
    });
  });

  it("calls get_public_availability and rejects Supabase errors", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "rpc failed" },
    });
    const deps = createAvailabilityDependencies({ rpc });

    await expect(deps.getAvailability("2026-06-11")).rejects.toBeInstanceOf(
      Error,
    );
    expect(rpc).toHaveBeenCalledWith("get_public_availability", {
      p_date: "2026-06-11",
    });
  });
});
