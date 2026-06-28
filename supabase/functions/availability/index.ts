import { ApiProblem, validateCalendarDate } from "../_shared/booking.ts";
import {
  json,
  jsonError,
  methodNotAllowed,
  preflight,
} from "../_shared/http.ts";

export interface AvailabilityRow {
  requested_date: string;
  open_time: string | null;
  close_time: string | null;
  slots: string[] | null;
}

export interface AvailabilityDependencies {
  getAvailability(date: string): Promise<AvailabilityRow>;
}

interface AvailabilityRpcClient {
  rpc(
    name: string,
    params: { p_date: string },
  ): PromiseLike<{
    data: AvailabilityRow[] | null;
    error: unknown;
  }>;
}

function formatTime(value: string | null): string | null {
  return value === null ? null : value.slice(0, 5);
}

export function createAvailabilityDependencies(
  client: AvailabilityRpcClient,
): AvailabilityDependencies {
  return {
    async getAvailability(date: string): Promise<AvailabilityRow> {
      const { data, error } = await client.rpc("get_public_availability", {
        p_date: date,
      });

      if (error || !data?.[0]) {
        throw new Error("Failed to fetch availability");
      }

      return data[0];
    },
  };
}

export async function handleAvailability(
  req: Request,
  deps: AvailabilityDependencies,
): Promise<Response> {
  if (req.method === "OPTIONS") {
    return preflight();
  }

  if (req.method !== "GET") {
    return methodNotAllowed();
  }

  const date = new URL(req.url).searchParams.get("date");

  try {
    const validatedDate = validateCalendarDate(date);
    const row = await deps.getAvailability(validatedDate);

    return json({
      date: validatedDate,
      timezone: "Europe/Warsaw",
      open: formatTime(row.open_time),
      close: formatTime(row.close_time),
      slots: row.slots ?? [],
    });
  } catch (error) {
    if (error instanceof ApiProblem) {
      return jsonError(error.message, error.code, error.status);
    }

    return jsonError("Failed to fetch availability", "DB_ERROR", 500);
  }
}

if (typeof Deno !== "undefined" && typeof Deno.serve === "function") {
  const { createClient } = await import(
    "https://esm.sh/@supabase/supabase-js@2"
  );
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  const dependencies = createAvailabilityDependencies(client);

  Deno.serve((req: Request) => handleAvailability(req, dependencies));
}
